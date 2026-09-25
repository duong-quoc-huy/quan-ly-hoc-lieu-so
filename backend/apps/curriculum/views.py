from rest_framework import generics, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.permissions import HasChangedPassword
from .models import Faculty, Major, Category, Lesson, TeacherCategory
from .permissions import IsAdminRole, IsTeacherRole, IsTeacherOrAdmin, is_admin_user, is_teacher_user
from .serializers import (
    FacultySerializer,
    MajorSerializer,
    CategorySerializer,
    LessonSerializer,
    LessonReviewSerializer,
    TeacherCategorySerializer,
)


class FacultyListCreateView(generics.ListCreateAPIView):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsAdminRole(), HasChangedPassword()]


class MajorListView(generics.ListCreateAPIView):
    queryset = Major.objects.select_related("faculty").all()
    serializer_class = MajorSerializer

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsAdminRole(), HasChangedPassword()]


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.select_related("parent", "major").all()
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["parent", "major"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name", "category_id"]

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsAdminRole(), HasChangedPassword()]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.select_related("parent", "major").all()
    serializer_class = CategorySerializer
    lookup_field = "category_id"

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsAdminRole(), HasChangedPassword()]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError(
                {"detail": "This category contains child categories or lessons and cannot be deleted."}
            ) from exc


class TeacherCategoryListCreateView(generics.ListCreateAPIView):
    """Admin assigns teacher to subject (Category)"""
    queryset = TeacherCategory.objects.select_related("teacher", "category").all()
    serializer_class = TeacherCategorySerializer
    permission_classes = [IsAdminRole, HasChangedPassword]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["teacher", "category", "is_active"]


class TeacherCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin manages teacher assignment"""
    queryset = TeacherCategory.objects.all()
    serializer_class = TeacherCategorySerializer
    permission_classes = [IsAdminRole, HasChangedPassword]
    lookup_field = "assignment_id"


class MyCategoryListView(generics.ListAPIView):
    """Teacher views their assigned subjects (Categories)"""
    serializer_class = CategorySerializer
    permission_classes = [IsTeacherRole, HasChangedPassword]

    def get_queryset(self):
        user = self.request.user
        assigned_category_ids = TeacherCategory.objects.filter(
            teacher=user, is_active=True
        ).values_list("category_id", flat=True)

        return Category.objects.filter(category_id__in=assigned_category_ids).select_related("major", "parent")


class LessonListCreateView(generics.ListCreateAPIView):
    queryset = Lesson.objects.select_related("category", "category__major", "created_by", "reviewed_by").all()
    serializer_class = LessonSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "category__major", "status"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at", "order"]
    ordering = ["order", "created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.filter(status=Lesson.Status.APPROVED)

        if is_admin_user(user):
            return queryset

        if is_teacher_user(user):
            assigned_cats = TeacherCategory.objects.filter(teacher=user, is_active=True).values_list("category_id", flat=True)
            return queryset.filter(
                Q(status=Lesson.Status.APPROVED) |
                Q(created_by=user) |
                Q(category_id__in=assigned_cats)
            )

        return queryset.filter(status=Lesson.Status.APPROVED)

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsTeacherOrAdmin(), HasChangedPassword()]

    def perform_create(self, serializer):
        user = self.request.user
        if is_admin_user(user):
            # Static lesson workflow: Admin creates lesson -> auto approved
            serializer.save(created_by=user, status=Lesson.Status.APPROVED, reviewed_by=user, reviewed_at=timezone.now())
        else:
            # Dynamic lesson workflow: Teacher proposes lesson -> pending review
            serializer.save(created_by=user, status=Lesson.Status.PENDING)


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lesson.objects.select_related("category").all()
    serializer_class = LessonSerializer
    lookup_field = "lesson_id"

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsTeacherOrAdmin(), HasChangedPassword()]


class LessonReviewView(generics.UpdateAPIView):
    """Admin approves or rejects a dynamic lesson proposal"""
    queryset = Lesson.objects.all()
    serializer_class = LessonReviewSerializer
    permission_classes = [IsAdminRole, HasChangedPassword]
    lookup_field = "lesson_id"

    def perform_update(self, serializer):
        status_value = serializer.validated_data.get("status")
        rejection_reason = serializer.validated_data.get("rejection_reason", "")

        serializer.save(
            status=status_value,
            reviewed_by=self.request.user,
            reviewed_at=timezone.now(),
            rejection_reason=rejection_reason if status_value == Lesson.Status.REJECTED else "",
        )
from django.db import transaction
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from rest_framework import filters, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser

from apps.accounts.permissions import HasChangedPassword, IsAdmin, IsTeacher

from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.comments.models import Comment, CommentReport
from apps.comments.serializers import CommentReportSerializer
from apps.materials.filters import MaterialSubmissionFilter, MyMaterialSubmissionFilter

from apps.curriculum.models import Lesson
from apps.materials.models import MaterialSubmission
from apps.materials.serializers import MaterialSubmissionSerializer
from apps.quizzes.models import Quiz

from .serializers import (
    ApproveMaterialSerializer,
    ApproveQuizSerializer,
    MaterialReviewHistorySerializer,
    PendingQuizSerializer,
    RejectMaterialSerializer,
    RejectQuizSerializer,
)
from .services import (
    acquire_review_lock,
    release_review_lock,
    review_quiz,
    review_submission,
)


class PendingQuizListView(generics.ListAPIView):
    serializer_class = PendingQuizSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def get_queryset(self):
        return (
            Quiz.objects.filter(status=Quiz.Status.PENDING)
            .select_related("lesson", "lesson__category", "created_by")
            .annotate(question_count=models.Count("questions"))
            .order_by("created_at")
        )


def moderation_queryset():
    return (
        MaterialSubmission.objects
        .filter(deleted_at__isnull=True)
        .select_related(
            "owner",
            "lesson",
            "lesson__category",
            "lesson__category__major",
            "reviewed_by",
            "review_locked_by",
        )
        .prefetch_related("files")
    )


class LockMaterialForReviewView(generics.GenericAPIView):
    serializer_class = MaterialSubmissionSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, material_id):
        submission = acquire_review_lock(
            submission_id=material_id,
            admin_user=request.user,
        )

        return Response(
            self.get_serializer(
                submission,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )


class UnlockMaterialReviewView(generics.GenericAPIView):
    serializer_class = MaterialSubmissionSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, material_id):
        submission = release_review_lock(
            submission_id=material_id,
            admin_user=request.user,
        )

        return Response(
            self.get_serializer(
                submission,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )


class CommentReportListView(generics.ListAPIView):
    serializer_class = CommentReportSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    queryset = CommentReport.objects.select_related(
        "comment",
        "reporter",
        "comment__author",
    ).all()

    filter_backends = [filters.OrderingFilter]
    ordering = ["-created_at"]


class DismissCommentReportView(generics.GenericAPIView):
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, report_id):
        report = get_object_or_404(
            CommentReport,
            report_id=report_id,
        )
        report.delete()

        log_action(
            AuditLog.Action.REPORT_DISMISS,
            actor=request.user,
            request=request,
            reason=f"Admin dismissed report {report_id} as false positive.",
        )

        return Response(
            {"detail": "Report dismissed successfully."},
            status=status.HTTP_200_OK,
        )


class SoftDeleteReportedCommentView(generics.GenericAPIView):
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, comment_id):
        comment = get_object_or_404(
            Comment,
            comment_id=comment_id,
            deleted_at__isnull=True,
        )

        comment.deleted_at = timezone.now()
        comment.save(update_fields=["deleted_at", "updated_at"])

        CommentReport.objects.filter(comment=comment).delete()

        log_action(
            AuditLog.Action.COMMENT_DELETE,
            actor=request.user,
            request=request,
            reason=request.data.get(
                "reason",
                "Violated community standards.",
            ),
        )

        return Response(
            {"detail": "Comment soft-deleted and reports resolved."},
            status=status.HTTP_200_OK,
        )


class PendingMaterialListView(generics.ListAPIView):
    serializer_class = MaterialSubmissionSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = MaterialSubmissionFilter

    search_fields = [
        "title",
        "description",
        "owner__first_name",
        "owner__last_name",
        "owner__email",
    ]

    ordering_fields = [
        "title",
        "created_at",
        "updated_at",
    ]
    ordering = ["updated_at", "submission_id"]

    def get_queryset(self):
        return moderation_queryset().filter(
            status=MaterialSubmission.Status.PENDING,
        )


class ModerationMaterialDetailView(generics.RetrieveAPIView):
    serializer_class = MaterialSubmissionSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    lookup_field = "submission_id"
    lookup_url_kwarg = "material_id"

    def get_queryset(self):
        return moderation_queryset()


class ApproveMaterialView(generics.GenericAPIView):
    serializer_class = ApproveMaterialSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    @extend_schema(
        request=ApproveMaterialSerializer,
        responses={200: MaterialSubmissionSerializer},
    )
    def post(self, request, material_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = review_submission(
            submission_id=material_id,
            reviewer=request.user,
            expected_updated_at=serializer.validated_data[
                "expected_updated_at"
            ],
            decision=MaterialSubmission.Status.APPROVED,
            request=request,
        )

        return Response(
            MaterialSubmissionSerializer(
                submission,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )


class RejectMaterialView(generics.GenericAPIView):
    serializer_class = RejectMaterialSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    @extend_schema(
        request=RejectMaterialSerializer,
        responses={200: MaterialSubmissionSerializer},
    )
    def post(self, request, material_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = review_submission(
            submission_id=material_id,
            reviewer=request.user,
            expected_updated_at=serializer.validated_data[
                "expected_updated_at"
            ],
            decision=MaterialSubmission.Status.REJECTED,
            rejection_reason=serializer.validated_data[
                "rejection_reason"
            ],
            request=request,
        )

        return Response(
            MaterialSubmissionSerializer(
                submission,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )


class AllModerationMaterialListView(generics.ListAPIView):
    serializer_class = MaterialSubmissionSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = MyMaterialSubmissionFilter

    search_fields = [
        "title",
        "description",
        "owner__first_name",
        "owner__last_name",
        "owner__email",
    ]

    ordering_fields = [
        "title",
        "created_at",
        "updated_at",
        "reviewed_at",
    ]
    ordering = ["-updated_at", "-submission_id"]

    def get_queryset(self):
        return moderation_queryset()


def material_review_history_queryset(submission):
    return (
        AuditLog.objects
        .filter(
            target_material__submission=submission,
            action__in=[
                AuditLog.Action.MATERIAL_APPROVE,
                AuditLog.Action.MATERIAL_REJECT,
            ],
        )
        .select_related("actor")
        .order_by("-created_at", "-audit_log_id")
        .distinct()
    )


class AdminMaterialReviewHistoryView(generics.ListAPIView):
    serializer_class = MaterialReviewHistorySerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def get_queryset(self):
        submission = get_object_or_404(
            MaterialSubmission.objects.filter(
                deleted_at__isnull=True,
            ),
            submission_id=self.kwargs["material_id"],
        )

        return material_review_history_queryset(submission)


class TeacherMaterialReviewHistoryView(generics.ListAPIView):
    serializer_class = MaterialReviewHistorySerializer
    permission_classes = [IsTeacher, HasChangedPassword]

    def get_queryset(self):
        submission = get_object_or_404(
            MaterialSubmission.objects.filter(
                deleted_at__isnull=True,
                owner=self.request.user,
            ),
            submission_id=self.kwargs["material_id"],
        )

        return material_review_history_queryset(submission)


class ApproveQuizView(generics.GenericAPIView):
    serializer_class = ApproveQuizSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, quiz_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = review_quiz(
            quiz_id=quiz_id,
            reviewer=request.user,
            expected_updated_at=serializer.validated_data["expected_updated_at"],
            decision=Quiz.Status.APPROVED,
            request=request,
        )

        return Response(PendingQuizSerializer(quiz).data, status=status.HTTP_200_OK)


class RejectQuizView(generics.GenericAPIView):
    serializer_class = RejectQuizSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def post(self, request, quiz_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = review_quiz(
            quiz_id=quiz_id,
            reviewer=request.user,
            expected_updated_at=serializer.validated_data["expected_updated_at"],
            decision=Quiz.Status.REJECTED,
            rejection_reason=serializer.validated_data["rejection_reason"],
            request=request,
        )

        return Response(PendingQuizSerializer(quiz).data, status=status.HTTP_200_OK)

class AdminLessonApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(pk=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"detail": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # 1. Approve Lesson
            lesson.status = Lesson.Status.APPROVED
            lesson.save(update_fields=["status"])

            # 2. Auto-approve attached material submissions
            MaterialSubmission.objects.filter(
                lesson=lesson, 
                status=MaterialSubmission.Status.PENDING
            ).update(
                status=MaterialSubmission.Status.APPROVED,
                reviewed_by=request.user,
            )

            # 3. Log Audit
            log_action(
                AuditLog.Action.LESSON_APPROVE,
                actor=request.user,
                target_lesson=lesson,
                request=request,
                reason="Admin approved dynamic lesson.",
            )

        return Response({"detail": "Lesson approved successfully."})


class AdminLessonRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, lesson_id):
        reason = request.data.get("reason", "")
        try:
            lesson = Lesson.objects.get(pk=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"detail": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            lesson.status = Lesson.Status.REJECTED
            lesson.rejection_reason = reason
            lesson.save(update_fields=["status", "rejection_reason"])

            # Also mark attached pending material submissions as rejected
            MaterialSubmission.objects.filter(
                lesson=lesson, 
                status=MaterialSubmission.Status.PENDING
            ).update(
                status=MaterialSubmission.Status.REJECTED,
                rejection_reason=reason,
                reviewed_by=request.user,
            )

        return Response({"detail": "Lesson rejected."})
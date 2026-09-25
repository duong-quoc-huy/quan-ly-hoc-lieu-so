from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasChangedPassword, IsTeacher
from apps.audit.models import AuditLog
from apps.audit.services import log_action, record_material_download
from apps.curriculum.models import Lesson

from .filters import MaterialSubmissionFilter, MyMaterialSubmissionFilter
from .models import Material, MaterialSubmission
from .permissions import CanDownloadMaterial, IsTeacherOwner
from .serializers import (
	DynamicLessonMaterialSubmissionSerializer,
	MaterialSubmissionSerializer,
)


def submission_queryset():
	"""Public catalog queryset: requires approved lessons."""
	return MaterialSubmission.objects.filter(
		deleted_at__isnull=True,
		lesson__status=Lesson.Status.APPROVED,
	).select_related(
		"owner",
		"lesson",
		"lesson__category",
		"lesson__category__major",
		"reviewed_by",
	).prefetch_related("files")


def teacher_submission_queryset(user):
	"""Teacher's personal queryset: allows viewing own submissions even for pending lessons."""
	return MaterialSubmission.objects.filter(
		deleted_at__isnull=True,
		owner=user,
	).select_related(
		"owner",
		"lesson",
		"lesson__category",
		"lesson__category__major",
		"reviewed_by",
	).prefetch_related("files")


class PublicMaterialListView(generics.ListAPIView):
	serializer_class = MaterialSubmissionSerializer
	permission_classes = [AllowAny]
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_class = MaterialSubmissionFilter
	search_fields = ["title", "description"]
	ordering_fields = ["title", "created_at", "updated_at"]
	ordering = ["-created_at", "-submission_id"]

	def get_queryset(self):
		return submission_queryset().filter(status=MaterialSubmission.Status.APPROVED)


class PublicMaterialDetailView(generics.RetrieveAPIView):
	serializer_class = MaterialSubmissionSerializer
	permission_classes = [AllowAny]
	lookup_field = "submission_id"
	lookup_url_kwarg = "material_id"

	def get_queryset(self):
		return submission_queryset().filter(status=MaterialSubmission.Status.APPROVED)


class MyMaterialListCreateView(generics.ListCreateAPIView):
	serializer_class = MaterialSubmissionSerializer
	permission_classes = [IsTeacher, HasChangedPassword]
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_class = MyMaterialSubmissionFilter
	search_fields = ["title", "description"]
	ordering_fields = ["title", "created_at", "updated_at"]
	ordering = ["-created_at", "-submission_id"]

	def get_queryset(self):
		return teacher_submission_queryset(self.request.user)

	@transaction.atomic
	def perform_create(self, serializer):
		submission = serializer.save()
		log_action(
			AuditLog.Action.MATERIAL_UPLOAD,
			actor=self.request.user,
			target_material=submission.files.first(),
			request=self.request,
			reason=f"Submitted {submission.files.count()} file(s) for '{submission.title}'.",
		)


class DynamicMaterialUploadView(generics.CreateAPIView):
	"""Endpoint for Teachers to create a new Dynamic Lesson AND upload materials together."""
	serializer_class = DynamicLessonMaterialSubmissionSerializer
	permission_classes = [IsTeacher, HasChangedPassword]
	parser_classes = [MultiPartParser, FormParser, JSONParser]

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data, context={"request": request})
		serializer.is_valid(raise_exception=True)
		submission = serializer.save()

		return Response(
			MaterialSubmissionSerializer(submission, context=self.get_serializer_context()).data,
			status=status.HTTP_201_CREATED,
		)


class MyMaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = MaterialSubmissionSerializer
	permission_classes = [IsTeacherOwner, HasChangedPassword]
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	lookup_field = "submission_id"
	lookup_url_kwarg = "material_id"

	def get_queryset(self):
		queryset = teacher_submission_queryset(self.request.user)
		if self.request.method in {"PUT", "PATCH", "DELETE"}:
			queryset = queryset.select_for_update(of=("self",))
		return queryset

	@transaction.atomic
	def update(self, request, *args, **kwargs):
		return super().update(request, *args, **kwargs)

	def perform_update(self, serializer):
		submission = serializer.save()
		log_action(
			AuditLog.Action.MATERIAL_UPDATE,
			actor=self.request.user,
			target_material=submission.files.first(),
			request=self.request,
			reason="Submission updated and returned to pending approval.",
		)

	@transaction.atomic
	def destroy(self, request, *args, **kwargs):
		submission = self.get_object()
		submission.deleted_at = timezone.now()
		submission.save(update_fields=["deleted_at", "updated_at"])

		log_action(
			AuditLog.Action.MATERIAL_DELETE,
			actor=request.user,
			target_material=submission.files.first(),
			request=request,
			reason="Submission soft-deleted.",
		)
		return Response(status=status.HTTP_204_NO_CONTENT)


class MaterialDownloadView(APIView):
	permission_classes = [HasChangedPassword, CanDownloadMaterial]

	@transaction.atomic
	def get(self, request, material_id):
		queryset = Material.objects.filter(submission__deleted_at__isnull=True)
		if not request.user.is_admin_role:
			queryset = queryset.filter(
				Q(submission__status=MaterialSubmission.Status.APPROVED) | Q(owner=request.user)
			)

		material = get_object_or_404(
			queryset.select_related("submission").select_for_update(),
			material_id=material_id,
		)
		self.check_object_permissions(request, material)

		try:
			file_handle = material.file.open("rb")
		except FileNotFoundError as exc:
			raise NotFound("The material file is unavailable.") from exc

		try:
			record_material_download(material=material, actor=request.user, request=request)
			response = FileResponse(
				file_handle,
				as_attachment=True,
				filename=material.original_filename,
				content_type="application/octet-stream",
			)
			response["Cache-Control"] = "private, no-store"
			response["X-Content-Type-Options"] = "nosniff"
			return response
		except Exception:
			file_handle.close()
			raise

class WithdrawMaterialSubmissionView(APIView):
	"""Allows a teacher to withdraw a pending submission if not locked by an admin."""
	permission_classes = [IsTeacherOwner, HasChangedPassword]

	@transaction.atomic
	def post(self, request, material_id):
		submission = get_object_or_404(
			teacher_submission_queryset(request.user).select_for_update(of=("self",)),
			submission_id=material_id,
		)

		if submission.status != MaterialSubmission.Status.PENDING:
			return Response(
				{"detail": "Only pending material submissions can be withdrawn."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		if submission.review_locked_by_id:
			return Response(
				{"detail": "This submission is currently being reviewed by an admin and cannot be withdrawn."},
				status=status.HTTP_403_FORBIDDEN,
			)

		submission.status = MaterialSubmission.Status.WIHTDRAW
		submission.save(update_fields=["status", "updated_at"])

		log_action(
			AuditLog.Action.MATERIAL_UPDATE,
			actor=request.user,
			target_material=submission.files.first(),
			request=request,
			reason="Teacher withdrew material submission from moderation queue.",
		)

		return Response(
			MaterialSubmissionSerializer(submission, context={"request": request}).data,
			status=status.HTTP_200_OK,
		)
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.db import models

from apps.accounts.models import UUIDv7Field
from apps.curriculum.models import Lesson

from .storage import private_material_storage
from .validators import validate_material_file


def material_upload_path(instance, filename):
	extension = Path(filename).suffix.lower()
	return f"materials/{instance.owner_id}/{uuid4().hex}{extension}"


def converted_pdf_upload_path(instance, filename):
	return f"materials/{instance.owner_id}/{uuid4().hex}.pdf"


class MaterialSubmission(models.Model):
	class Status(models.TextChoices):
		PENDING = "pending", "Pending"
		APPROVED = "approved", "Approved"
		REJECTED = "rejected", "Rejected"
		WIHTDRAW = "withdraw", "Withdraw"

	submission_id = UUIDv7Field(primary_key=True, editable=False)

	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="material_submissions")
	lesson = models.ForeignKey(Lesson, on_delete=models.PROTECT, related_name="material_submissions")

	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)

	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
	reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_submissions")
	reviewed_at = models.DateTimeField(null=True, blank=True)
	rejection_reason = models.TextField(blank=True)

	review_locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="locked_submissions")
	review_locked_at = models.DateTimeField(null=True, blank=True)

	deleted_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at", "-submission_id"]
		indexes = [
			models.Index(fields=["status", "deleted_at", "-created_at"], name="submission_catalog_idx"),
			models.Index(fields=["owner", "deleted_at"], name="submission_owner_idx"),
		]

	def __str__(self):
		return self.title


class Material(models.Model):
	class Type(models.TextChoices):
		DOCUMENT = "document", "Document"
		SLIDES = "slides", "Slides"
		EXERCISE = "exercise", "Exercise"
		VIDEO = "video", "Video"

	material_id = UUIDv7Field(primary_key=True, editable=False)

	submission = models.ForeignKey(MaterialSubmission, on_delete=models.CASCADE, related_name="files")
	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="materials")

	material_type = models.CharField(max_length=20, choices=Type.choices)
	file = models.FileField(storage=private_material_storage, upload_to=material_upload_path, validators=[validate_material_file])
	converted_pdf = models.FileField(storage=private_material_storage, upload_to=converted_pdf_upload_path, null=True, blank=True)
	original_filename = models.CharField(max_length=255)
	file_size = models.PositiveBigIntegerField()

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["created_at", "material_id"]
		indexes = [models.Index(fields=["submission"], name="material_submission_idx"), models.Index(fields=["owner"], name="material_owner_idx")]

	def __str__(self):
		return self.original_filename
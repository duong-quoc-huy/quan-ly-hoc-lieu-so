from pathlib import Path
from rest_framework import serializers

from apps.accounts.models import User
from apps.curriculum.models import Category, Lesson
from apps.curriculum.services import teacher_can_manage_category

from .models import Material, MaterialSubmission
from .storage import generate_presigned_url
from .validators import validate_material_file

# Native browser formats that render inline without conversion
PREVIEWABLE_EXTENSIONS = {
	"pdf", "mp4", "webm", "mov", "mkv", 
	"png", "jpg", "jpeg", "gif", "webp", "svg"
}

def detect_file_material_type(filename, default_type):
	ext = Path(filename).suffix.lower().lstrip(".")
	if ext in {"mp4", "webm", "mov", "mkv", "avi"}:
		return getattr(Material.Type, "VIDEO", default_type)
	if ext in {"pptx", "ppt", "key"}:
		return getattr(Material.Type, "SLIDES", default_type)
	return default_type


class MaterialOwnerSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ["user_id", "first_name", "last_name"]
		read_only_fields = fields


class MaterialFileSerializer(serializers.ModelSerializer):
	preview_url = serializers.SerializerMethodField()
	download_url = serializers.SerializerMethodField()

	class Meta:
		model = Material
		fields = [
			"material_id",
			"material_type",
			"original_filename",
			"file_size",
			"preview_url",
			"download_url",
			"created_at",
		]
		read_only_fields = fields

	def get_preview_url(self, obj):
		if not obj.original_filename:
			return None

		ext = obj.original_filename.split(".")[-1].lower()

		# 1. Directly render native browser files (PDF, Video, Images)
		if ext in PREVIEWABLE_EXTENSIONS:
			return generate_presigned_url(obj.file, obj.original_filename, inline=True)

		# 2. Render converted PDF preview for Office files (PPTX, DOCX, XLSX)
		if obj.converted_pdf:
			pdf_filename = f"{obj.original_filename.rsplit('.', 1)[0]}.pdf"
			return generate_presigned_url(obj.converted_pdf, pdf_filename, inline=True)

		return None

	def get_download_url(self, obj):
		request = self.context.get("request")
		if not request:
			return None

		user = request.user
		if not user.is_authenticated or not user.is_active or user.must_change_password:
			return None

		submission = obj.submission
		if submission.deleted_at is not None:
			return None

		allowed = (
			submission.status == MaterialSubmission.Status.APPROVED
			or submission.owner_id == user.pk
			or getattr(user, "is_admin_role", False)
		)
		if not allowed:
			return None

		return generate_presigned_url(obj.file, obj.original_filename, inline=False)


def create_material_rows_helper(submission, uploads, base_material_type):
	"""Helper to bulk-create Material rows with auto-detected file types."""
	owner = submission.owner
	for upload in uploads:
		filename = Path(upload.name.replace("\\", "/")).name
		file_type = detect_file_material_type(filename, base_material_type)

		Material.objects.create(
			submission=submission,
			owner=owner,
			material_type=file_type,
			file=upload,
			original_filename=filename,
			file_size=upload.size,
		)


class MaterialSubmissionSerializer(serializers.ModelSerializer):
	owner = MaterialOwnerSerializer(read_only=True)
	lesson_title = serializers.CharField(source="lesson.title", read_only=True)
	category_id = serializers.UUIDField(source="lesson.category.category_id", read_only=True)
	category_name = serializers.CharField(source="lesson.category.name", read_only=True)
	major_id = serializers.UUIDField(source="lesson.category.major.major_id", read_only=True, allow_null=True)
	major_name = serializers.CharField(source="lesson.category.major.name", read_only=True, allow_null=True)

	attachments = MaterialFileSerializer(source="files", many=True, read_only=True)
	file_count = serializers.IntegerField(source="files.count", read_only=True)

	material_type = serializers.ChoiceField(choices=Material.Type.choices, write_only=True, required=False)
	files = serializers.ListField(child=serializers.FileField(), write_only=True, required=False)

	class Meta:
		model = MaterialSubmission
		fields = [
			"submission_id",
			"owner",
			"lesson",
			"lesson_id",
			"lesson_title",
			"category_id",
			"category_name",
			"major_id",
			"major_name",
			"title",
			"description",
			"material_type",
			"files",
			"attachments",
			"file_count",
			"status",
			"reviewed_by",
			"reviewed_at",
			"rejection_reason",
			"review_locked_by",
			"review_locked_at",
			"created_at",
			"updated_at",
		]
		read_only_fields = [
			"submission_id",
			"status",
			"reviewed_by",
			"reviewed_at",
			"rejection_reason",
			"review_locked_by",
            "review_locked_at",
			"created_at",
			"updated_at",
		]

	def validate_files(self, uploads):
		for upload in uploads:
			validate_material_file(upload)
		return uploads

	def validate(self, attrs):
		request = self.context.get("request")
		if not request or not request.user:
			return attrs

		lesson = attrs.get("lesson", self.instance.lesson if self.instance else None)
		if not lesson:
			raise serializers.ValidationError({"lesson": "Lesson is required."})

		is_teacher = getattr(request.user, "is_teacher", False) or getattr(request.user, "role", "") == "teacher"
		if request.method in {"POST", "PUT", "PATCH"} and is_teacher:
			from apps.curriculum.services import teacher_can_manage_lesson

			if not teacher_can_manage_lesson(request.user, lesson):
				raise serializers.ValidationError({
					"lesson": "You are not assigned to this subject."
				})

			if lesson.status != Lesson.Status.APPROVED:
				raise serializers.ValidationError({
					"lesson": "Materials can only be submitted for approved lessons."
				})

		return attrs

	def create(self, validated_data):
		uploads = validated_data.pop("files")
		material_type = validated_data.pop("material_type")
		owner = self.context["request"].user

		submission = MaterialSubmission.objects.create(
			owner=owner,
			status=MaterialSubmission.Status.PENDING,
			**validated_data,
		)
		create_material_rows_helper(submission, uploads, material_type)
		return submission

	def update(self, instance, validated_data):
		uploads = validated_data.pop("files", None)
		material_type = validated_data.pop("material_type", None)

		for attr, value in validated_data.items():
			setattr(instance, attr, value)
		instance.status = MaterialSubmission.Status.PENDING
		instance.reviewed_by = None
		instance.reviewed_at = None
		instance.rejection_reason = ""
		instance.save()

		if uploads:
			existing = instance.files.first()
			fallback_type = existing.material_type if existing else Material.Type.DOCUMENT
			create_material_rows_helper(instance, uploads, material_type or fallback_type)
		return instance


class DynamicLessonMaterialSubmissionSerializer(serializers.Serializer):
	"""Serializer for Teachers creating a NEW Dynamic Lesson AND uploading files together."""
	category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
	lesson_title = serializers.CharField(max_length=255)
	lesson_description = serializers.CharField(required=False, allow_blank=True, default="")
	lesson_order = serializers.IntegerField(required=False, default=1, min_value=1)

	title = serializers.CharField(max_length=255)
	description = serializers.CharField(required=False, allow_blank=True, default="")
	material_type = serializers.ChoiceField(choices=Material.Type.choices)
	files = serializers.ListField(child=serializers.FileField(), allow_empty=False)

	def validate_category(self, category):
		request = self.context.get("request")
		if request and request.user:
			if not teacher_can_manage_category(request.user, category):
				raise serializers.ValidationError("You are not assigned to this subject.")
		return category

	def validate_files(self, uploads):
		for upload in uploads:
			validate_material_file(upload)
		return uploads

	def create(self, validated_data):
		from django.db import transaction
		from apps.audit.models import AuditLog
		from apps.audit.services import log_action

		request = self.context["request"]
		user = request.user

		category = validated_data.pop("category")
		lesson_title = validated_data.pop("lesson_title")
		lesson_description = validated_data.pop("lesson_description", "")
		lesson_order = validated_data.pop("lesson_order", 1)

		material_title = validated_data.pop("title")
		material_description = validated_data.pop("description", "")
		material_type = validated_data.pop("material_type")
		uploads = validated_data.pop("files")

		with transaction.atomic():
			# 1. Create Pending Dynamic Lesson
			lesson = Lesson.objects.create(
				category=category,
				title=lesson_title,
				description=lesson_description,
				order=lesson_order,
				created_by=user,
				status=Lesson.Status.PENDING,
			)

			# 2. Create Pending Material Submission linked to the new lesson
			submission = MaterialSubmission.objects.create(
				owner=user,
				lesson=lesson,
				title=material_title,
				description=material_description,
				status=MaterialSubmission.Status.PENDING,
			)

			# 3. Attach uploaded files via shared helper
			create_material_rows_helper(submission, uploads, material_type)

			# 4. Write audit logs
			log_action(
				AuditLog.Action.LESSON_CREATE,
				actor=user,
				target_lesson=lesson,
				request=request,
				reason=f"Proposed new dynamic lesson '{lesson.title}'.",
			)
			log_action(
				AuditLog.Action.MATERIAL_UPLOAD,
				actor=user,
				target_material=submission.files.first(),
				request=request,
				reason=f"Uploaded material for proposed lesson '{lesson.title}'.",
			)

			return submission
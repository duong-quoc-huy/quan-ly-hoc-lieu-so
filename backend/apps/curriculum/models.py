from django.db import models
from django.conf import settings
from apps.accounts.models import UUIDv7Field


class Faculty(models.Model):
	faculty_id = UUIDv7Field(primary_key=True, editable=False)
	name = models.CharField(max_length=100, unique=True)
	code = models.CharField(max_length=20, unique=True, blank=True)
	description = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]
		verbose_name_plural = "faculties"

	def __str__(self):
		return f"{self.name} ({self.code})" if self.code else self.name


class Major(models.Model):
	major_id = UUIDv7Field(primary_key=True, editable=False)
	faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name="majors", null=True, blank=True)
	name = models.CharField(max_length=100, unique=True)
	code = models.CharField(max_length=100, unique=True, null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["name"]

	def __str__(self):
		faculty_code = (self.faculty.code if self.faculty and self.faculty.code else "General")
		return f"{self.name} [{faculty_code}]"


class Category(models.Model):
	category_id = UUIDv7Field(primary_key=True, editable=False)
	name = models.CharField(max_length=150)
	slug = models.SlugField(max_length=180, unique=True, allow_unicode=True)
	major = models.ForeignKey(Major, on_delete=models.CASCADE, related_name="categories", null=True, blank=True)
	description = models.TextField(blank=True)
	parent = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="children")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name", "category_id"]
		verbose_name_plural = "categories"

	def __str__(self):
		major_code = self.major.code if self.major else "General"
		return f"{self.name} ({major_code})"


class Lesson(models.Model):
	class Status(models.TextChoices):
		PENDING = "pending", "Pending review"
		APPROVED = "approved", "Approved"
		REJECTED = "rejected", "Rejected"

	lesson_id = UUIDv7Field(primary_key=True, editable=False)
	category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="lessons")
	title = models.CharField(max_length=255)
	order = models.PositiveIntegerField(default=1)
	description = models.TextField(blank=True)

	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_lessons")
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
	reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_lessons")
	reviewed_at = models.DateTimeField(null=True, blank=True)
	rejection_reason = models.TextField(blank=True)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["order", "created_at"]

	def __str__(self):
		return f"{self.title} ({self.category.name})"


class TeacherCategory(models.Model):
	assignment_id = UUIDv7Field(primary_key=True, editable=False)
	teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teaching_assignments")
	category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="teacher_assignments")
	is_active = models.BooleanField(default=True)
	assigned_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-assigned_at"]
		constraints = [
			models.UniqueConstraint(
				fields=["teacher", "category"],
				name="unique_teacher_category_assignment",
			),
		]

	def __str__(self):
		return f"{self.teacher.email} -> {self.category.name}"
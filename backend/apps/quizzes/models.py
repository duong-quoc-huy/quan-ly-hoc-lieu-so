from django.conf import settings
from django.core.validators import MaxValueValidator
from django.db import models

from apps.accounts.models import UUIDv7Field
from apps.curriculum.models import Lesson

class Quiz(models.Model):

	class Status(models.TextChoices):
		PENDING = "pending", "Pending review"
		APPROVED = "approved", "Approved"
		REJECTED = "rejected", "Rejected"


	quiz_id = UUIDv7Field(primary_key=True)
	lesson = models.ForeignKey(Lesson, on_delete=models.PROTECT, related_name="quizzes")
	version = models.PositiveIntegerField()
	title = models.CharField(max_length=255)
	pass_percentage = models.PositiveSmallIntegerField(default=60, validators=[MaxValueValidator(100)])
	available_from = models.DateTimeField(null=True, blank=True)
	available_until = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING,db_index=True)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_quizzes")
	reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_quizzes")
	reviewed_at = models.DateTimeField(null=True, blank=True)
	rejection_reason = models.TextField(blank=True)
	is_enabled = models.BooleanField(default=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	class Meta:
		ordering = ["-version"]
		constraints = [
			models.UniqueConstraint(
				fields=["lesson", "version"],
				name="quiz_lesson_version_unique",
			),
		]

	def __str__(self):
		return f"{self.title} — version {self.version}"


class Question(models.Model):
	question_id = UUIDv7Field(primary_key=True)

	quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")

	text = models.TextField()
	explanation = models.TextField(blank=True)
	position = models.PositiveIntegerField()

	class Meta:
		ordering = ["position"]
		constraints = [models.UniqueConstraint(fields=["quiz", "position"], name="quiz_question_position_unique")]


class Choice(models.Model):
	choice_id = UUIDv7Field(primary_key=True)

	question = models.ForeignKey(Question,on_delete=models.CASCADE,related_name="choices")

	text = models.CharField(max_length=1000)
	is_correct = models.BooleanField(default=False)
	position = models.PositiveIntegerField()

	class Meta:
		ordering = ["position"]
		constraints = [models.UniqueConstraint(fields=["question", "position"], name="quiz_choice_position_unique")]


class QuizAttempt(models.Model):
	class Status(models.TextChoices):
		IN_PROGRESS = "in_progress", "In progress"
		SUBMITTED = "submitted", "Submitted"

	attempt_id = UUIDv7Field(primary_key=True)

	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="quiz_attempts")

	quiz = models.ForeignKey(Quiz, on_delete=models.PROTECT, related_name="attempts")

	status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)


	answers = models.JSONField(default=dict, blank=True)

	total_questions = models.PositiveIntegerField()
	correct_answers = models.PositiveIntegerField(null=True, blank=True)
	score_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
	passed = models.BooleanField(null=True, blank=True)
	is_late = models.BooleanField(default=False)
	started_at = models.DateTimeField(auto_now_add=True)
	submitted_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ["-started_at", "-attempt_id"]
		indexes = [models.Index(fields=["student", "-started_at"], name="quiz_attempt_student_idx")]
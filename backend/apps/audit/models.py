import uuid
import uuid_utils
from django.db import models
from apps.accounts.models import User


def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))


class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class AuditLog(models.Model):
	class Action(models.TextChoices):
		LOGIN = "login", "Login"
		LOGIN_FAILED = "login_failed", "Login failed"
		LOGOUT = "logout", "Logout"
		USER_CREATE = "user_create", "User create"
		DEACTIVATE = "deactivate", "Deactivate account"
		DEACTIVATE_BLOCKED = "deactivate_blocked", "Deactivate account blocked"
		REACTIVATE = "reactivate", "Reactivate account"
		PASSWORD_RESET = "password_reset", "Password reset"
		PASSWORD_RESET_BY_ADMIN = "password_reset_by_admin", "Password reset by admin"
		MATERIAL_UPLOAD = "material_upload", "Material upload"
		MATERIAL_UPDATE = "material_update", "Material update"
		MATERIAL_DELETE = "material_delete", "Material delete"
		MATERIAL_DOWNLOAD = "material_download", "Material download"
		MATERIAL_APPROVE = "material_approve", "Material approve"
		MATERIAL_REJECT = "material_reject", "Material reject"
		QUIZ_START = "quiz_start", "Quiz start"
		QUIZ_SUBMIT = "quiz_submit", "Quiz submit"
		COMMENT_DELETE = "comment_delete", "Comment delete"
		REPORT_DISMISS = "report_dismiss", "Report dismiss"

		LESSON_CREATE = "lesson_create", "Lesson create"
		LESSON_APPROVE = "lesson_approve", "Lesson approve"
		LESSON_REJECT = "lesson_reject", "Lesson reject"

		QUIZ_CREATE = "quiz_create", "Quiz create"
		QUIZ_APPROVE = "quiz_approve", "Quiz approve"
		QUIZ_REJECT = "quiz_reject", "Quiz reject"
		QUIZ_DISABLE = "quiz_disable", "Quiz disable"

	audit_log_id = UUIDv7Field(primary_key=True, editable=False)
	actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='actions_performed')
	target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='actions_received')
	action = models.CharField(max_length=30, choices=Action.choices)
	role = models.CharField(max_length=10, blank=True)
	ip_address = models.GenericIPAddressField(null=True, blank=True)
	reason = models.TextField(blank=True)
	target_material = models.ForeignKey("materials.Material", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
	target_lesson = models.ForeignKey("curriculum.Lesson", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
	target_quiz = models.ForeignKey("quizzes.Quiz", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at", "-audit_log_id"]
		indexes = [
			models.Index(
				fields=["action", "created_at"],
				name="audit_action_time_idx",
			),
			models.Index(
				fields=["target_material", "action", "created_at"],
				name="audit_material_event_idx",
			),
		]
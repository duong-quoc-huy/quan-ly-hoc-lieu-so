from rest_framework.permissions import BasePermission
from apps.accounts.permissions import IsTeacher
from .models import MaterialSubmission
from apps.curriculum.services import teacher_can_manage_lesson

class IsTeacherOwner(IsTeacher):
	def has_object_permission(self, request, view, obj):
		if obj.owner_id != request.user.pk:
			return False

		return teacher_can_manage_lesson(request.user, obj.lesson)


class CanDownloadMaterial(BasePermission):
	def has_object_permission(self, request, view, obj):
		user = request.user

		if not user.is_authenticated or not user.is_active:
			return False

		if obj.submission.deleted_at is not None:
			return False

		if user.is_admin_role or obj.owner_id == user.pk:
			return True

		return obj.submission.status == MaterialSubmission.Status.APPROVED
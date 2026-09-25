from rest_framework.permissions import BasePermission
from apps.accounts.permissions import IsActiveUser


def is_admin_user(user):
	if not user or not user.is_authenticated or not user.is_active:
		return False
	if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
		return True
	return getattr(user, "role", "") == "admin" or getattr(user, "is_admin_role", False)


def is_teacher_user(user):
	if not user or not user.is_authenticated or not user.is_active:
		return False
	return getattr(user, "role", "") == "teacher" or getattr(user, "is_teacher", False)


class IsAdminRole(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and is_admin_user(request.user)


class IsTeacherRole(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and is_teacher_user(request.user)


class IsTeacherOrAdmin(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and (
			is_teacher_user(request.user) or is_admin_user(request.user)
		)
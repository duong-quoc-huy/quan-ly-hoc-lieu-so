from rest_framework.permissions import BasePermission

class IsActiveUser(BasePermission):
	def has_permission(self, request, view):
		return bool(request.user and request.user.is_authenticated and request.user.is_active)

class IsAdmin(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and request.user.role == 'admin'

class IsTeacher(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and request.user.role == 'teacher'

class IsStudent(IsActiveUser):
	def has_permission(self, request, view):
		return super().has_permission(request, view) and request.user.role == 'student'

class HasChangedPassword(IsActiveUser):
	message = "You must change password before using the service"
	code = "password_change_required"

	def has_permission(self, request,view):
		return super().has_permission(request, view) and not request.user.must_change_password 
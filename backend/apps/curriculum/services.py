from .models import TeacherCategory
from .permissions import is_teacher_user, is_admin_user


def teacher_can_manage_category(user, category):
	if not user or not user.is_authenticated or not user.is_active:
		return False

	if is_admin_user(user):
		return True

	if not is_teacher_user(user):
		return False

	if category is None:
		return False

	current = category
	while current is not None:
		if TeacherCategory.objects.filter(
			teacher=user,
			category=current,
			is_active=True,
		).exists():
			return True
		current = current.parent

	return False


def teacher_can_manage_lesson(user, lesson):
	if lesson is None:
		return False
	return teacher_can_manage_category(user, lesson.category)
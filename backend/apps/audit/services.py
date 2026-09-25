import logging
from django.db import transaction
from .models import AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
	if not request:
		return None
	return request.META.get("REMOTE_ADDR")


def log_action(action, actor=None, target_user=None, request=None, reason="", target_material=None, target_lesson=None, target_quiz=None):
	try:
		user_role = getattr(actor, "role", "") if actor else ""
		return AuditLog.objects.create(
			actor=actor,
			target_user=(
				target_user
				if target_user is not None
				else actor
				if target_material is None
				and target_lesson is None
				and target_quiz is None
				else None
			),
			target_material=target_material,
			target_lesson=target_lesson,
			target_quiz=target_quiz,
			action=action,
			role=user_role,
			ip_address=get_client_ip(request),
			reason=reason,
		)

	except Exception:
		logger.exception(
			"Failed to write audit log for action=%s",
			action,
		)
		return None


def record_material_download(*, material, actor, request):
	user_role = getattr(actor, "role", "") if actor else ""
	return AuditLog.objects.create(
		actor=actor,
		target_material=material,
		action=AuditLog.Action.MATERIAL_DOWNLOAD,
		role=user_role,
		ip_address=get_client_ip(request),
	)
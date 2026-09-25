from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
	actor_email = serializers.EmailField(source="actor.email", read_only=True, allow_null=True)
	actor_name = serializers.SerializerMethodField()
	target_user_email = serializers.EmailField(source="target_user.email", read_only=True, allow_null=True)
	action_display = serializers.CharField(source="get_action_display", read_only=True)

	class Meta:
		model = AuditLog
		fields = [
			"audit_log_id",
			"actor",
			"actor_email",
			"actor_name",
			"target_user",
			"target_user_email",
			"target_material",
			"action",
			"action_display",
			"role",
			"ip_address",
			"reason",
			"created_at",
		]
		read_only_fields = fields

	def get_actor_name(self, obj):
		if obj.actor:
			return f"{obj.actor.first_name} {obj.actor.last_name}".strip() or obj.actor.email
		return "System"
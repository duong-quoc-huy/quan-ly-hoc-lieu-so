from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
	list_display = ('created_at', 'action', 'actor', 'target_user', 'ip_address')
	list_filter = ('action',)
	search_fields = ('actor__email', 'target_user__email', 'reason', 'ip_address')
	readonly_fields = [f.name for f in AuditLog._meta.fields]

	def has_add_permission(self, request):
		return False
	def has_change_permission(self, request, obj=None):
		return False
	def has_delete_permission(self, request, obj=None):
		return False
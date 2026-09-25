from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import IsAdmin, HasChangedPassword
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogListView(generics.ListAPIView):
	serializer_class = AuditLogSerializer
	permission_classes = [IsAdmin, HasChangedPassword]
	queryset = AuditLog.objects.select_related("actor", "target_user", "target_material").all()
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_fields = ["action", "role"]
	search_fields = ["actor__email", "target_user__email", "reason", "ip_address"]
	ordering_fields = ["created_at"]
	ordering = ["-created_at"]
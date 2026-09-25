# from django.conf import settings
# from django.db import models

# from apps.materials.models import Material


# class ModerationLog(models.Model):
#     """Audit trail for approve/reject actions. Material.status is still the source of truth
#     for current state; this is history + the rejection reason shown back to the teacher."""

#     class Action(models.TextChoices):
#         APPROVE = "approve", "Approve"
#         REJECT = "reject", "Reject"

#     material = models.ForeignKey(Material, related_name="moderation_logs", on_delete=models.CASCADE)
#     admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
#     action = models.CharField(max_length=20, choices=Action.choices)
#     reason = models.TextField(blank=True)
#     timestamp = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         ordering = ["-timestamp"]

#     def __str__(self):
#         return f"{self.action} - {self.material} by {self.admin}"

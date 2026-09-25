import uuid
from django.conf import settings
from django.db import models
from apps.accounts.models import UUIDv7Field

class Comment(models.Model):
	comment_id = UUIDv7Field(primary_key=True, editable=False)
	material = models.ForeignKey("materials.Material", on_delete=models.CASCADE, related_name="comments")
	author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
	parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
	
	content = models.TextField()
	is_pinned = models.BooleanField(default=False)
	pinned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="pinned_comments")
	pinned_at = models.DateTimeField(null=True, blank=True)
	
	deleted_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-is_pinned", "created_at"]

	def __str__(self):
		return f"Comment by {self.author.email} on {self.material_id}"


class CommentReport(models.Model):
	report_id = UUIDv7Field(primary_key=True, editable=False)
	comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="reports")
	reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submitted_reports")
	reason = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]
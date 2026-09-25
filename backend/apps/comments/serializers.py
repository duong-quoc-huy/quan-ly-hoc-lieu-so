from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Comment, CommentReport


class CommentAuthorSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserSerializer.Meta.model
		fields = ["user_id", "first_name", "last_name", "role", "email"]


class CommentSerializer(serializers.ModelSerializer):
	author = CommentAuthorSerializer(read_only=True)
	replies = serializers.SerializerMethodField()

	class Meta:
		model = Comment
		fields = [
			"comment_id",
			"material",
			"author",
			"parent",
			"content",
			"is_pinned",
			"pinned_at",
			"replies",
			"created_at",
			"updated_at",
		]
		read_only_fields = [
			"comment_id",
			"material",
			"author",
			"is_pinned",
			"pinned_at",
			"created_at",
			"updated_at",
		]

	def get_replies(self, obj):
		if hasattr(obj, "replies"):
			child_replies = obj.replies.filter(deleted_at__isnull=True).select_related("author").order_by("created_at")
			return CommentSerializer(child_replies, many=True, context=self.context).data
		return []


class CommentReportSerializer(serializers.ModelSerializer):
	comment = CommentSerializer(read_only=True)
	reporter = CommentAuthorSerializer(read_only=True)

	class Meta:
		model = CommentReport
		fields = ["report_id", "comment", "reporter", "reason", "created_at"]
		read_only_fields = fields

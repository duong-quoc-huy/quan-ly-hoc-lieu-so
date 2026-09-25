from rest_framework import serializers

from apps.audit.models import AuditLog
from apps.materials.serializers import MaterialOwnerSerializer
from apps.quizzes.models import Quiz


class ApproveMaterialSerializer(serializers.Serializer):
    expected_updated_at = serializers.DateTimeField()


class RejectMaterialSerializer(serializers.Serializer):
    expected_updated_at = serializers.DateTimeField()
    rejection_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=2000,
    )


class ApproveQuizSerializer(serializers.Serializer):
    expected_updated_at = serializers.DateTimeField()


class RejectQuizSerializer(serializers.Serializer):
    expected_updated_at = serializers.DateTimeField()
    rejection_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=2000,
    )


class PendingQuizSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    category_name = serializers.CharField(source="lesson.category.name", read_only=True)
    question_count = serializers.IntegerField(source="questions.count", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "quiz_id",
            "lesson",
            "lesson_title",
            "category_name",
            "version",
            "title",
            "pass_percentage",
            "available_from",
            "available_until",
            "status",
            "created_by",
            "created_by_email",
            "question_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MaterialReviewHistorySerializer(serializers.ModelSerializer):
    reviewer = MaterialOwnerSerializer(
        source="actor",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "audit_log_id",
            "action",
            "reviewer",
            "reason",
            "created_at",
        ]
        read_only_fields = fields
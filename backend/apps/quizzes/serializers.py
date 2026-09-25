from django.utils import timezone
from rest_framework import serializers

from apps.curriculum.models import Lesson
from .models import Choice, Question, Quiz, QuizAttempt


class ChoiceEditorSerializer(serializers.Serializer):
    choice_id = serializers.UUIDField(read_only=True)
    text = serializers.CharField(max_length=1000)
    is_correct = serializers.BooleanField()

    def validate_text(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Choice text cannot be blank.")
        return cleaned


class QuestionEditorSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(read_only=True)
    text = serializers.CharField(max_length=5000)
    explanation = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=10000
    )
    choices = ChoiceEditorSerializer(many=True, min_length=2, max_length=6)

    def validate_text(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Question text cannot be blank.")
        return cleaned

    def validate_explanation(self, value):
        return value.strip() if value else ""

    def validate_choices(self, choices):
        correct_count = sum(1 for choice in choices if choice["is_correct"])

        if correct_count != 1:
            raise serializers.ValidationError(
                "Each question must have exactly one correct choice."
            )

        # Compare stripped and case-folded strings to detect duplicates properly
        texts = [choice["text"].strip().casefold() for choice in choices]

        if len(texts) != len(set(texts)):
            raise serializers.ValidationError(
                "Choices within a question must have different text."
            )

        return choices


class QuizEditorSerializer(serializers.Serializer):
    quiz_id = serializers.UUIDField(read_only=True)
    version = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    is_enabled = serializers.BooleanField(read_only=True)
    title = serializers.CharField(max_length=255)

    pass_percentage = serializers.IntegerField(min_value=0, max_value=100, default=60)
    available_from = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )
    available_until = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )
    questions = QuestionEditorSerializer(many=True, min_length=1, max_length=50)

    def validate_title(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Quiz title cannot be blank.")
        return cleaned

    def validate(self, attrs):
        # 1. Lesson Approval Guard
        lesson = self.context.get("lesson")
        if lesson and lesson.status != Lesson.Status.APPROVED:
            raise serializers.ValidationError(
                {"lesson": "Quizzes can only be created or updated for approved lessons."}
            )

        # 2. Availability Schedule Guard
        available_from = attrs.get("available_from")
        available_until = attrs.get("available_until")

        if (
            available_from is not None
            and available_until is not None
            and available_from >= available_until
        ):
            raise serializers.ValidationError(
                {"available_until": "The closing time must be later than the opening time."}
            )
        return attrs


class StudentChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["choice_id", "text", "position"]
        read_only_fields = fields


class StudentQuestionSerializer(serializers.ModelSerializer):
    choices = StudentChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["question_id", "text", "explanation", "position", "choices"]
        read_only_fields = fields


class QuizSummarySerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = ["quiz_id", "version", "title", "pass_percentage", "question_count"]
        read_only_fields = fields


class SubmittedAnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    choice_id = serializers.UUIDField()


class SubmitQuizSerializer(serializers.Serializer):
    answers = SubmittedAnswerSerializer(many=True, min_length=1, max_length=50)

    def validate_answers(self, answers):
        question_ids = [answer["question_id"] for answer in answers]

        if len(question_ids) != len(set(question_ids)):
            raise serializers.ValidationError("A question may only be answered once.")

        return answers


class QuizAttemptSummarySerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    quiz_version = serializers.IntegerField(source="quiz.version", read_only=True)
    lesson_id = serializers.UUIDField(source="quiz.lesson_id", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "attempt_id",
            "quiz_id",
            "quiz_title",
            "quiz_version",
            "lesson_id",
            "status",
            "total_questions",
            "correct_answers",
            "score_percentage",
            "passed",
            "is_late",
            "started_at",
            "submitted_at",
        ]
        read_only_fields = fields


class StudentQuizSerializer(serializers.ModelSerializer):
    questions = StudentQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["quiz_id", "version", "title", "pass_percentage", "questions"]
        read_only_fields = fields


class QuizAttemptDetailSerializer(QuizAttemptSummarySerializer):
    quiz = serializers.SerializerMethodField()

    class Meta(QuizAttemptSummarySerializer.Meta):
        fields = QuizAttemptSummarySerializer.Meta.fields + ["answers", "quiz"]
        read_only_fields = fields

    def get_quiz(self, obj):
        if obj.status == QuizAttempt.Status.SUBMITTED:
            return QuizEditorSerializer(obj.quiz).data

        return StudentQuizSerializer(obj.quiz).data


class TeacherQuizStatsSerializer(serializers.Serializer):
    lesson_id = serializers.UUIDField()
    current_version = serializers.IntegerField(allow_null=True)
    quiz_enabled = serializers.BooleanField()
    quiz_versions = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    in_progress_attempts = serializers.IntegerField()
    submitted_attempts = serializers.IntegerField()
    unique_participants = serializers.IntegerField()
    passed_attempts = serializers.IntegerField()
    average_score = serializers.FloatField(allow_null=True)
    pass_rate = serializers.FloatField(allow_null=True)


class AvailableQuizSerializer(serializers.ModelSerializer):
    lesson_id = serializers.UUIDField(read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    category_name = serializers.CharField(source="lesson.category.name", read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "quiz_id",
            "lesson_id",
            "lesson_title",
            "category_name",
            "version",
            "title",
            "pass_percentage",
            "question_count",
        ]
        read_only_fields = fields
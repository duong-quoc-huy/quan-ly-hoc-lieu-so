from rest_framework import serializers
from .models import Faculty, Major, Category, Lesson, TeacherCategory
from .services import teacher_can_manage_category
from .permissions import is_admin_user, is_teacher_user


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ["faculty_id", "name", "code", "description", "created_at", "updated_at"]
        read_only_fields = ["faculty_id", "created_at", "updated_at"]


class MajorSerializer(serializers.ModelSerializer):
    faculty = FacultySerializer(read_only=True)
    faculty_id = serializers.PrimaryKeyRelatedField(
        queryset=Faculty.objects.all(),
        source="faculty",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Major
        fields = ["major_id", "name", "code", "faculty", "faculty_id", "created_at"]
        read_only_fields = ["major_id", "created_at"]
    def validate_code(self, value):
        if not value or not value.strip():
            return None
        return value


class CategorySerializer(serializers.ModelSerializer):
    major = MajorSerializer(read_only=True)
    major_id = serializers.PrimaryKeyRelatedField(
        queryset=Major.objects.all(),
        source="major",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Category
        fields = [
            "category_id",
            "name",
            "slug",
            "description",
            "major",
            "major_id",
            "parent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["category_id", "created_at", "updated_at"]

    def validate(self, attrs):
        parent = attrs.get("parent", self.instance.parent if self.instance else None)
        visited = set()

        while parent is not None:
            if self.instance and parent.pk == self.instance.pk:
                raise serializers.ValidationError(
                    {"parent": "A category cannot be its own ancestor."}
                )
            if parent.pk in visited:
                raise serializers.ValidationError(
                    {"parent": "The selected category hierarchy contains a cycle."}
                )
            visited.add(parent.pk)
            parent = parent.parent

        return attrs


class LessonSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    major_name = serializers.CharField(source="category.major.name", read_only=True, allow_null=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "lesson_id",
            "category",
            "category_name",
            "major_name",
            "title",
            "order",
            "description",
            "created_by",
            "created_by_email",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "lesson_id",
            "created_by",
            "created_by_email",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user:
            return attrs

        category = attrs.get("category", self.instance.category if self.instance else None)
        if not category:
            raise serializers.ValidationError({"category": "Category is required."})

        user = request.user
        if is_teacher_user(user) and not is_admin_user(user):
            if not teacher_can_manage_category(user, category):
                raise serializers.ValidationError(
                    {"category": "You are not assigned to teach this subject or any of its parent subjects."}
                )

        return attrs


class LessonReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["status", "rejection_reason"]

    def validate_status(self, value):
        if value not in [Lesson.Status.APPROVED, Lesson.Status.REJECTED]:
            raise serializers.ValidationError("Status must be either 'approved' or 'rejected'.")
        return value


class TeacherCategorySerializer(serializers.ModelSerializer):
    teacher_email = serializers.EmailField(source="teacher.email", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = TeacherCategory
        fields = [
            "assignment_id",
            "teacher",
            "teacher_email",
            "category",
            "category_name",
            "is_active",
            "assigned_at",
        ]
        read_only_fields = ["assignment_id", "assigned_at"]
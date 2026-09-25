from django.contrib import admin
from .models import Faculty, Major, Category, Lesson, TeacherCategory


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "created_at"]
    search_fields = ["name", "code"]


@admin.register(Major)
class MajorAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "faculty", "created_at"]
    search_fields = ["name", "code", "faculty__name"]
    list_filter = ["faculty"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "major", "parent", "created_at"]
    search_fields = ["name", "major__name", "description"]
    list_filter = ["major", "parent"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "category",
        "status",
        "created_by",
        "order",
        "created_at",
    ]
    search_fields = [
        "title",
        "category__name",
        "created_by__email",
    ]
    list_filter = [
        "status",
        "category",
        "created_at",
    ]
    readonly_fields = ["reviewed_by", "reviewed_at"]
    fields = [
        "title",
        "category",
        "order",
        "description",
        "status",
        "created_by",
        "reviewed_by",
        "reviewed_at",
        "rejection_reason",
    ]


@admin.register(TeacherCategory)
class TeacherCategoryAdmin(admin.ModelAdmin):
    list_display = [
        "teacher",
        "category",
        "is_active",
        "assigned_at",
    ]

    search_fields = [
        "teacher__email",
        "teacher__first_name",
        "teacher__last_name",
        "category__name",
    ]

    list_filter = [
        "is_active",
        "category",
    ]

    autocomplete_fields = [
        "teacher",
        "category",
    ]
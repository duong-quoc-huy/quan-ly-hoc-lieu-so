from django.contrib import admin

from .models import Material, MaterialSubmission


class MaterialInline(admin.TabularInline):
    model = Material
    extra = 0
    can_delete = False

    fields = (
        "material_id",
        "material_type",
        "file",
        "converted_pdf",
        "original_filename",
        "display_file_size",
        "created_at",
        "updated_at",
    )

    readonly_fields = (
        "material_id",
        "material_type",
        "file",
        "converted_pdf",
        "original_filename",
        "display_file_size",
        "created_at",
        "updated_at",
    )

    @admin.display(description="File size", ordering="file_size")
    def display_file_size(self, obj):
        size = obj.file_size or 0

        if size < 1024:
            return f"{size} B"

        if size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"

        return f"{size / (1024 * 1024):.2f} MB"


@admin.register(MaterialSubmission)
class MaterialSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "lesson",
        "display_major",
        "status",
        "display_file_count",
        "is_deleted",
        "created_at",
    )

    list_display_links = ("title",)

    search_fields = (
        "title",
        "description",
        "owner__email",
        "owner__first_name",
        "owner__last_name",
        "lesson__title",
        "lesson__category__name",
        "lesson__category__major__name",
    )

    list_filter = (
        "status",
        "lesson__category__major",
        "lesson__category",
        ("deleted_at", admin.EmptyFieldListFilter),
        "created_at",
    )

    list_select_related = (
        "owner",
        "lesson",
        "lesson__category",
        "lesson__category__major",
        "reviewed_by",
        "review_locked_by",
    )

    ordering = ("-created_at", "-submission_id")
    date_hierarchy = "created_at"
    list_per_page = 25
    actions = None

    readonly_fields = (
        "submission_id",
        "owner",
        "lesson",
        "status",
        "reviewed_by",
        "reviewed_at",
        "rejection_reason",
        "review_locked_by",
        "review_locked_at",
        "deleted_at",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Submission information",
            {
                "fields": (
                    "submission_id",
                    "title",
                    "description",
                    "owner",
                    "lesson",
                ),
            },
        ),
        (
            "Moderation",
            {
                "fields": (
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "rejection_reason",
                ),
            },
        ),
        (
            "Review lock",
            {
                "fields": (
                    "review_locked_by",
                    "review_locked_at",
                ),
            },
        ),
        (
            "Timestamps and deletion",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "deleted_at",
                ),
            },
        ),
    )

    inlines = (MaterialInline,)

    @admin.display(
        description="Major",
        ordering="lesson__category__major__name",
    )
    def display_major(self, obj):
        category = getattr(obj.lesson, "category", None)
        major = getattr(category, "major", None)

        if not major:
            return "-"

        if getattr(major, "code", None):
            return f"{major.name} ({major.code})"

        return major.name

    @admin.display(description="Files", ordering="files__count")
    def display_file_count(self, obj):
        return obj.files.count()

    @admin.display(boolean=True, description="Deleted", ordering="deleted_at")
    def is_deleted(self, obj):
        return obj.deleted_at is not None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = (
        "original_filename",
        "submission",
        "owner",
        "material_type",
        "display_file_size",
        "created_at",
    )

    list_display_links = ("original_filename",)

    search_fields = (
        "original_filename",
        "submission__title",
        "owner__email",
        "owner__first_name",
        "owner__last_name",
        "submission__lesson__title",
        "submission__lesson__category__name",
        "submission__lesson__category__major__name",
    )

    list_filter = (
        "material_type",
        "created_at",
    )

    list_select_related = (
        "submission",
        "owner",
        "submission__lesson",
        "submission__lesson__category",
        "submission__lesson__category__major",
    )

    ordering = ("-created_at", "-material_id")
    date_hierarchy = "created_at"
    list_per_page = 25
    actions = None

    readonly_fields = (
        "material_id",
        "submission",
        "owner",
        "material_type",
        "file",
        "converted_pdf",
        "original_filename",
        "display_file_size",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "File information",
            {
                "fields": (
                    "material_id",
                    "submission",
                    "owner",
                    "material_type",
                    "file",
                    "converted_pdf",
                    "original_filename",
                    "display_file_size",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    @admin.display(description="File size", ordering="file_size")
    def display_file_size(self, obj):
        size = obj.file_size or 0

        if size < 1024:
            return f"{size} B"

        if size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"

        return f"{size / (1024 * 1024):.2f} MB"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
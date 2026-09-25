from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .forms import UserCreationForm, UserChangeForm
from .models import User, StudentIDCounter


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = (
        "email",
        "student_id",
        "full_name",
        "role",
        "gender",
        "is_active",
        "is_staff",
        "must_change_password",
        "created_at",
    )

    list_filter = (
        "role",
        "gender",
        "is_active",
        "is_staff",
        "is_superuser",
        "must_change_password",
        "created_at",
    )

    search_fields = (
        "email",
        "student_id",
        "first_name",
        "last_name",
        "phone_number_1",
        "phone_number_2",
    )

    ordering = ("-created_at",)
    list_per_page = 25
    date_hierarchy = "created_at"

    @admin.display(description=_("Full name"))
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    readonly_fields = (
        "user_id",
        "student_id",
        "created_at",
        "last_login",
    )

    fieldsets = (
        (
            _("Credentials"),
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            _("Personal Information"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "gender",
                    "date_of_birth",
                    "profile_image",
                )
            },
        ),
        (
            _("Contact Details"),
            {
                "fields": (
                    "phone_number_1",
                    "phone_number_2",
                )
            },
        ),
        (
            _("Institutional Details"),
            {
                "fields": (
                    "student_id",
                    "role",
                    "must_change_password",
                )
            },
        ),
        (
            _("Permissions & Status"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            _("Important Dates"),
            {
                "fields": (
                    "user_id",
                    "created_at",
                    "last_login",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "first_name",
                    "last_name",
                    "gender",
                    "date_of_birth",
                    "phone_number_1",
                    "phone_number_2",
                    "role",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    actions = (
        "activate_accounts",
        "deactivate_accounts",
    )

    @admin.action(description=_("Activate selected accounts"))
    def activate_accounts(self, request, queryset):
        updated = queryset.update(is_active=True)

        self.message_user(
            request,
            _(f"{updated} account(s) were activated successfully."),
        )

    @admin.action(description=_("Deactivate selected accounts"))
    def deactivate_accounts(self, request, queryset):
        admin_users = queryset.filter(role=User.Role.ADMIN)

        if admin_users.exists():
            admin_count = admin_users.count()

            self.message_user(
                request,
                _(
                    f"{admin_count} administrator account(s) "
                    f"were not deactivated."
                ),
                level="warning",
            )

        users_to_deactivate = queryset.exclude(
            role=User.Role.ADMIN
        )

        updated = users_to_deactivate.update(is_active=False)

        self.message_user(
            request,
            _(f"{updated} account(s) were deactivated successfully."),
        )


@admin.register(StudentIDCounter)
class StudentIDCounterAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "last_number",
    )

    ordering = (
        "-year",
    )

    readonly_fields = (
        "year",
        "last_number",
    )

    list_per_page = 25
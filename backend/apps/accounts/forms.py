from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import User
from .services import (
    generate_student_id,
    generate_student_email,
    generate_teacher_email,
)


class UserCreationForm(forms.ModelForm):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "phone_number_1",
            "phone_number_2",
            "role",
            "is_staff",
            "is_superuser",
            "must_change_password",
        )

    def save(self, commit=True):
        user = super().save(commit=False)

        role = user.role

        if role == User.Role.STUDENT:
            student_id = generate_student_id()
            user.student_id = student_id
            user.email = generate_student_email(student_id)

        elif role == User.Role.TEACHER:
            user.email = generate_teacher_email(
                user.first_name,
                user.last_name,
            )

        user.is_active = True
        user.must_change_password = True

        # Default initial password
        user.set_password("ChangeMe123!")

        if commit:
            user.save()

        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored, so there is no way to see "
            "this user's password. You can change the password using "
            "the password reset form."
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "student_id",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "phone_number_1",
            "phone_number_2",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "must_change_password",
            "groups",
            "user_permissions",
        )
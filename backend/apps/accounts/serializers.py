from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User
from .services import generate_student_id, generate_student_email, generate_teacher_email
from apps.audit.models import AuditLog
from apps.audit.services import log_action


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields[self.username_field].allow_blank = True
        self.fields['student_id'] = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        auth_error = AuthenticationFailed({'detail': 'Invalid information. Please try again'})
        email = attrs.get('email')
        student_id = attrs.get('student_id')
        request = self.context.get('request')

        if not email and not student_id:
            raise serializers.ValidationError('Email or student ID is required.')

        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(student_id=student_id)
        except User.DoesNotExist:
            log_action(AuditLog.Action.LOGIN_FAILED, request=request, reason='No matching user')
            raise auth_error

        if not user.is_active:
            log_action(AuditLog.Action.LOGIN_FAILED, actor=user, request=request, reason='Account deactivated')
            raise AuthenticationFailed(
                {'detail': 'Your account has been deactivated. Please contact customer service.',
                 'code': 'account_deactivated'}
            )

        if not user.check_password(attrs['password']):
            log_action(AuditLog.Action.LOGIN_FAILED, actor=user, request=request, reason='Incorrect password')
            raise auth_error

        attrs[self.username_field] = user.email
        data = super().validate(attrs)
        log_action(AuditLog.Action.LOGIN, actor=user, request=request)
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(read_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'gender', 'date_of_birth', 'phone_number_1', 'phone_number_2', 'role')
        read_only_fields = ('user_id', 'student_id', 'email')

    def create(self, validated_data):
        role = validated_data.get('role', User.Role.STUDENT)

        if role == User.Role.STUDENT:
            student_id = generate_student_id()
            validated_data['student_id'] = student_id
            validated_data['email'] = generate_student_email(student_id)

        elif role == User.Role.TEACHER:
            validated_data['email'] = generate_teacher_email(validated_data['first_name'], validated_data['last_name'])

        validated_data['is_active'] = True
        validated_data['must_change_password'] = True
        default_password = "ChangeMe123!"
        user = User(**validated_data)
        user.set_password(default_password)
        user.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'user_id',
            'email',
            'student_id',
            'first_name',
            'last_name',
            'gender',
            'date_of_birth',
            'phone_number_1',
            'phone_number_2',
            'role',
            'profile_image',
            'is_active',
            'must_change_password',
            'created_at',
        )
        read_only_fields = ('user_id', 'email', 'student_id', 'role', 'is_active', 'must_change_password', 'created_at')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_2 = serializers.CharField(write_only=True, required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if attrs['new_password'] != attrs['new_password_2']:
            raise serializers.ValidationError({'new_password_2': 'Passwords do not match.'})

        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({'new_password': 'New password must differ from the current password.'})

        validate_password(attrs['new_password'], user=user)
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        return user


class AdminResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password_2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_2']:
            raise serializers.ValidationError({'new_password_2': 'Passwords do not match.'})
        return attrs

    def save(self, target_user):
        target_user.set_password(self.validated_data['new_password'])
        target_user.must_change_password = True
        target_user.save()
        return target_user
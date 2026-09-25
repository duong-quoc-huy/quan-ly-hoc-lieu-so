from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .permissions import IsAdmin, IsActiveUser, HasChangedPassword
from .serializers import UserCreateSerializer, UserSerializer, ChangePasswordSerializer, AdminResetPasswordSerializer, CustomTokenObtainPairSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_action
from django_filters.rest_framework import DjangoFilterBackend


class UserCreateView(generics.CreateAPIView):
	queryset = User.objects.all()
	serializer_class = UserCreateSerializer
	permission_classes = [IsAdmin, HasChangedPassword]

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()

		log_action(
			AuditLog.Action.USER_CREATE,
			actor=request.user,
			target_user=user,
			request=request,
			reason=f"Created user with role {user.role}"
		)

		return Response(
			{'message': 'Account created successfully', 'user': UserSerializer(user).data},
			status=status.HTTP_201_CREATED
		)


class LoginView(TokenObtainPairView):
	serializer_class = CustomTokenObtainPairSerializer
	permission_classes = [AllowAny]


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		try:
			refresh_token = request.data['refresh']
			token = RefreshToken(refresh_token)
			token.blacklist()
			log_action(AuditLog.Action.LOGOUT, actor=request.user, request=request)
			return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
		except Exception:
			return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
	serializer_class = UserSerializer
	permission_classes = [IsActiveUser]

	def get_permissions(self):
		if self.request.method in ('PUT', 'PATCH'):
			return [HasChangedPassword()]
		return super().get_permissions()

	def get_object(self):
		return self.request.user


class ChangePasswordView(generics.GenericAPIView):
	serializer_class = ChangePasswordSerializer
	permission_classes = [IsAuthenticated, IsActiveUser]

	def post(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save()
		log_action(AuditLog.Action.PASSWORD_RESET, actor=request.user, request=request)
		return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


class ChangePasswordViewByAdmin(generics.GenericAPIView):
	queryset = User.objects.all()
	serializer_class = AdminResetPasswordSerializer
	permission_classes = [IsAdmin, HasChangedPassword]
	lookup_field = 'user_id'

	def post(self, request, *args, **kwargs):
		target_user = self.get_object()
		serializer = self.get_serializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save(target_user)
		log_action(
			AuditLog.Action.PASSWORD_RESET_BY_ADMIN, 
			actor=request.user, 
			target_user=target_user, 
			request=request
		)
		return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)


class DeactivateAccountView(generics.GenericAPIView):
	queryset = User.objects.all()
	permission_classes = [IsAdmin, HasChangedPassword]
	lookup_field = 'user_id'

	def post(self, request, *args, **kwargs):
		target_user = self.get_object()
		reason = request.data.get('reason', '')

		if target_user.role == User.Role.ADMIN:
			log_action(
				AuditLog.Action.DEACTIVATE_BLOCKED,
				actor=request.user,
				target_user=target_user,
				request=request,
				reason='Blocked: cannot deactivate an admin account'
			)
			return Response({'detail': 'You cannot deactivate an admin account.'}, status=status.HTTP_400_BAD_REQUEST)

		if not target_user.is_active:
			return Response({'detail': 'Account is already deactivated.'}, status=status.HTTP_400_BAD_REQUEST)

		target_user.is_active = False
		target_user.save(update_fields=['is_active'])
		log_action(AuditLog.Action.DEACTIVATE, actor=request.user, target_user=target_user, request=request, reason=reason)

		return Response({'detail': 'Account deactivated successfully', 'user': UserSerializer(target_user).data})


class ReactivateAccountView(generics.GenericAPIView):
	queryset = User.objects.all()
	permission_classes = [IsAdmin, HasChangedPassword]
	lookup_field = 'user_id'

	def post(self, request, *args, **kwargs):
		target_user = self.get_object()

		if target_user.is_active:
			return Response({'detail': 'Account is already active.'}, status=status.HTTP_400_BAD_REQUEST)

		target_user.is_active = True
		target_user.save(update_fields=['is_active'])
		log_action(
			AuditLog.Action.REACTIVATE,
			actor=request.user,
			target_user=target_user,
			request=request,
			reason=request.data.get('reason', '')
		)

		return Response({'detail': 'Account reactivated successfully', 'user': UserSerializer(target_user).data})

class AdminUserListView(generics.ListAPIView):
	serializer_class = UserSerializer
	permission_classes = [IsAdmin, HasChangedPassword]
	queryset = User.objects.all()
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_fields = ["role", "is_active", "gender"]
	search_fields = ["email", "student_id", "first_name", "last_name", "phone_number_1"]
	ordering_fields = ["created_at", "last_name", "role"]
	ordering = ["-created_at"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
	queryset = User.objects.all()
	serializer_class = UserSerializer
	permission_classes = [IsAdmin, HasChangedPassword]
	lookup_field = "user_id"
from django.urls import path
from .views import (
	UserCreateView,
	LoginView,
	LogoutView,
	ProfileView,
	ChangePasswordView,
	ChangePasswordViewByAdmin,
	DeactivateAccountView,
	ReactivateAccountView,
	AdminUserListView,
	AdminUserDetailView,
)

app_name = "accounts"

urlpatterns = [
	# Auth endpoints
	path("auth/login/", LoginView.as_view(), name="login"),
	path("auth/logout/", LogoutView.as_view(), name="logout"),
	path("auth/profile/", ProfileView.as_view(), name="profile"),
	path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
	
	# Admin User Management endpoints
	path("auth/users/", AdminUserListView.as_view(), name="user-list"),
	path("auth/users/create/", UserCreateView.as_view(), name="user-create"),
	path("auth/users/<uuid:user_id>/", AdminUserDetailView.as_view(), name="user-detail"),
	path("auth/users/<uuid:user_id>/reset-password/", ChangePasswordViewByAdmin.as_view(), name="user-reset-password"),
	path("auth/users/<uuid:user_id>/deactivate/", DeactivateAccountView.as_view(), name="user-deactivate"),
	path("auth/users/<uuid:user_id>/reactivate/", ReactivateAccountView.as_view(), name="user-reactivate"),
]
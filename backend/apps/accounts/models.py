from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models
import uuid_utils
import uuid
from .validators import validate_profile_image


#custom uuid field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


# student id counter
class StudentIDCounter(models.Model):
	year = models.PositiveIntegerField(unique=True)
	last_number = models.PositiveIntegerField(default=0)

#phone number validators
phone_validator = RegexValidator(regex=r'^0[0-9]{9}$', message='Phone number must be 10 digits and start with 0.')


#tables
class UserManager(BaseUserManager):
	def create_user(self, email, password=None, **extra_fields):
		if not email:
			raise ValueError("Email is required")
		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self.db)
		return user

	def create_superuser(self, email, password=None, **extra_fields):
		extra_fields.setdefault('role', 'admin')
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		return self.create_user(email, password, **extra_fields)



class User(AbstractBaseUser, PermissionsMixin):
	class Role(models.TextChoices):
		STUDENT = "student", "Student"
		TEACHER = "teacher", "Teacher"
		ADMIN = "admin", "Admin"

	class Gender(models.TextChoices):
		FEMALE = "female", "Female"
		MALE = "male", "Male"
		OTHER = "other", "Other"


	user_id = UUIDv7Field(primary_key=True, editable=False)
	student_id = models.CharField(max_length=10 ,unique=True, null=True, blank=True)
	email = models.EmailField(unique=True)
	first_name = models.CharField(max_length=100)
	last_name = models.CharField(max_length=100)
	gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
	date_of_birth = models.DateField(null=True, blank=True)
	phone_number_1 = models.CharField(max_length=10, validators=[phone_validator], unique=True)
	phone_number_2 = models.CharField(max_length=10, validators=[phone_validator], unique=True, blank=True, null=True)
	role = models.CharField(max_length=10, choices=Role.choices)
	is_active = models.BooleanField(default=True)
	is_staff = models.BooleanField(default=False)
	must_change_password = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True, validators=[validate_profile_image])

	objects = UserManager()

	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['first_name', 'last_name']

	def __str__(self):
		return f"{self.email} ({self.role})"

	@property
	def is_student(self):
		return self.role == self.Role.STUDENT

	@property
	def is_teacher(self):
		return self.role == self.Role.TEACHER

	@property
	def is_admin_role(self):
		return self.role == self.Role.ADMIN

	class Meta:
		ordering = ['-created_at']


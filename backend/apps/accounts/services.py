from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from .models import User, StudentIDCounter


def generate_student_id():
	year = timezone.now().year

	with transaction.atomic():
		counter, _ = 	(StudentIDCounter.objects.select_for_update().get_or_create(year=year))
		counter.last_number += 1
		counter.save(update_fields=["last_number"])

		student_id = f"{year % 100:02d}{counter.last_number:08d}"

	return student_id

def generate_student_email(student_id):
	raw_domain = getattr(settings, 'EMAIL_DOMAIN', 'firefly-education.com')
	domain = raw_domain.lstrip('@')
	return f"{student_id}@{domain}"
	


def generate_teacher_email(first_name, last_name):
	base_name = slugify(f"{first_name}.{last_name}").replace('-', '.')
	raw_domain = getattr(settings, 'EMAIL_DOMAIN', 'firefly-education.com')
	domain = raw_domain.lstrip('@')
	
	email = f"{base_name}@{domain}"
	counter = 1

	# Check for duplicate teacher email collisions
	while User.objects.filter(email=email).exists():
		email = f"{base_name}{counter}@{domain}"
		counter += 1

	return email

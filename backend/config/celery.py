import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('lms')

# Read config from Django settings using CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks.py in all INSTALLED_APPS (accounts, documents, etc.)
app.autodiscover_tasks()

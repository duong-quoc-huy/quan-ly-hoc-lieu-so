""" # local private folder
import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible

@deconstructible
class PrivateMaterialStorage(FileSystemStorage):
	def __init__(self):
		super().__init__(file_permissions_mode=0o600, directory_permissions_mode=0o700)

	@property
	def base_location(self):
		return os.fspath(settings.PRIVATE_MEDIA_ROOT)

	@property
	def url(self):
		raise ValueError("Material files are private. Use the assigned account to access")


private_material_storage = PrivateMaterialStorage()

"""

#using AWS Bucket 
import boto3
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PrivateS3Storage(S3Boto3Storage):
	location = "private_materials"
	default_acl = "private"
	file_overwrite = False
	custom_domain = False


private_material_storage = PrivateS3Storage()


def generate_presigned_url(file_field, original_filename, inline=True, expires=900):
	if not file_field or not file_field.name:
		return None

	disposition_type = "inline" if inline else "attachment"
	disposition = f'{disposition_type}; filename="{original_filename}"'

	return file_field.storage.url(
		file_field.name,
		parameters={"ResponseContentDisposition": disposition},
		expire=expires,
	)
from rest_framework import status
from rest_framework.exceptions import APIException

class ReviewConflict(APIException):
	status_code = status.HTTP_409_CONFLICT
	default_detail = ("The material has changed. Reload it before submiting a review.")
	default_code = "review_conflict"
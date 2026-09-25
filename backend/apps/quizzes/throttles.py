from rest_framework.throttling import UserRateThrottle


class QuizStartThrottle(UserRateThrottle):
	scope = "quiz_start"


class QuizSubmitThrottle(UserRateThrottle):
	scope = "quiz_submit"


class QuizAuthoringThrottle(UserRateThrottle):
	scope = "quiz_authoring"
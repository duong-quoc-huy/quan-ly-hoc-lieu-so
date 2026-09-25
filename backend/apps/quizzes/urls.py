from django.urls import path
from .views import (
    AdminLessonQuizView,
    AvailableQuizListView,
    MyQuizAttemptDetailView,
    MyQuizAttemptListView,
    PublicLessonQuizView,
    StartQuizAttemptView,
    SubmitQuizAttemptView,
    TeacherLessonQuizStatsView,
    TeacherLessonQuizView,
)

app_name = "quizzes"

urlpatterns = [
    # Teacher Management Routes
    path("teacher/lessons/<uuid:lesson_id>/", TeacherLessonQuizView.as_view(), name="teacher-lesson-quiz"),
    path("teacher/lessons/<uuid:lesson_id>/stats/", TeacherLessonQuizStatsView.as_view(), name="teacher-lesson-quiz-stats"),
    path("lessons/mine/<uuid:lesson_id>/quiz/", TeacherLessonQuizView.as_view(), name="teacher-lesson-quiz-alias"),

    # Student Quiz Discovery & Execution
    path("available/", AvailableQuizListView.as_view(), name="available-quizzes"),
    path("lessons/<uuid:lesson_id>/quiz/", PublicLessonQuizView.as_view(), name="lesson-quiz"),
    path("lessons/<uuid:lesson_id>/quiz/attempts/", StartQuizAttemptView.as_view(), name="start-attempt"),

    # Direct Attempt Management
    path("attempts/mine/", MyQuizAttemptListView.as_view(), name="my-attempt-list"),
    path("attempts/<uuid:attempt_id>/", MyQuizAttemptDetailView.as_view(), name="my-attempt-detail"),
    path("attempts/<uuid:attempt_id>/submit/", SubmitQuizAttemptView.as_view(), name="submit-attempt"),

    # Admin Moderation
    path("moderation/lessons/<uuid:lesson_id>/quiz/", AdminLessonQuizView.as_view(), name="admin-lesson-quiz"),
]
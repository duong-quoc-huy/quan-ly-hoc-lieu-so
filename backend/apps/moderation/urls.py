from django.urls import path

from .views import (
	LockMaterialForReviewView,
	UnlockMaterialReviewView,
	CommentReportListView,
	DismissCommentReportView,
	SoftDeleteReportedCommentView,
	PendingMaterialListView,
	ModerationMaterialDetailView,
	ApproveMaterialView,
	RejectMaterialView,
	AllModerationMaterialListView,
	AdminMaterialReviewHistoryView,
	TeacherMaterialReviewHistoryView,
	PendingQuizListView,
	ApproveQuizView,
	RejectQuizView,
	AdminLessonApproveView,
    AdminLessonRejectView,
)

app_name = "moderation"

urlpatterns = [
	path("materials/pending/", PendingMaterialListView.as_view(), name="pending-material-list"),
	path("materials/all/", AllModerationMaterialListView.as_view(), name="all-material-list"),
	path("materials/<uuid:material_id>/", ModerationMaterialDetailView.as_view(), name="material-detail"),
	path("materials/<uuid:material_id>/lock/", LockMaterialForReviewView.as_view(), name="material-lock"),
	path("materials/<uuid:material_id>/unlock/", UnlockMaterialReviewView.as_view(), name="material-unlock"),
	path("materials/<uuid:material_id>/approve/", ApproveMaterialView.as_view(), name="material-approve"),
	path("materials/<uuid:material_id>/reject/", RejectMaterialView.as_view(), name="material-reject"),
	path("materials/<uuid:material_id>/review-history/", AdminMaterialReviewHistoryView.as_view(), name="material-review-history"),
	path("review-history/<uuid:material_id>/", TeacherMaterialReviewHistoryView.as_view(), name="teacher-material-review-history"),
	path("quizzes/pending/", PendingQuizListView.as_view(), name="pending-quiz-list"),
	path("quizzes/<uuid:quiz_id>/approve/", ApproveQuizView.as_view(), name="quiz-approve"),
	path("quizzes/<uuid:quiz_id>/reject/", RejectQuizView.as_view(), name="quiz-reject"),
	path("comment-reports/", CommentReportListView.as_view(), name="comment-report-list"),
	path("comment-reports/<uuid:report_id>/dismiss/", DismissCommentReportView.as_view(), name="comment-report-dismiss"),
	path("comments/<uuid:comment_id>/delete/", SoftDeleteReportedCommentView.as_view(), name="comment-delete"),
	path("lessons/<uuid:lesson_id>/approve/", AdminLessonApproveView.as_view(), name="admin-approve-lesson"),
    path("lessons/<uuid:lesson_id>/reject/", AdminLessonRejectView.as_view(), name="admin-reject-lesson"),
]
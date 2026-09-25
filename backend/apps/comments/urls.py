# apps/comments/urls.py
from django.urls import path
from .views import MaterialCommentListCreateView, CommentDetailView, CommentPinToggleView, CommentReportView

app_name = "comments"

urlpatterns = [
    path("materials/<uuid:material_id>/comments/", MaterialCommentListCreateView.as_view(), name="material-comments"),
    path("comments/<uuid:comment_id>/", CommentDetailView.as_view(), name="comment-detail"),
    path("comments/<uuid:comment_id>/pin/", CommentPinToggleView.as_view(), name="comment-pin"),
    path("comments/<uuid:comment_id>/report/", CommentReportView.as_view(), name="comment-report"),
]
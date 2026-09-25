from django.urls import path
from .views import (
    DynamicMaterialUploadView,
    MaterialDownloadView,
    MyMaterialDetailView,
    MyMaterialListCreateView,
    PublicMaterialDetailView,
    PublicMaterialListView,
    WithdrawMaterialSubmissionView,
)
from apps.moderation.views import TeacherMaterialReviewHistoryView

app_name = "materials"

urlpatterns = [
    path("materials/", PublicMaterialListView.as_view(), name="material-list"),
    path("materials/mine/", MyMaterialListCreateView.as_view(), name="my-material-list"),
    path("materials/dynamic-upload/", DynamicMaterialUploadView.as_view(), name="dynamic-material-upload"),
    path("materials/mine/<uuid:material_id>/", MyMaterialDetailView.as_view(), name="my-material-detail"),
    path("materials/mine/<uuid:material_id>/withdraw/", WithdrawMaterialSubmissionView.as_view(), name="material-withdraw"),
    path("materials/mine/<uuid:material_id>/review-history/", TeacherMaterialReviewHistoryView.as_view(), name="my-material-review-history"),
    path("materials/<uuid:material_id>/download/", MaterialDownloadView.as_view(), name="material-download"),
    path("materials/<uuid:material_id>/", PublicMaterialDetailView.as_view(), name="material-detail"),
]
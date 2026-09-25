from django.urls import path
from .views import PPTXUploadView, PPTXStatusView

urlpatterns = [
    path('pptx/upload/', PPTXUploadView.as_view(), name='pptx-upload'),
    path('pptx/<uuid:pk>/status/', PPTXStatusView.as_view(), name='pptx-status'),
]

from django.urls import path
from .views import AdminSystemStatsView

app_name = "stats"

urlpatterns = [
    path("stats/overview/", AdminSystemStatsView.as_view(), name="system-stats"),
]
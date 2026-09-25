from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    #apps urls
    path("api/", include('apps.accounts.urls')),
    path("api/", include("apps.materials.urls")),
    path("api/moderation/", include("apps.moderation.urls")),
    path("api/quizzes/", include("apps.quizzes.urls")),
    path("api/", include("apps.comments.urls")),
    path("api/", include("apps.stats.urls")),
    path("api/", include("apps.audit.urls")),
    path("api/curriculum/", include("apps.curriculum.urls")),
    path('api/documents/', include('apps.documents.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

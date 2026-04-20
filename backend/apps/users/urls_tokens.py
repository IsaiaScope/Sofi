"""Named API token management for the current user."""

from rest_framework.routers import DefaultRouter

from .views import ApiTokenViewSet

router = DefaultRouter()
router.register(r"", ApiTokenViewSet, basename="api_token")

urlpatterns = router.urls

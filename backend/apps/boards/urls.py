from rest_framework.routers import DefaultRouter

from .views import BoardViewSet, ColumnViewSet

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")
router.register(r"columns", ColumnViewSet, basename="column")

urlpatterns = router.urls

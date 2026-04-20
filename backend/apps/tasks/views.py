from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.filter(board__user=self.request.user).select_related("column", "board")
        board = self.request.query_params.get("board")
        if board:
            qs = qs.filter(board=board)
        return qs

    def perform_create(self, serializer):
        # `board` is populated by TaskSerializer.validate — no second fetch.
        board = serializer.validated_data["board"]
        if board.user_id != self.request.user.id:
            raise PermissionDenied("Column is not owned by this user.")
        serializer.save()

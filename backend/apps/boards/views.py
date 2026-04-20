from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Board, Column
from .serializers import BoardSerializer, ColumnSerializer


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer

    def get_queryset(self):
        return Board.objects.filter(user=self.request.user).prefetch_related("columns")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer

    def get_queryset(self):
        qs = Column.objects.filter(board__user=self.request.user)
        board = self.request.query_params.get("board")
        if board:
            qs = qs.filter(board=board)
        return qs

    def perform_create(self, serializer):
        board = serializer.validated_data["board"]
        if board.user_id != self.request.user.id:
            raise PermissionDenied("Board is not owned by this user.")
        serializer.save()

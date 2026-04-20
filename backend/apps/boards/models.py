import uuid

from django.conf import settings
from django.db import models


class Board(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="boards"
    )
    name = models.TextField()
    description = models.TextField(blank=True)
    repo_path = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "created_at")
        indexes = [models.Index(fields=["user"])]

    def __str__(self) -> str:
        return self.name


class Column(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="columns")
    name = models.TextField()
    color = models.CharField(max_length=32, blank=True)
    sort_order = models.IntegerField(default=0)
    is_done_column = models.BooleanField(default=False)

    class Meta:
        ordering = ("sort_order",)
        indexes = [models.Index(fields=["board"])]

    def __str__(self) -> str:
        return f"{self.board.name} / {self.name}"

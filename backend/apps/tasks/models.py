import uuid

from django.db import models

from apps.boards.models import Board, Column


class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name="tasks")
    # `board` is denormalized for efficient per-board queries without joining
    # through `column` — matches the SQL schema from the superseded Postgres spec.
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="tasks")
    title = models.TextField()
    description = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)

    agent_type = models.CharField(max_length=64, blank=True)
    agent_name = models.CharField(max_length=128, blank=True)
    # Stable UUID for `claude --resume` across restarts — survives terminal respawn.
    agent_session_id = models.CharField(max_length=128, blank=True)
    # Transient PTY handle — cleared on terminal exit.
    terminal_session_id = models.CharField(max_length=128, blank=True)

    branch_name = models.TextField(blank=True)
    worktree_path = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    pr_url = models.URLField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "created_at")
        indexes = [
            models.Index(fields=["column"]),
            models.Index(fields=["board"]),
        ]

    def __str__(self) -> str:
        return self.title

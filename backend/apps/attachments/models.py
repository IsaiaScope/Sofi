import uuid

from django.db import models
from django.db.models import CheckConstraint, Q

from apps.tasks.models import Task


class Attachment(models.Model):
    """Three-kind discriminated union — link / text / file.

    The shape-invariant is enforced in two places:
    user-facing errors come from `AttachmentSerializer.validate`; the DB-level
    `CheckConstraint` below is a last-resort guard against rows inserted
    outside DRF (admin, shell, migration back-fills).
    """

    class Kind(models.TextChoices):
        LINK = "link", "Link"
        TEXT = "text", "Text"
        FILE = "file", "File"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    kind = models.CharField(max_length=8, choices=Kind.choices)
    title = models.TextField()

    url = models.URLField(max_length=2000, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="attachments/%Y/%m/", blank=True, null=True)
    content_type = models.CharField(max_length=255, blank=True, null=True)

    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "created_at")
        indexes = [models.Index(fields=["task"])]
        constraints = [
            CheckConstraint(
                name="attachment_kind_fields_match",
                condition=(
                    Q(kind="link", url__isnull=False)
                    | Q(kind="text", content__isnull=False)
                    | Q(kind="file", file__isnull=False, content_type__isnull=False)
                ),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.kind}: {self.title}"

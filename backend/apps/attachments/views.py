from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import Attachment
from .serializers import AttachmentSerializer


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        qs = (
            Attachment.objects.filter(task__board__user=self.request.user)
            .select_related("task__board")
        )
        task_id = self.request.query_params.get("task")
        if task_id:
            return qs.filter(task=task_id)
        # List would otherwise return every attachment the user owns — potentially
        # large file/text payloads. Detail/write actions identify by pk so they're fine.
        if self.action == "list":
            raise ValidationError({"task": "Required query parameter."})
        return qs

    def perform_create(self, serializer):
        task = serializer.validated_data["task"]
        if task.board.user_id != self.request.user.id:
            raise PermissionDenied("Task is not owned by this user.")
        serializer.save()

from rest_framework import serializers

from .models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = (
            "id",
            "task",
            "kind",
            "title",
            "url",
            "content",
            "file",
            "content_type",
            "sort_order",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        kind = attrs.get("kind") or (self.instance and self.instance.kind)
        if kind == Attachment.Kind.LINK and not (attrs.get("url") or (self.instance and self.instance.url)):
            raise serializers.ValidationError({"url": "Required when kind=link"})
        if kind == Attachment.Kind.TEXT and not (attrs.get("content") or (self.instance and self.instance.content)):
            raise serializers.ValidationError({"content": "Required when kind=text"})
        if kind == Attachment.Kind.FILE:
            file_ok = attrs.get("file") or (self.instance and self.instance.file)
            ct_ok = attrs.get("content_type") or (self.instance and self.instance.content_type)
            if not (file_ok and ct_ok):
                raise serializers.ValidationError(
                    {"file": "file + content_type required when kind=file"}
                )
        return attrs

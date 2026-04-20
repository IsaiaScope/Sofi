from django.contrib import admin

from .models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("title", "task", "kind", "created_at")
    list_filter = ("kind",)
    search_fields = ("title", "content")

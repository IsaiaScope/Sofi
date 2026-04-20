from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "board", "column", "status", "agent_type", "updated_at")
    list_filter = ("status", "board")
    search_fields = ("title", "description", "branch_name")

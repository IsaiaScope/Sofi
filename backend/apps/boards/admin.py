from django.contrib import admin

from .models import Board, Column


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "sort_order", "updated_at")
    list_filter = ("user",)
    search_fields = ("name", "description")


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ("name", "board", "sort_order", "is_done_column")
    list_filter = ("board",)

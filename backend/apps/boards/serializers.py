from rest_framework import serializers

from .models import Board, Column


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ("id", "board", "name", "color", "sort_order", "is_done_column")


class BoardSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = (
            "id",
            "name",
            "description",
            "repo_path",
            "sort_order",
            "columns",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "columns", "created_at", "updated_at")

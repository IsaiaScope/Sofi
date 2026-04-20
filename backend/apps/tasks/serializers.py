from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "id",
            "column",
            "board",
            "title",
            "description",
            "sort_order",
            "agent_type",
            "agent_name",
            "agent_session_id",
            "terminal_session_id",
            "branch_name",
            "worktree_path",
            "status",
            "pr_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        # Enforce denormalized board == column.board at write time.
        column = attrs.get("column") or (self.instance and self.instance.column)
        board = attrs.get("board") or (self.instance and self.instance.board)
        if column and board and column.board_id != board.id:
            raise serializers.ValidationError({"board": "Must match column.board."})
        if column and not attrs.get("board"):
            attrs["board"] = column.board
        return attrs

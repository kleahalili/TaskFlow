from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status',
            'due_date', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def validate_due_date(self, value):
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value
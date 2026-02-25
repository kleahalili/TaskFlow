from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Task
from .serializers import TaskSerializer
import django_filters


class TaskFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    due_date_from = django_filters.DateFilter(field_name='due_date', lookup_expr='gte')
    due_date_to = django_filters.DateFilter(field_name='due_date', lookup_expr='lte')

    class Meta:
        model = Task
        fields = ['status', 'due_date_from', 'due_date_to']


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'status']

    def get_queryset(self):
        # Critical: users only see their own tasks
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically assign the logged-in user
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status == 'done':
            return Response(
                {'detail': 'Task is already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        task.status = 'done'
        task.completed_at = timezone.now()
        task.save()
        return Response(TaskSerializer(task).data)
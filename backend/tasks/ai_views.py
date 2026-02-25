from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Task
import httpx
import os


class AITaskSuggestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        task_id = request.data.get('task_id')

        if not task_id:
            return Response(
                {'detail': 'task_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Make sure the task belongs to the requesting user
        try:
            task = Task.objects.get(id=task_id, user=request.user)
        except Task.DoesNotExist:
            return Response(
                {'detail': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            return Response(
                {'detail': 'AI service is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        prompt = f"""You are a productivity assistant helping a user manage their tasks.

Task title: {task.title}
Description: {task.description or 'No description provided'}
Status: {task.status}
Due date: {task.due_date or 'No due date set'}

Break this task down into 3-5 concrete, actionable subtasks the user can follow to complete it.
Be specific and practical. Format your response as a simple numbered list."""

        try:
            response = httpx.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'mistralai/mistral-7b-instruct:free',
                    'messages': [
                        {'role': 'user', 'content': prompt}
                    ],
                    'max_tokens': 500,
                },
                timeout=30.0
            )

            if response.status_code == 429:
                return Response(
                    {'detail': 'AI service rate limit reached. Please try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            if response.status_code != 200:
                return Response(
                    {'detail': 'AI service is currently unavailable.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            data = response.json()
            suggestion = data['choices'][0]['message']['content']

            return Response({'suggestion': suggestion})

        except httpx.TimeoutException:
            return Response(
                {'detail': 'AI service timed out. Please try again.'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except Exception:
            return Response(
                {'detail': 'An unexpected error occurred.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
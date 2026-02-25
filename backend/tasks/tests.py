from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from .models import Task


class AuthTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_register(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_login_returns_tokens(self):
        response = self.client.post('/api/auth/token/', {
            'username': 'testuser',
            'password': 'testpass123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh(self):
        
        response = self.client.post('/api/auth/token/', {
            'username': 'testuser',
            'password': 'testpass123'
        }, format='json')
        refresh_token = response.data['refresh']

   
        response = self.client.post('/api/auth/token/refresh/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_unauthenticated_request_returns_401(self):
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TaskAccessControlTests(TestCase):

    def setUp(self):
        self.client = APIClient()

 
        self.user_a = User.objects.create_user(
            username='user_a',
            password='pass_a_123'
        )
        self.user_b = User.objects.create_user(
            username='user_b',
            password='pass_b_123'
        )

        
        self.task_a = Task.objects.create(
            user=self.user_a,
            title='User A task',
            status='todo'
        )

    def test_user_cannot_see_other_users_tasks(self):
      
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertEqual(response.data['count'], 0)

    def test_user_cannot_access_other_users_task_by_id(self):

        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(f'/api/tasks/{self.task_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_see_own_tasks(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)


class TaskCRUDTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_task(self):
        response = self.client.post('/api/tasks/', {
            'title': 'New task',
            'description': 'Some description',
            'status': 'todo'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New task')

    def test_list_tasks(self):
        Task.objects.create(user=self.user, title='Task 1', status='todo')
        Task.objects.create(user=self.user, title='Task 2', status='in_progress')
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_update_task(self):
        task = Task.objects.create(user=self.user, title='Old title', status='todo')
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'title': 'Updated title'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated title')

    def test_delete_task(self):
        task = Task.objects.create(user=self.user, title='To delete', status='todo')
        response = self.client.delete(f'/api/tasks/{task.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_complete_action(self):
        task = Task.objects.create(user=self.user, title='Finish me', status='todo')
        response = self.client.post(f'/api/tasks/{task.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'done')
        self.assertIsNotNone(response.data['completed_at'])

    def test_complete_already_done_task(self):
        task = Task.objects.create(user=self.user, title='Already done', status='done')
        response = self.client.post(f'/api/tasks/{task.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
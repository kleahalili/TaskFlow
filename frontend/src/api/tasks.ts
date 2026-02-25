import api from './axios'

export interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface TaskFilters {
  status?: string
  search?: string
  due_date_from?: string
  due_date_to?: string
  page?: number
  ordering?: string
}

export async function fetchTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
  const params: Record<string, string | number> = {}
  if (filters.status) params.status = filters.status
  if (filters.search) params.search = filters.search
  if (filters.due_date_from) params.due_date_from = filters.due_date_from
  if (filters.due_date_to) params.due_date_to = filters.due_date_to
  if (filters.page) params.page = filters.page
  if (filters.ordering) params.ordering = filters.ordering
  const res = await api.get<PaginatedResponse<Task>>('/tasks/', { params })
  return res.data
}

export async function fetchTask(id: number): Promise<Task> {
  const res = await api.get<Task>(`/tasks/${id}/`)
  return res.data
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const res = await api.post<Task>('/tasks/', data)
  return res.data
}

export async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${id}/`, data)
  return res.data
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}/`)
}

export async function completeTask(id: number): Promise<Task> {
  const res = await api.post<Task>(`/tasks/${id}/complete/`)
  return res.data
}

export async function suggestSubtasks(taskId: number): Promise<{ suggestion: string }> {
  const res = await api.post<{ suggestion: string }>('/ai/suggest/', { task_id: taskId })
  return res.data
}

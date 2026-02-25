import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import {
  fetchTasks as apiFetchTasks,
  fetchTask as apiFetchTask,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  completeTask as apiCompleteTask,
} from '../api/tasks'
import type { Task, TaskFilters } from '../api/tasks'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filters = reactive<TaskFilters>({
    status: '',
    search: '',
    due_date_from: '',
    due_date_to: '',
    page: 1,
    ordering: '-created_at',
  })

  function initFiltersFromRoute(route: RouteLocationNormalizedLoaded) {
    const q = route.query
    filters.status = (q.status as string) || ''
    filters.search = (q.search as string) || ''
    filters.due_date_from = (q.due_date_from as string) || ''
    filters.due_date_to = (q.due_date_to as string) || ''
    filters.page = q.page ? parseInt(q.page as string) : 1
    filters.ordering = (q.ordering as string) || '-created_at'
  }

  function syncFilters(router: Router) {
    const query: Record<string, string> = {}
    if (filters.status) query.status = filters.status
    if (filters.search) query.search = filters.search
    if (filters.due_date_from) query.due_date_from = filters.due_date_from
    if (filters.due_date_to) query.due_date_to = filters.due_date_to
    if (filters.page && filters.page > 1) query.page = String(filters.page)
    if (filters.ordering && filters.ordering !== '-created_at') query.ordering = filters.ordering
    router.replace({ query })
  }

  async function fetchTasks() {
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchTasks({
        status: filters.status || undefined,
        search: filters.search || undefined,
        due_date_from: filters.due_date_from || undefined,
        due_date_to: filters.due_date_to || undefined,
        page: filters.page,
        ordering: filters.ordering || undefined,
      })
      tasks.value = res.results
      total.value = res.count
    } catch (e: unknown) {
      error.value = 'Failed to load tasks.'
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentTask(id: number) {
    loading.value = true
    error.value = null
    try {
      currentTask.value = await apiFetchTask(id)
    } catch {
      error.value = 'Failed to load task.'
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: Partial<Task>): Promise<Task> {
    const task = await apiCreateTask(data)
    await fetchTasks()
    return task
  }

  async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const task = await apiUpdateTask(id, data)
    // Update in-place if present in list
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = task
    if (currentTask.value?.id === id) currentTask.value = task
    return task
  }

  async function deleteTask(id: number): Promise<void> {
    await apiDeleteTask(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  async function completeTask(id: number): Promise<Task> {
    const task = await apiCompleteTask(id)
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = task
    if (currentTask.value?.id === id) currentTask.value = task
    return task
  }

  function resetFilters() {
    filters.status = ''
    filters.search = ''
    filters.due_date_from = ''
    filters.due_date_to = ''
    filters.page = 1
    filters.ordering = '-created_at'
  }

  return {
    tasks,
    currentTask,
    total,
    loading,
    error,
    filters,
    initFiltersFromRoute,
    syncFilters,
    fetchTasks,
    fetchCurrentTask,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    resetFilters,
  }
})

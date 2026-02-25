<template>
  <div class="page-container">
    <!-- Toolbar / Filters -->
    <Toolbar style="margin-bottom: 1.25rem; border-radius: 8px;">
      <template #start>
        <span style="font-size: 1.25rem; font-weight: 600;">My Tasks</span>
      </template>
      <template #end>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="taskStore.filters.search"
              placeholder="Search tasks..."
              @input="onFilterChange"
              style="min-width: 180px;"
            />
          </IconField>

          <Select
            v-model="taskStore.filters.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All statuses"
            @change="onFilterChange"
            style="min-width: 150px;"
          />

          <DatePicker
            v-model="dueDateFrom"
            placeholder="Due from"
            dateFormat="yy-mm-dd"
            @date-select="onDateChange"
            showButtonBar
            style="min-width: 140px;"
          />

          <DatePicker
            v-model="dueDateTo"
            placeholder="Due to"
            dateFormat="yy-mm-dd"
            @date-select="onDateChange"
            showButtonBar
            style="min-width: 140px;"
          />

          <Button
            icon="pi pi-plus"
            label="New Task"
            @click="openCreateDialog"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Task List -->
    <div v-if="taskStore.loading" style="display: flex; justify-content: center; padding: 3rem;">
      <ProgressSpinner />
    </div>

    <Message v-else-if="taskStore.error" severity="error" :closable="false">
      {{ taskStore.error }}
    </Message>

    <div v-else-if="taskStore.tasks.length === 0" style="text-align: center; padding: 3rem;">
      <i class="pi pi-inbox" style="font-size: 3rem; color: var(--p-text-muted-color);"></i>
      <p style="color: var(--p-text-muted-color); margin-top: 1rem;">No tasks found. Create your first task!</p>
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
      <Card
        v-for="task in taskStore.tasks"
        :key="task.id"
        style="cursor: pointer;"
        @click="goToTask(task.id)"
      >
        <template #content>
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-weight: 600; font-size: 1rem;">{{ task.title }}</span>
                <Tag :value="statusLabel(task.status)" :severity="statusSeverity(task.status)" />
              </div>
              <p
                v-if="task.description"
                style="margin: 0.25rem 0 0; color: var(--p-text-muted-color); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
              >
                {{ task.description }}
              </p>
              <small v-if="task.due_date" style="color: var(--p-text-muted-color);">
                Due: {{ task.due_date }}
              </small>
            </div>

            <div style="display: flex; gap: 0.5rem;" @click.stop>
              <Button
                v-if="task.status !== 'done'"
                icon="pi pi-check"
                severity="success"
                size="small"
                text
                v-tooltip.top="'Mark complete'"
                @click="handleComplete(task.id)"
              />
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                size="small"
                text
                v-tooltip.top="'Edit'"
                @click="openEditDialog(task.id)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                text
                v-tooltip.top="'Delete'"
                @click="handleDelete(task.id)"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Paginator -->
    <Paginator
      v-if="taskStore.total > pageSize"
      :rows="pageSize"
      :totalRecords="taskStore.total"
      :first="(taskStore.filters.page! - 1) * pageSize"
      @page="onPageChange"
      style="margin-top: 1.5rem;"
    />

    <!-- Task Form Dialog -->
    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task-id="editingTaskId"
      @success="onTaskSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Paginator from 'primevue/paginator'
import TaskFormDialog from '../components/TaskFormDialog.vue'
import { useTaskStore } from '../stores/tasks'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const taskStore = useTaskStore()

const pageSize = 10
const dialogVisible = ref(false)
const editingTaskId = ref<number | null>(null)

// Local date pickers (Date objects) mapped to filter strings
const dueDateFrom = ref<Date | null>(null)
const dueDateTo = ref<Date | null>(null)

const statusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

function statusLabel(s: string): string {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] ?? s
}

function statusSeverity(s: string): string {
  return { todo: 'secondary', in_progress: 'warn', done: 'success' }[s] ?? 'secondary'
}

function formatDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function onDateChange() {
  taskStore.filters.due_date_from = formatDate(dueDateFrom.value)
  taskStore.filters.due_date_to = formatDate(dueDateTo.value)
  taskStore.filters.page = 1
  taskStore.syncFilters(router)
  taskStore.fetchTasks()
}

function onFilterChange() {
  taskStore.filters.page = 1
  taskStore.syncFilters(router)
  taskStore.fetchTasks()
}

function onPageChange(event: { page: number }) {
  taskStore.filters.page = event.page + 1
  taskStore.syncFilters(router)
  taskStore.fetchTasks()
}

function goToTask(id: number) {
  router.push(`/tasks/${id}`)
}

function openCreateDialog() {
  editingTaskId.value = null
  dialogVisible.value = true
}

function openEditDialog(id: number) {
  editingTaskId.value = id
  dialogVisible.value = true
}

async function handleComplete(id: number) {
  try {
    await taskStore.completeTask(id)
    toast.add({ severity: 'success', summary: 'Done', detail: 'Task marked as complete.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not complete task.', life: 3000 })
  }
}

function handleDelete(id: number) {
  confirm.require({
    message: 'Delete this task? This action cannot be undone.',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await taskStore.deleteTask(id)
        toast.add({ severity: 'info', summary: 'Deleted', detail: 'Task removed.', life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete task.', life: 3000 })
      }
    },
  })
}

function onTaskSaved() {
  dialogVisible.value = false
  taskStore.fetchTasks()
  toast.add({ severity: 'success', summary: 'Saved', detail: 'Task saved successfully.', life: 3000 })
}

// Debounce search input to avoid too many API calls
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => taskStore.filters.search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    taskStore.filters.page = 1
    taskStore.syncFilters(router)
    taskStore.fetchTasks()
  }, 400)
})

onMounted(() => {
  taskStore.initFiltersFromRoute(route)
  // Restore date pickers from route
  if (taskStore.filters.due_date_from) dueDateFrom.value = new Date(taskStore.filters.due_date_from)
  if (taskStore.filters.due_date_to) dueDateTo.value = new Date(taskStore.filters.due_date_to)
  taskStore.fetchTasks()
})
</script>

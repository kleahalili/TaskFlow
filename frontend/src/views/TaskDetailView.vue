<template>
  <div class="page-container">
    <Button
      icon="pi pi-arrow-left"
      label="Back to Dashboard"
      text
      @click="router.push('/')"
      style="margin-bottom: 1rem;"
    />

    <div v-if="taskStore.loading" style="display: flex; justify-content: center; padding: 3rem;">
      <ProgressSpinner />
    </div>

    <Message v-else-if="taskStore.error" severity="error" :closable="false">
      {{ taskStore.error }}
    </Message>

    <template v-else-if="task">
      <Card>
        <template #title>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
            <span style="font-size: 1.5rem; font-weight: 700;">{{ task.title }}</span>

            <!-- Inline status editing -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <template v-if="editingStatus">
                <Select
                  v-model="inlineStatus"
                  :options="statusOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="saveInlineStatus"
                  style="min-width: 140px;"
                  autofocus
                />
                <Button icon="pi pi-times" text size="small" @click="cancelStatusEdit" />
              </template>
              <Tag
                v-else
                :value="statusLabel(task.status)"
                :severity="statusSeverity(task.status)"
                style="cursor: pointer; font-size: 0.95rem; padding: 0.4rem 0.8rem;"
                v-tooltip.top="'Click to change status'"
                @click="startStatusEdit"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div v-if="task.description">
              <h4 style="margin: 0 0 0.25rem; color: var(--p-text-muted-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Description</h4>
              <p style="margin: 0; white-space: pre-wrap;">{{ task.description }}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
              <div v-if="task.due_date">
                <h4 style="margin: 0 0 0.25rem; color: var(--p-text-muted-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</h4>
                <span>{{ task.due_date }}</span>
              </div>
              <div v-if="task.completed_at">
                <h4 style="margin: 0 0 0.25rem; color: var(--p-text-muted-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Completed At</h4>
                <span>{{ formatDateTime(task.completed_at) }}</span>
              </div>
              <div>
                <h4 style="margin: 0 0 0.25rem; color: var(--p-text-muted-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Created</h4>
                <span>{{ formatDateTime(task.created_at) }}</span>
              </div>
              <div>
                <h4 style="margin: 0 0 0.25rem; color: var(--p-text-muted-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Updated</h4>
                <span>{{ formatDateTime(task.updated_at) }}</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; border-top: 1px solid var(--p-content-border-color); padding-top: 1rem;">
              <Button
                v-if="task.status !== 'done'"
                icon="pi pi-check"
                label="Mark Complete"
                severity="success"
                @click="handleComplete"
              />
              <Button
                icon="pi pi-pencil"
                label="Edit"
                severity="secondary"
                outlined
                @click="openEditDialog"
              />
              <Button
                icon="pi pi-sparkles"
                label="Get AI Suggestions"
                severity="secondary"
                outlined
                @click="aiDrawerVisible = true"
              />
              <Button
                icon="pi pi-trash"
                label="Delete"
                severity="danger"
                outlined
                @click="handleDelete"
              />
            </div>
          </div>
        </template>
      </Card>
    </template>

    <!-- Edit Dialog -->
    <TaskFormDialog
      v-model:visible="dialogVisible"
      :task-id="task?.id ?? null"
      @success="onTaskSaved"
    />

    <!-- AI Drawer -->
    <AIAssistantDrawer
      v-model:visible="aiDrawerVisible"
      :task="task"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import TaskFormDialog from '../components/TaskFormDialog.vue'
import AIAssistantDrawer from '../components/AIAssistantDrawer.vue'
import { useTaskStore } from '../stores/tasks'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const taskStore = useTaskStore()

const dialogVisible = ref(false)
const aiDrawerVisible = ref(false)
const editingStatus = ref(false)
const inlineStatus = ref('')

const task = computed(() => taskStore.currentTask)

const statusOptions = [
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

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString()
}

function startStatusEdit() {
  inlineStatus.value = task.value?.status ?? 'todo'
  editingStatus.value = true
}

function cancelStatusEdit() {
  editingStatus.value = false
}

async function saveInlineStatus() {
  if (!task.value) return
  try {
    await taskStore.updateTask(task.value.id, { status: inlineStatus.value as 'todo' | 'in_progress' | 'done' })
    editingStatus.value = false
    toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated.', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status.', life: 3000 })
  }
}

async function handleComplete() {
  if (!task.value) return
  try {
    await taskStore.completeTask(task.value.id)
    toast.add({ severity: 'success', summary: 'Done', detail: 'Task marked as complete.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not complete task.', life: 3000 })
  }
}

function openEditDialog() {
  dialogVisible.value = true
}

function onTaskSaved() {
  dialogVisible.value = false
  const id = parseInt(route.params.id as string)
  taskStore.fetchCurrentTask(id)
  toast.add({ severity: 'success', summary: 'Saved', detail: 'Task updated.', life: 3000 })
}

function handleDelete() {
  confirm.require({
    message: 'Delete this task? This action cannot be undone.',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await taskStore.deleteTask(task.value!.id)
        toast.add({ severity: 'info', summary: 'Deleted', detail: 'Task removed.', life: 2000 })
        router.push('/')
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete task.', life: 3000 })
      }
    },
  })
}

onMounted(() => {
  const id = parseInt(route.params.id as string)
  taskStore.fetchCurrentTask(id)
})
</script>

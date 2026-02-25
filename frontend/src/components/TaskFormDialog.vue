<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="isEditing ? 'Edit Task' : 'New Task'"
    :style="{ width: '520px' }"
    :modal="true"
    :draggable="false"
  >
    <form @submit.prevent="handleSubmit" class="form-group" style="gap: 1.5rem; padding-top: 0.5rem;">
      <Message v-if="errorMessage" severity="error" :closable="false">
        {{ errorMessage }}
      </Message>

      <FloatLabel>
        <InputText
          id="title"
          v-model="form.title"
          style="width: 100%;"
          :invalid="!!errors.title"
          autofocus
        />
        <label for="title">Title *</label>
      </FloatLabel>
      <small v-if="errors.title" class="p-error">{{ errors.title }}</small>

      <FloatLabel>
        <Textarea
          id="description"
          v-model="form.description"
          rows="3"
          style="width: 100%; resize: vertical;"
        />
        <label for="description">Description</label>
      </FloatLabel>

      <FloatLabel>
        <Select
          id="status"
          v-model="form.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          style="width: 100%;"
        />
        <label for="status">Status</label>
      </FloatLabel>

      <FloatLabel>
        <DatePicker
          id="due_date"
          v-model="dueDatePicker"
          dateFormat="yy-mm-dd"
          showButtonBar
          style="width: 100%;"
          inputStyle="width: 100%"
          :minDate="new Date()"
        />
        <label for="due_date">Due Date</label>
      </FloatLabel>
      <small v-if="errors.due_date" class="p-error">{{ errors.due_date }}</small>
    </form>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="emit('update:visible', false)"
      />
      <Button
        :label="isEditing ? 'Save Changes' : 'Create Task'"
        :loading="loading"
        :disabled="loading"
        @click="handleSubmit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import Message from 'primevue/message'
import { useTaskStore } from '../stores/tasks'
import type { Task } from '../api/tasks'

const props = defineProps<{
  visible: boolean
  taskId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'success'): void
}>()

const taskStore = useTaskStore()
const loading = ref(false)
const errorMessage = ref('')
const dueDatePicker = ref<Date | null>(null)

const isEditing = computed(() => props.taskId !== null)

const form = reactive({
  title: '',
  description: '',
  status: 'todo' as Task['status'],
})

const errors = reactive({
  title: '',
  due_date: '',
})

const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

function resetForm() {
  form.title = ''
  form.description = ''
  form.status = 'todo'
  dueDatePicker.value = null
  errors.title = ''
  errors.due_date = ''
  errorMessage.value = ''
}

watch(
  () => props.visible,
  async (isOpen) => {
    if (!isOpen) return
    resetForm()
    if (props.taskId) {
      // Load existing task
      const existing = taskStore.tasks.find((t) => t.id === props.taskId)
        ?? taskStore.currentTask
      if (existing && existing.id === props.taskId) {
        form.title = existing.title
        form.description = existing.description
        form.status = existing.status
        dueDatePicker.value = existing.due_date ? new Date(existing.due_date) : null
      }
    }
  }
)

function formatDate(d: Date | null): string | null {
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function validate(): boolean {
  errors.title = ''
  errors.due_date = ''
  let valid = true
  if (!form.title.trim()) {
    errors.title = 'Title is required.'
    valid = false
  }
  return valid
}

async function handleSubmit() {
  errorMessage.value = ''
  if (!validate()) return
  loading.value = true
  try {
    const payload: Partial<Task> = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      due_date: formatDate(dueDatePicker.value),
    }
    if (isEditing.value && props.taskId) {
      await taskStore.updateTask(props.taskId, payload)
    } else {
      await taskStore.createTask(payload)
    }
    emit('success')
  } catch (e: unknown) {
    const err = e as { response?: { data?: Record<string, string[]> } }
    const data = err?.response?.data
    if (data) {
      if (data.due_date) errors.due_date = data.due_date[0]
      const msgs = Object.values(data).flat().join(' ')
      errorMessage.value = msgs || 'Failed to save task.'
    } else {
      errorMessage.value = 'Failed to save task. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

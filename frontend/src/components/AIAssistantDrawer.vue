<template>
  <Drawer
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    position="right"
    :style="{ width: '420px' }"
    header="AI Task Assistant"
  >
    <div v-if="task" style="display: flex; flex-direction: column; gap: 1rem; height: 100%;">
      <p style="margin: 0; color: var(--p-text-muted-color); font-size: 0.875rem;">
        Getting subtask suggestions for:
      </p>
      <p style="margin: 0; font-weight: 600;">{{ task.title }}</p>

      <!-- Loading -->
      <div v-if="loading" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem 0;">
        <ProgressSpinner />
        <p style="margin: 0; color: var(--p-text-muted-color);">Generating suggestions...</p>
      </div>

      <!-- Error -->
      <Message v-else-if="errorMessage" severity="error" :closable="false">
        {{ errorMessage }}
      </Message>

      <!-- Result -->
      <Panel v-else-if="suggestion" header="Suggested Subtasks">
        <div style="white-space: pre-wrap; line-height: 1.7;">{{ suggestion }}</div>
      </Panel>

      <!-- Empty state before first fetch -->
      <div v-else style="text-align: center; padding: 2rem 0; color: var(--p-text-muted-color);">
        <i class="pi pi-sparkles" style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;"></i>
        <p style="margin: 0;">Click the button below to generate AI-powered subtask suggestions.</p>
      </div>

      <!-- Actions -->
      <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--p-content-border-color);">
        <Button
          :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'"
          :label="suggestion ? 'Regenerate Suggestions' : 'Get Suggestions'"
          :loading="loading"
          :disabled="loading"
          style="width: 100%;"
          @click="fetchSuggestions"
        />
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { suggestSubtasks } from '../api/tasks'
import type { Task } from '../api/tasks'

const props = defineProps<{
  visible: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const loading = ref(false)
const suggestion = ref('')
const errorMessage = ref('')

// Auto-fetch when drawer opens
watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen && props.task && !suggestion.value) {
      fetchSuggestions()
    }
    if (!isOpen) {
      // Reset when closed so next open starts fresh
      suggestion.value = ''
      errorMessage.value = ''
    }
  }
)

async function fetchSuggestions() {
  if (!props.task) return
  loading.value = true
  errorMessage.value = ''
  suggestion.value = ''
  try {
    const res = await suggestSubtasks(props.task.id)
    suggestion.value = res.suggestion
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { detail?: string } } }
    const status = err?.response?.status
    if (status === 429) {
      errorMessage.value = 'Rate limit reached. Please try again in a moment.'
    } else if (status === 503) {
      errorMessage.value = 'AI service is currently unavailable.'
    } else if (status === 504) {
      errorMessage.value = 'Request timed out. Please try again.'
    } else {
      errorMessage.value = err?.response?.data?.detail ?? 'An unexpected error occurred.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <Card>
        <template #title>
          <div style="text-align: center; margin-bottom: 0.5rem;">
            <span style="font-size: 1.5rem; font-weight: 700;">TaskFlow</span>
            <p style="font-size: 0.9rem; color: var(--p-text-muted-color); margin: 0.25rem 0 0;">Sign in to your account</p>
          </div>
        </template>
        <template #content>
          <form @submit.prevent="handleSubmit" class="form-group">
            <Message v-if="errorMessage" severity="error" :closable="false">
              {{ errorMessage }}
            </Message>

            <FloatLabel>
              <InputText
                id="username"
                v-model="username"
                autocomplete="username"
                style="width: 100%;"
                :invalid="!!usernameError"
              />
              <label for="username">Username</label>
            </FloatLabel>
            <small v-if="usernameError" class="p-error">{{ usernameError }}</small>

            <FloatLabel>
              <Password
                id="password"
                v-model="password"
                :feedback="false"
                toggleMask
                style="width: 100%;"
                :invalid="!!passwordError"
                inputStyle="width: 100%"
              />
              <label for="password">Password</label>
            </FloatLabel>
            <small v-if="passwordError" class="p-error">{{ passwordError }}</small>

            <Button
              type="submit"
              label="Sign In"
              :loading="loading"
              :disabled="loading"
              style="width: 100%; margin-top: 0.5rem;"
            />

            <p style="text-align: center; margin: 0; font-size: 0.875rem;">
              Don't have an account?
              <router-link to="/register">Register</router-link>
            </p>
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const usernameError = ref('')
const passwordError = ref('')

function validate(): boolean {
  usernameError.value = ''
  passwordError.value = ''
  let valid = true
  if (!username.value.trim()) {
    usernameError.value = 'Username is required.'
    valid = false
  }
  if (!password.value) {
    passwordError.value = 'Password is required.'
    valid = false
  }
  return valid
}

async function handleSubmit() {
  errorMessage.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await authStore.login(username.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } } }
    errorMessage.value = err?.response?.data?.detail ?? 'Invalid credentials. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

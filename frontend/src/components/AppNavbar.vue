<template>
  <Toolbar style="border-radius: 0; border-left: none; border-right: none; border-top: none; position: sticky; top: 0; z-index: 100;">
    <template #start>
      <router-link to="/" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem;">
        <i class="pi pi-check-square" style="font-size: 1.4rem; color: var(--p-primary-color);"></i>
        <span style="font-size: 1.1rem; font-weight: 700;">TaskFlow</span>
      </router-link>
    </template>
    <template #end>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 0.875rem; color: var(--p-text-muted-color);">
          <i class="pi pi-user" style="margin-right: 0.25rem;"></i>
          {{ authStore.user?.username }}
        </span>
        <Button
          icon="pi pi-sign-out"
          label="Logout"
          severity="secondary"
          text
          size="small"
          @click="authStore.logout()"
        />
      </div>
    </template>
  </Toolbar>
</template>

<script setup lang="ts">
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <AppNavbar v-if="authStore.accessToken" />
  <router-view />
  <Toast />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth'
import AppNavbar from './components/AppNavbar.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const authStore = useAuthStore()
</script>

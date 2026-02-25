import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Track whether we're currently refreshing to avoid concurrent refresh loops
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Request interceptor: attach access token from auth store (lazy import avoids circular dep)
api.interceptors.request.use(async (config) => {
  const { useAuthStore } = await import('../stores/auth')
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      const { useAuthStore } = await import('../stores/auth')
      useAuthStore().logout()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers = originalRequest.headers ?? {}
        ;(originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const res = await axios.post('/api/auth/token/refresh/', { refresh: refreshToken })
      const newAccessToken: string = res.data.access
      const newRefreshToken: string = res.data.refresh

      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      authStore.accessToken = newAccessToken
      localStorage.setItem('refreshToken', newRefreshToken)

      processQueue(null, newAccessToken)

      originalRequest.headers = originalRequest.headers ?? {}
      ;(originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      const { useAuthStore } = await import('../stores/auth')
      useAuthStore().logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api

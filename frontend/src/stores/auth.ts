import { defineStore } from 'pinia'
import { ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { login as apiLogin, register as apiRegister, refresh as apiRefresh } from '../api/auth'
import router from '../router'

interface JwtPayload {
  username?: string
  user_id?: number
  exp?: number
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<{ username: string } | null>(null)

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    localStorage.setItem('refreshToken', refresh)
    try {
      const decoded = jwtDecode<JwtPayload>(access)
      user.value = { username: decoded.username ?? '' }
    } catch {
      user.value = null
    }
  }

  async function hydrate(): Promise<void> {
    const storedRefresh = localStorage.getItem('refreshToken')
    if (!storedRefresh) return
    try {
      const tokens = await apiRefresh(storedRefresh)
      setTokens(tokens.access, tokens.refresh)
    } catch {
      logout()
    }
  }

  async function login(username: string, password: string): Promise<void> {
    const tokens = await apiLogin(username, password)
    setTokens(tokens.access, tokens.refresh)
  }

  async function register(username: string, password: string): Promise<void> {
    await apiRegister(username, password)
    await login(username, password)
  }

  function logout(): void {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('refreshToken')
    router.push('/login')
  }

  return { accessToken, user, hydrate, login, register, logout }
})

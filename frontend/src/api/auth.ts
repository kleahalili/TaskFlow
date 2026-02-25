import axios from 'axios'

const authApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export interface TokenPair {
  access: string
  refresh: string
}

export interface UserInfo {
  username: string
}

export async function login(username: string, password: string): Promise<TokenPair> {
  const res = await authApi.post<TokenPair>('/auth/token/', { username, password })
  return res.data
}

export async function register(username: string, password: string): Promise<UserInfo> {
  const res = await authApi.post<UserInfo>('/auth/register/', { username, password })
  return res.data
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const res = await authApi.post<TokenPair>('/auth/token/refresh/', { refresh: refreshToken })
  return res.data
}

import { apiClient } from './apiClient'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: {
    id: string
    name: string
    username: string
  }
  message?: string
}

export interface User {
  id: string
  name: string
  username: string
  email?: string
  is_active: boolean
  role?: string
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    console.log('[Auth] Login response:', response)

    if (!response.success || !response.token) {
      throw new Error(response.message || 'Login failed')
    }

    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    console.log('[Auth] Token set in localStorage')

    return response
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token')
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    return null
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export const authService = new AuthService()
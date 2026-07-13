import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { DEV_AUTH_DISABLED } from '../config/auth'

let isRedirectingToLogin = false
let isRedirectingToConnectionError = false

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token')
      config.headers = config.headers || {}
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn(`[API] Request to ${config.url} with NO token — localStorage token is missing!`)
        const allKeys = []
        for (let i = 0; i < localStorage.length; i++) { allKeys.push(localStorage.key(i)) }
        console.warn(`[API] localStorage keys: ${allKeys.join(', ') || '(empty)'}`)
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (!DEV_AUTH_DISABLED) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            if (!isRedirectingToLogin && !window.location.pathname.startsWith('/login')) {
              isRedirectingToLogin = true
              window.location.href = '/login'
              setTimeout(() => { isRedirectingToLogin = false }, 2000)
            }
          }
        } else if (!error.response && error.code !== 'ERR_CANCELED') {
          // Network error — server unreachable, DNS failure, timeout, etc.
          // In dev mode skip the redirect so the UI remains navigable without a running backend
          if (!DEV_AUTH_DISABLED && !isRedirectingToConnectionError && !window.location.pathname.startsWith('/connection-error')) {
            isRedirectingToConnectionError = true
            window.location.href = '/connection-error'
            setTimeout(() => { isRedirectingToConnectionError = false }, 5000)
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }

  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers || {}),
      },
    })
    return response.data
  }

  async uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (percentage: number) => void,
    signal?: AbortSignal
  ): Promise<unknown> {
    const response = await this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large uploads
      signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress?.(percentage)
        }
      },
    })
    return response.data
  }

  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'blob',
    })
    return response.data
  }

  async getArrayBuffer(url: string, config?: AxiosRequestConfig): Promise<ArrayBuffer> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'arraybuffer',
    })
    return response.data
  }
}

export const apiClient = new ApiClient()

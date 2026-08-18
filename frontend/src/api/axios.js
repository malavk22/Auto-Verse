import axios from 'axios'

export const TOKEN_KEY = 'autoverse_token'

const api = axios.create({
  // Falls back to the relative path in local dev (Vite's proxy handles it).
  // Production needs the real backend URL via VITE_API_BASE_URL instead.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // Without this, a hung request never resolves or rejects - just sits
  // pending forever, which a few pages' `.catch(() => {})` can't recover from.
  timeout: 15000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new CustomEvent('auth:required'))
    }
    return Promise.reject(error)
  }
)

export default api

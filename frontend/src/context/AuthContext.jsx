import { createContext, useContext, useState, useEffect } from 'react'
import { TOKEN_KEY } from '../api/axios'
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (!token) { setUser(null); return }
    getMe().then(setUser).catch(() => { setToken(null); setUser(null) })
  }, [token])

  useEffect(() => {
    const openModal = () => setAuthModalOpen(true)
    window.addEventListener('auth:required', openModal)
    return () => window.removeEventListener('auth:required', openModal)
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setToken(data.access_token)
    setAuthModalOpen(false)
  }

  const register = async (username, email, password) => {
    const data = await apiRegister(username, email, password)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setToken(data.access_token)
    setAuthModalOpen(false)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!token,
      login, register, logout,
      authModalOpen, openAuthModal: () => setAuthModalOpen(true), closeAuthModal: () => setAuthModalOpen(false),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

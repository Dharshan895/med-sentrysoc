import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, User } from '../api/client'

interface AuthCtx {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('medidoc_token')
    const u = localStorage.getItem('medidoc_user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    localStorage.setItem('medidoc_token', res.access_token)
    localStorage.setItem('medidoc_user', JSON.stringify(res.user))
    setToken(res.access_token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('medidoc_token')
    localStorage.removeItem('medidoc_user')
    setToken(null)
    setUser(null)
  }, [])

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

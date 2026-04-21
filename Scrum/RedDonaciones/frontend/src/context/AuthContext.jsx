import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

const USER_KEY = 'auth_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setTokenState] = useState(() => getToken())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    writeStoredUser(user)
  }, [user])

  const applySession = useCallback((nextUser, nextToken) => {
    setUser(nextUser)
    setTokenState(nextToken)
    setToken(nextToken)
  }, [])

  const login = useCallback(async ({ correo, password }) => {
    setLoading(true)
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: { correo, password },
      })
      applySession(data.usuario, data.token)
      return data.usuario
    } finally {
      setLoading(false)
    }
  }, [applySession])

  const register = useCallback(async (payload) => {
    setLoading(true)
    try {
      const data = await apiRequest('/usuarios', {
        method: 'POST',
        body: payload,
      })
      applySession(data.usuario, data.token)
      return data.usuario
    } finally {
      setLoading(false)
    }
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      if (getToken()) {
        await apiRequest('/logout', { method: 'POST', auth: true })
      }
    } catch {
      /* ignore network errors al invalidar token */
    } finally {
      applySession(null, null)
    }
  }, [applySession])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}

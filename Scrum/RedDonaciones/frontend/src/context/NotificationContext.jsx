import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const NotificationContext = createContext(null)

const AUTO_DISMISS_MS = 5000

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const entry = { id, message, type }
      setNotifications((prev) => [...prev, entry])

      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const api = {
    notifications,
    notify,
    dismiss,
    success: (message) => notify(message, 'success'),
    error: (message) => notify(message, 'error'),
    warning: (message) => notify(message, 'warning'),
    info: (message) => notify(message, 'info'),
  }

  return (
    <NotificationContext.Provider value={api}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  }
  return ctx
}

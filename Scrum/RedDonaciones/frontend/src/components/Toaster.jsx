import React from 'react'
import { useNotifications } from '../context/NotificationContext'

export default function Toaster() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="toaster" role="region" aria-live="polite" aria-label="Notificaciones">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast-${n.type}`} role="status">
          <span className="toast-message">{n.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(n.id)}
            aria-label="Cerrar notificacion"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

import React from 'react'

export default function ErrorView({ message, onRetry }) {
  return (
    <div className="error-view">
      <div className="error-view-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="error-view-msg">{message || 'Ocurrio un error inesperado'}</p>
      {onRetry && (
        <button type="button" className="error-view-retry" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  )
}

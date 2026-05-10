import React from 'react'

export default function Spinner({ message = 'Cargando...' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner-ring" />
      {message && <p className="spinner-msg">{message}</p>}
    </div>
  )
}

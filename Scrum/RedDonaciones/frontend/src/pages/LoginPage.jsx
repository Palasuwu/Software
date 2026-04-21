import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading } = useAuth()
  const notify = useNotifications()

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState({})

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrores = {}
    if (!correo.trim()) nextErrores.correo = 'Correo requerido'
    if (!password) nextErrores.password = 'Contrasena requerida'
    setErrores(nextErrores)
    if (Object.keys(nextErrores).length > 0) {
      notify.warning('Completa los campos requeridos')
      return
    }

    try {
      const usuario = await login({ correo: correo.trim().toLowerCase(), password })
      notify.success(`Bienvenido, ${usuario.nombre}`)
      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      notify.error(error.message || 'No fue posible iniciar sesion')
    }
  }

  return (
    <section className="auth-page fade-in">
      <div className="auth-card">
        <h1 className="auth-title">Iniciar sesion</h1>
        <p className="auth-subtitle">Accede a tu cuenta de Red de Donaciones</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Correo</span>
            <input
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              autoComplete="email"
            />
            {errores.correo && <small className="auth-error">{errores.correo}</small>}
          </label>

          <label className="auth-field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {errores.password && <small className="auth-error">{errores.password}</small>}
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          No tienes cuenta? <Link to="/registro">Registrate</Link>
        </p>
      </div>
    </section>
  )
}

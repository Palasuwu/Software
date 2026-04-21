import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const INITIAL_FORM = {
  nombre: '',
  correo: '',
  telefono: '',
  password: '',
  confirmar: '',
  rol: 'donante',
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validar(form) {
  const errores = {}
  if (!form.nombre.trim()) errores.nombre = 'Nombre requerido'
  if (!form.correo.trim()) errores.correo = 'Correo requerido'
  else if (!EMAIL_RE.test(form.correo.trim())) errores.correo = 'Correo invalido'
  if (!form.telefono.trim()) errores.telefono = 'Telefono requerido'
  if (!form.password) errores.password = 'Password requerido'
  else if (form.password.length < 8) errores.password = 'Minimo 8 caracteres'
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errores.password = 'Debe incluir letras y numeros'
  }
  if (form.confirmar !== form.password) {
    errores.confirmar = 'Las contrasenas no coinciden'
  }
  return errores
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading } = useAuth()
  const notify = useNotifications()

  const [form, setForm] = useState(INITIAL_FORM)
  const [errores, setErrores] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const erroresForm = validar(form)
    setErrores(erroresForm)
    if (Object.keys(erroresForm).length > 0) {
      notify.warning('Revisa los campos del formulario')
      return
    }

    try {
      await register({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        password: form.password,
        rol: form.rol,
      })
      notify.success('Cuenta creada exitosamente')
      navigate('/')
    } catch (error) {
      notify.error(error.message || 'No se pudo crear la cuenta')
    }
  }

  return (
    <section className="auth-page fade-in">
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Registrate para empezar a donar</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Nombre</span>
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              autoComplete="name"
            />
            {errores.nombre && <small className="auth-error">{errores.nombre}</small>}
          </label>

          <label className="auth-field">
            <span>Correo</span>
            <input
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
              autoComplete="email"
            />
            {errores.correo && <small className="auth-error">{errores.correo}</small>}
          </label>

          <label className="auth-field">
            <span>Telefono</span>
            <input
              name="telefono"
              type="tel"
              value={form.telefono}
              onChange={handleChange}
              autoComplete="tel"
            />
            {errores.telefono && <small className="auth-error">{errores.telefono}</small>}
          </label>

          <label className="auth-field">
            <span>Rol</span>
            <select name="rol" value={form.rol} onChange={handleChange}>
              <option value="donante">Donante</option>
              <option value="intermediario">Intermediario</option>
            </select>
          </label>

          <label className="auth-field">
            <span>Contrasena</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errores.password && <small className="auth-error">{errores.password}</small>}
          </label>

          <label className="auth-field">
            <span>Confirmar contrasena</span>
            <input
              name="confirmar"
              type="password"
              value={form.confirmar}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errores.confirmar && <small className="auth-error">{errores.confirmar}</small>}
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </div>
    </section>
  )
}

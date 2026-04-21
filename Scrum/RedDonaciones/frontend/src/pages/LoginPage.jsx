import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { guardarUsuarioSesion } from '../utils/session'

function validateLogin(form) {
    const errors = {}

    const correo = form.correo.trim()
    if (!correo) {
        errors.correo = 'El correo es obligatorio'
    } else if (!/^\S+@\S+\.\S+$/.test(correo)) {
        errors.correo = 'Ingresa un correo valido'
    }

    if (!form.password) {
        errors.password = 'La contrasena es obligatoria'
    }

    return errors
}

export default function LoginPage({ onAuthSuccess }) {
    const navigate = useNavigate()
    const [form, setForm] = useState({ correo: '', password: '' })
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((previous) => ({ ...previous, [name]: value }))
        setApiError('')

        setErrors((previous) => {
            if (!previous[name]) {
                return previous
            }
            const next = { ...previous }
            delete next[name]
            return next
        })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const nextErrors = validateLogin(form)
        setErrors(nextErrors)
        setApiError('')

        if (Object.keys(nextErrors).length > 0) {
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo: form.correo.trim().toLowerCase(),
                    password: form.password
                })
            })

            const body = await response.json().catch(() => null)
            if (!response.ok || !body?.usuario) {
                throw new Error(body?.error || 'No se pudo iniciar sesion')
            }

            guardarUsuarioSesion(body.usuario)
            if (typeof onAuthSuccess === 'function') {
                onAuthSuccess(body.usuario)
            }

            navigate('/perfil', { state: { flash: 'Sesion iniciada con exito' } })
        } catch (error) {
            setApiError(error.message || 'No se pudo iniciar sesion')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="signup-page fade-in">
            <header className="signup-header">
                <h1 className="signup-title">Iniciar sesion</h1>
                <p className="signup-subtitle">
                    Ingresa con tu cuenta para registrar donaciones y ver tu historial.
                </p>
            </header>

            <article className="signup-card">
                <div className="signup-card-head">
                    <h2>Acceso</h2>
                    <p>Si no tienes cuenta, puedes registrarte en segundos.</p>
                </div>

                <form className="form-grid" onSubmit={handleSubmit} noValidate>
                    <div className="form-field">
                        <label className="form-label" htmlFor="correo">Correo</label>
                        <input
                            id="correo"
                            type="email"
                            className={`form-input ${errors.correo ? 'form-input-invalid' : ''}`}
                            name="correo"
                            placeholder="correo@ejemplo.com"
                            value={form.correo}
                            onChange={handleChange}
                        />
                        {errors.correo && <span className="form-error-text">{errors.correo}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="password">Contrasena</label>
                        <input
                            id="password"
                            type="password"
                            className={`form-input ${errors.password ? 'form-input-invalid' : ''}`}
                            name="password"
                            placeholder="Tu contraseña"
                            value={form.password}
                            onChange={handleChange}
                        />
                        {errors.password && <span className="form-error-text">{errors.password}</span>}
                    </div>

                    {apiError && <div className="error-box">{apiError}</div>}

                    <button type="submit" className="btn-confirmar" disabled={isSubmitting}>
                        {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
                    </button>

                    <p className="login-help-text">
                        No tienes cuenta? <Link to="/signup">Registrate aqui</Link>
                    </p>
                </form>
            </article>
        </section>
    )
}

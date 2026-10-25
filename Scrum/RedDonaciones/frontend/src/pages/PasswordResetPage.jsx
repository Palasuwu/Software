// Las dos pantallas de recuperar contrasena. Reusan la estructura y los
// estilos de AuthPage para que se vean como el resto del ingreso.
import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logoMark from '../assets/LogoOwnerMark.svg'
import './AuthPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function Marco({ titulo, subtitulo, children }) {
    return (
        <div className="auth-page">
            <div className="auth-card-simple">
                <div className="auth-form-section">
                    <div className="auth-brand-logo auth-brand-logo-inline">
                        <img src={logoMark} alt="" aria-hidden="true" />
                    </div>
                    <div className="auth-form-heading">
                        <h2>{titulo}</h2>
                        <p>{subtitulo}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}

function Campo({ label, id, error, children }) {
    return (
        <div className="auth-field">
            <label className="auth-label" htmlFor={id}>{label}</label>
            {children}
            {error && <span className="auth-error-text">{error}</span>}
        </div>
    )
}

export function OlvidePasswordPage() {
    const [correo, setCorreo] = useState('')
    const [error, setError] = useState('')
    const [apiError, setApiError] = useState('')
    const [enviado, setEnviado] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const valor = correo.trim()
        setApiError('')

        if (!valor) return setError('El correo es obligatorio')
        if (!EMAIL_REGEX.test(valor)) return setError('Ingresa un correo valido')
        setError('')

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/password/olvide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: valor.toLowerCase() })
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) throw new Error(body?.error || 'No se pudo enviar el correo')
            setEnviado(body?.message || 'Revisa tu correo')
        } catch (err) {
            setApiError(err.message || 'No se pudo enviar el correo')
        } finally {
            setIsSubmitting(false)
        }
    }

    // El mensaje de exito no confirma que el correo exista: se muestra igual
    // en los dos casos, como responde el backend.
    if (enviado) {
        return (
            <Marco titulo="Revisa tu correo" subtitulo={enviado}>
                <p className="auth-hint">
                    El enlace vence en 30 minutos. Si no llega, revisa la carpeta
                    de spam o vuelve a intentarlo en un minuto.
                </p>
                <Link to="/login" className="auth-submit-btn auth-submit-link">
                    Volver al inicio de sesion
                </Link>
            </Marco>
        )
    }

    return (
        <Marco
            titulo="Olvidaste tu contrasena?"
            subtitulo="Escribe tu correo y te enviamos un enlace para crear una nueva."
        >
            <form onSubmit={handleSubmit} noValidate>
                <Campo label="Correo electronico" id="olvide-correo" error={error}>
                    <input
                        id="olvide-correo"
                        type="email"
                        className={`auth-input ${error ? 'auth-input-invalid' : ''}`}
                        name="correo"
                        placeholder="correo@ejemplo.com"
                        value={correo}
                        onChange={(e) => { setCorreo(e.target.value); setError(''); setApiError('') }}
                        autoComplete="email"
                    />
                </Campo>
                {apiError && <div className="auth-api-error">{apiError}</div>}
                <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
                </button>
            </form>
            <p className="auth-hint">
                <Link to="/login" className="auth-link">Volver al inicio de sesion</Link>
            </p>
        </Marco>
    )
}

export function RestablecerPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token') || ''

    const [form, setForm] = useState({ password: '', confirmPassword: '' })
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        setApiError('')
        setErrors({})
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const next = {}
        if (!form.password) next.password = 'La contrasena es obligatoria'
        else if (form.password.length < 8) next.password = 'Minimo 8 caracteres'
        else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
            next.password = 'Incluye letras y numeros'
        }
        if (!form.confirmPassword) next.confirmPassword = 'Confirma tu contrasena'
        else if (form.password !== form.confirmPassword) {
            next.confirmPassword = 'Las contrasenas no coinciden'
        }

        setErrors(next)
        setApiError('')
        if (Object.keys(next).length > 0) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/password/restablecer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: form.password })
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) throw new Error(body?.error || 'No se pudo restablecer la contrasena')
            navigate('/login', {
                replace: true,
                state: { flash: body?.message || 'Contrasena actualizada' }
            })
        } catch (err) {
            setApiError(err.message || 'No se pudo restablecer la contrasena')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!token) {
        return (
            <Marco
                titulo="Enlace incompleto"
                subtitulo="Este enlace no trae el codigo de recuperacion."
            >
                <Link to="/olvide-password" className="auth-submit-btn auth-submit-link">
                    Solicitar uno nuevo
                </Link>
            </Marco>
        )
    }

    return (
        <Marco titulo="Nueva contrasena" subtitulo="Elige una contrasena para tu cuenta.">
            <form onSubmit={handleSubmit} noValidate>
                <Campo label="Nueva contrasena" id="reset-password" error={errors.password}>
                    <input
                        id="reset-password"
                        type="password"
                        className={`auth-input ${errors.password ? 'auth-input-invalid' : ''}`}
                        name="password"
                        placeholder="Minimo 8 caracteres"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                    />
                </Campo>
                <Campo
                    label="Confirmar contrasena"
                    id="reset-confirm"
                    error={errors.confirmPassword}
                >
                    <input
                        id="reset-confirm"
                        type="password"
                        className={`auth-input ${errors.confirmPassword ? 'auth-input-invalid' : ''}`}
                        name="confirmPassword"
                        placeholder="Repite la contrasena"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                    />
                </Campo>
                {apiError && <div className="auth-api-error">{apiError}</div>}
                <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar contrasena'}
                </button>
            </form>
            <p className="auth-hint">
                <Link to="/olvide-password" className="auth-link">
                    El enlace expiro? Solicita uno nuevo
                </Link>
            </p>
        </Marco>
    )
}

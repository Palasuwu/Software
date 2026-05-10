import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { guardarTokenSesion, guardarUsuarioSesion } from '../utils/session'

const INITIAL_LOGIN = { correo: '', password: '' }
const INITIAL_REGISTER = {
    nombre: '', correo: '', telefono: '', password: '', confirmPassword: '',
    rol: 'donante', departamento: '', municipio: '', zona: '',
    direccion_detalle: '', id_organizacion: '', cargo: ''
}

function validateLogin(form) {
    const errors = {}
    const correo = form.correo.trim()
    if (!correo) errors.correo = 'El correo es obligatorio'
    else if (!/^\S+@\S+\.\S+$/.test(correo)) errors.correo = 'Ingresa un correo valido'
    if (!form.password) errors.password = 'La contrasena es obligatoria'
    return errors
}

function validateRegister(form) {
    const errors = {}
    const nombre = form.nombre.trim()
    if (!nombre) errors.nombre = 'El nombre es obligatorio'
    else if (nombre.length < 3) errors.nombre = 'Ingresa al menos 3 caracteres'
    const correo = form.correo.trim()
    if (!correo) errors.correo = 'El correo es obligatorio'
    else if (!/^\S+@\S+\.\S+$/.test(correo)) errors.correo = 'Ingresa un correo valido'
    const telefono = form.telefono.trim()
    if (!telefono) errors.telefono = 'El telefono es obligatorio'
    else if (!/^[0-9\-+()\s]{8,20}$/.test(telefono)) errors.telefono = 'Ingresa un telefono valido'
    if (!form.password) errors.password = 'La contrasena es obligatoria'
    else if (form.password.length < 8) errors.password = 'Minimo 8 caracteres'
    if (!form.confirmPassword) errors.confirmPassword = 'Confirma tu contrasena'
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contrasenas no coinciden'
    if (form.rol !== 'donante' && form.rol !== 'intermediario') errors.rol = 'Selecciona un rol valido'
    if (form.rol === 'donante') {
        if (!form.departamento.trim()) errors.departamento = 'El departamento es obligatorio'
        if (!form.municipio.trim()) errors.municipio = 'El municipio es obligatorio'
        if (!form.zona.trim()) errors.zona = 'La zona es obligatoria'
        if (!form.direccion_detalle.trim()) errors.direccion_detalle = 'La direccion es obligatoria'
    }
    if (form.rol === 'intermediario') {
        if (!form.id_organizacion) errors.id_organizacion = 'Selecciona una organizacion'
        if (!form.cargo.trim()) errors.cargo = 'El cargo es obligatorio'
    }
    return errors
}

function buildPayload(form) {
    const base = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        password: form.password,
        telefono: form.telefono.trim(),
        rol: form.rol
    }
    if (form.rol === 'donante') {
        return { ...base, departamento: form.departamento.trim(), municipio: form.municipio.trim(), zona: form.zona.trim(), direccion_detalle: form.direccion_detalle.trim() }
    }
    return { ...base, id_organizacion: Number(form.id_organizacion), cargo: form.cargo.trim() }
}

function BrandPanel({ isRegister, isTransitioning, onSwitchTo }) {
    return (
        <div className="auth-brand">
            <div className="auth-brand-inner">
                <div className="auth-brand-logo">
                    <svg viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                </div>
                <h1 className="auth-brand-title">Red de Donaciones</h1>
                <p className="auth-brand-sub">
                    Conectamos a quienes quieren ayudar con quienes mas lo necesitan.
                </p>
                <div className={`auth-brand-switch ${isTransitioning ? 'auth-fading' : ''}`}>
                    {isRegister ? (
                        <>
                            <p>Ya tienes cuenta?</p>
                            <button className="auth-switch-btn" onClick={() => onSwitchTo('login')}>
                                Iniciar sesion
                            </button>
                        </>
                    ) : (
                        <>
                            <p>No tienes cuenta aun?</p>
                            <button className="auth-switch-btn" onClick={() => onSwitchTo('register')}>
                                Registrate
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({ label, id, error, children }) {
    return (
        <div className="auth-field">
            <label className="auth-label" htmlFor={id}>{label}</label>
            {children}
            {error && <span className="auth-error-text">{error}</span>}
        </div>
    )
}

function LoginForm({ onAuthSuccess }) {
    const navigate = useNavigate()
    const [form, setForm] = useState(INITIAL_LOGIN)
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        setApiError('')
        setErrors(prev => {
            if (!prev[name]) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const nextErrors = validateLogin(form)
        setErrors(nextErrors)
        setApiError('')
        if (Object.keys(nextErrors).length > 0) return
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: form.correo.trim().toLowerCase(), password: form.password })
            })
            const body = await res.json().catch(() => null)
            if (!res.ok || !body?.usuario) throw new Error(body?.error || 'No se pudo iniciar sesion')
            if (!body?.token) throw new Error('No se recibio el token de autenticacion')
            guardarTokenSesion(body.token)
            guardarUsuarioSesion(body.usuario)
            if (typeof onAuthSuccess === 'function') onAuthSuccess(body.usuario)
            navigate('/perfil', { state: { flash: 'Sesion iniciada con exito' } })
        } catch (err) {
            setApiError(err.message || 'No se pudo iniciar sesion')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-form-section">
            <div className="auth-form-heading">
                <h2>Bienvenido de vuelta</h2>
                <p>Ingresa tus datos para continuar</p>
            </div>
            <form onSubmit={handleSubmit} noValidate>
                <Field label="Correo electronico" id="login-correo" error={errors.correo}>
                    <input
                        id="login-correo"
                        type="email"
                        className={`auth-input ${errors.correo ? 'auth-input-invalid' : ''}`}
                        name="correo"
                        placeholder="correo@ejemplo.com"
                        value={form.correo}
                        onChange={handleChange}
                        autoComplete="email"
                    />
                </Field>
                <Field label="Contrasena" id="login-password" error={errors.password}>
                    <input
                        id="login-password"
                        type="password"
                        className={`auth-input ${errors.password ? 'auth-input-invalid' : ''}`}
                        name="password"
                        placeholder="Tu contrasena"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                    />
                </Field>
                {apiError && <div className="auth-api-error">{apiError}</div>}
                <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
                </button>
            </form>
        </div>
    )
}

function RegisterForm({ onAuthSuccess }) {
    const navigate = useNavigate()
    const [form, setForm] = useState(INITIAL_REGISTER)
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [organizaciones, setOrganizaciones] = useState([])
    const [orgLoading, setOrgLoading] = useState(false)
    const [orgError, setOrgError] = useState('')

    const isIntermediario = form.rol === 'intermediario'

    useEffect(() => {
        if (!isIntermediario || organizaciones.length > 0) return
        setOrgLoading(true)
        setOrgError('')
        fetch('/api/organizaciones')
            .then(async (res) => {
                const body = await res.json().catch(() => null)
                if (!res.ok) throw new Error(body?.error || 'No se pudo cargar la lista de organizaciones')
                if (!Array.isArray(body)) throw new Error('Respuesta invalida del servidor')
                setOrganizaciones(body)
            })
            .catch((err) => setOrgError(err.message || 'No se pudo cargar organizaciones'))
            .finally(() => setOrgLoading(false))
    }, [isIntermediario, organizaciones.length])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => {
            const next = { ...prev, [name]: value }
            if (name === 'rol') {
                if (value === 'donante') { next.id_organizacion = ''; next.cargo = '' }
                else { next.departamento = ''; next.municipio = ''; next.zona = ''; next.direccion_detalle = '' }
            }
            return next
        })
        setApiError('')
        setSuccessMessage('')
        setErrors(prev => {
            if (!prev[name]) return prev
            const next = { ...prev }
            delete next[name]
            if (name === 'password' || name === 'confirmPassword') { delete next.password; delete next.confirmPassword }
            return next
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const nextErrors = validateRegister(form)
        setErrors(nextErrors)
        setApiError('')
        setSuccessMessage('')
        if (Object.keys(nextErrors).length > 0) return
        setIsSubmitting(true)
        try {
            const payload = buildPayload(form)
            const signupRes = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const signupBody = await signupRes.json().catch(() => null)
            if (!signupRes.ok) throw new Error(signupBody?.error || 'No se pudo completar el registro')
            const loginRes = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: payload.correo, password: payload.password })
            })
            const loginBody = await loginRes.json().catch(() => null)
            if (!loginRes.ok || !loginBody?.usuario) throw new Error(loginBody?.error || 'Cuenta creada, pero no se pudo iniciar sesion')
            if (!loginBody?.token) throw new Error('No se recibio el token de autenticacion')
            guardarTokenSesion(loginBody.token)
            guardarUsuarioSesion(loginBody.usuario)
            if (typeof onAuthSuccess === 'function') onAuthSuccess(loginBody.usuario)
            setSuccessMessage('Cuenta creada! Redirigiendo...')
            setTimeout(() => navigate('/perfil', { state: { flash: 'Usuario creado con exito' } }), 800)
        } catch (err) {
            setApiError(err.message || 'No se pudo completar el registro')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-form-section">
            <div className="auth-form-heading">
                <h2>{isIntermediario ? 'Registro de Intermediario' : 'Crear cuenta'}</h2>
                <p>Completa tu informacion para empezar</p>
            </div>
            <form onSubmit={handleSubmit} noValidate>
                <div className="auth-row">
                    <Field label="Nombre completo" id="reg-nombre" error={errors.nombre}>
                        <input id="reg-nombre" className={`auth-input ${errors.nombre ? 'auth-input-invalid' : ''}`} name="nombre" placeholder="Tu nombre" value={form.nombre} onChange={handleChange} autoComplete="name" />
                    </Field>
                    <Field label="Telefono" id="reg-telefono" error={errors.telefono}>
                        <input id="reg-telefono" className={`auth-input ${errors.telefono ? 'auth-input-invalid' : ''}`} name="telefono" placeholder="5555-0000" value={form.telefono} onChange={handleChange} autoComplete="tel" />
                    </Field>
                </div>
                <div className="auth-row">
                    <Field label="Correo electronico" id="reg-correo" error={errors.correo}>
                        <input id="reg-correo" type="email" className={`auth-input ${errors.correo ? 'auth-input-invalid' : ''}`} name="correo" placeholder="correo@ejemplo.com" value={form.correo} onChange={handleChange} autoComplete="email" />
                    </Field>
                    <Field label="Tipo de cuenta" id="reg-rol" error={errors.rol}>
                        <select id="reg-rol" className={`auth-select ${errors.rol ? 'auth-input-invalid' : ''}`} name="rol" value={form.rol} onChange={handleChange}>
                            <option value="donante">Donante</option>
                            <option value="intermediario">Intermediario</option>
                        </select>
                    </Field>
                </div>
                <div className="auth-row">
                    <Field label="Contrasena" id="reg-password" error={errors.password}>
                        <input id="reg-password" type="password" className={`auth-input ${errors.password ? 'auth-input-invalid' : ''}`} name="password" placeholder="Minimo 8 caracteres" value={form.password} onChange={handleChange} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirmar contrasena" id="reg-confirmPassword" error={errors.confirmPassword}>
                        <input id="reg-confirmPassword" type="password" className={`auth-input ${errors.confirmPassword ? 'auth-input-invalid' : ''}`} name="confirmPassword" placeholder="Repite tu contrasena" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                    </Field>
                </div>

                {form.rol === 'donante' && (
                    <>
                        <div className="auth-row">
                            <Field label="Departamento" id="reg-departamento" error={errors.departamento}>
                                <input id="reg-departamento" className={`auth-input ${errors.departamento ? 'auth-input-invalid' : ''}`} name="departamento" placeholder="Departamento" value={form.departamento} onChange={handleChange} />
                            </Field>
                            <Field label="Municipio" id="reg-municipio" error={errors.municipio}>
                                <input id="reg-municipio" className={`auth-input ${errors.municipio ? 'auth-input-invalid' : ''}`} name="municipio" placeholder="Municipio" value={form.municipio} onChange={handleChange} />
                            </Field>
                        </div>
                        <div className="auth-row">
                            <Field label="Zona" id="reg-zona" error={errors.zona}>
                                <input id="reg-zona" className={`auth-input ${errors.zona ? 'auth-input-invalid' : ''}`} name="zona" placeholder="Zona" value={form.zona} onChange={handleChange} />
                            </Field>
                            <Field label="Direccion" id="reg-direccion" error={errors.direccion_detalle}>
                                <input id="reg-direccion" className={`auth-input ${errors.direccion_detalle ? 'auth-input-invalid' : ''}`} name="direccion_detalle" placeholder="Calle, avenida, referencia" value={form.direccion_detalle} onChange={handleChange} />
                            </Field>
                        </div>
                    </>
                )}

                {form.rol === 'intermediario' && (
                    <div className="auth-row">
                        <Field label="Organizacion" id="reg-org" error={errors.id_organizacion}>
                            <select id="reg-org" className={`auth-select ${errors.id_organizacion ? 'auth-input-invalid' : ''}`} name="id_organizacion" value={form.id_organizacion} onChange={handleChange} disabled={orgLoading}>
                                <option value="">Selecciona una organizacion</option>
                                {organizaciones.map(org => (
                                    <option key={org.id_organizacion} value={org.id_organizacion}>{org.nombre}</option>
                                ))}
                            </select>
                            {orgLoading && <span className="auth-help-text">Cargando organizaciones...</span>}
                            {orgError && <span className="auth-error-text">{orgError}</span>}
                        </Field>
                        <Field label="Cargo" id="reg-cargo" error={errors.cargo}>
                            <input id="reg-cargo" className={`auth-input ${errors.cargo ? 'auth-input-invalid' : ''}`} name="cargo" placeholder="Ej: Coordinador" value={form.cargo} onChange={handleChange} />
                        </Field>
                    </div>
                )}

                {apiError && <div className="auth-api-error">{apiError}</div>}
                {successMessage && <div className="auth-success-msg">{successMessage}</div>}

                <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
            </form>
        </div>
    )
}

export default function AuthPage({ onAuthSuccess, defaultMode = 'login' }) {
    const [isRegister, setIsRegister] = useState(defaultMode === 'register')
    // animClass: '' | 'anim-exit-left' | 'anim-exit-right' | 'anim-enter-right' | 'anim-enter-left'
    const [animClass, setAnimClass] = useState('')
    const [brandFading, setBrandFading] = useState(false)

    const switchTo = (mode) => {
        if ((mode === 'register') === isRegister) return
        const goingToRegister = mode === 'register'
        // Salida: login sale a la izquierda al ir a register, y viceversa
        const exitClass = goingToRegister ? 'anim-exit-left' : 'anim-exit-right'
        const enterClass = goingToRegister ? 'anim-enter-right' : 'anim-enter-left'

        setBrandFading(true)
        setAnimClass(exitClass)

        setTimeout(() => {
            setIsRegister(goingToRegister)
            setAnimClass(enterClass)
            setBrandFading(false)
        }, 260)
    }

    return (
        <div className="auth-page">
            <div className={`auth-container ${isRegister ? 'active' : ''}`}>
                <BrandPanel
                    isRegister={isRegister}
                    isTransitioning={brandFading}
                    onSwitchTo={switchTo}
                />
                <div className="auth-form-area">
                    <div className={`auth-form-content ${animClass}`}>
                        {isRegister
                            ? <RegisterForm onAuthSuccess={onAuthSuccess} />
                            : <LoginForm onAuthSuccess={onAuthSuccess} />
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

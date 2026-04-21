import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { guardarUsuarioSesion } from '../utils/session'

const INITIAL_FORM = {
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    rol: 'donante',
    departamento: '',
    municipio: '',
    zona: '',
    direccion_detalle: '',
    id_organizacion: '',
    cargo: ''
}

function validateForm(form) {
    const errors = {}

    const nombre = form.nombre.trim()
    if (!nombre) {
        errors.nombre = 'El nombre es obligatorio'
    } else if (nombre.length < 3) {
        errors.nombre = 'Ingresa al menos 3 caracteres'
    }

    const correo = form.correo.trim()
    if (!correo) {
        errors.correo = 'El correo es obligatorio'
    } else if (!/^\S+@\S+\.\S+$/.test(correo)) {
        errors.correo = 'Ingresa un correo valido'
    }

    const telefono = form.telefono.trim()
    if (!telefono) {
        errors.telefono = 'El telefono es obligatorio'
    } else if (!/^[0-9\-+()\s]{8,20}$/.test(telefono)) {
        errors.telefono = 'Ingresa un telefono valido'
    }

    if (!form.password) {
        errors.password = 'La contrasena es obligatoria'
    } else if (form.password.length < 8) {
        errors.password = 'La contrasena debe tener al menos 8 caracteres'
    }

    if (!form.confirmPassword) {
        errors.confirmPassword = 'Confirma tu contrasena'
    } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Las contrasenas no coinciden'
    }

    if (form.rol !== 'donante' && form.rol !== 'intermediario') {
        errors.rol = 'Selecciona un rol valido'
    }

    if (form.rol === 'donante') {
        if (!form.departamento.trim()) {
            errors.departamento = 'El departamento es obligatorio'
        }
        if (!form.municipio.trim()) {
            errors.municipio = 'El municipio es obligatorio'
        }
        if (!form.zona.trim()) {
            errors.zona = 'La zona es obligatoria'
        }
        if (!form.direccion_detalle.trim()) {
            errors.direccion_detalle = 'La direccion es obligatoria'
        }
    }

    if (form.rol === 'intermediario') {
        if (!form.id_organizacion) {
            errors.id_organizacion = 'Selecciona una organizacion'
        }
        if (!form.cargo.trim()) {
            errors.cargo = 'El cargo es obligatorio'
        }
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
        return {
            ...base,
            departamento: form.departamento.trim(),
            municipio: form.municipio.trim(),
            zona: form.zona.trim(),
            direccion_detalle: form.direccion_detalle.trim()
        }
    }

    return {
        ...base,
        id_organizacion: Number(form.id_organizacion),
        cargo: form.cargo.trim()
    }
}

export default function SignupPage({ onAuthSuccess }) {
    const navigate = useNavigate()

    const [form, setForm] = useState(INITIAL_FORM)
    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [organizaciones, setOrganizaciones] = useState([])
    const [orgLoading, setOrgLoading] = useState(false)
    const [orgError, setOrgError] = useState('')

    const isIntermediario = form.rol === 'intermediario'

    useEffect(() => {
        if (!isIntermediario || organizaciones.length > 0) {
            return
        }

        setOrgLoading(true)
        setOrgError('')

        fetch('/api/organizaciones')
            .then(async (res) => {
                const body = await res.json().catch(() => null)
                if (!res.ok) {
                    const message = body?.error || 'No se pudo cargar la lista de organizaciones'
                    throw new Error(message)
                }
                if (!Array.isArray(body)) {
                    throw new Error('Respuesta invalida del servidor')
                }
                setOrganizaciones(body)
            })
            .catch((err) => {
                setOrgError(err.message || 'No se pudo cargar la lista de organizaciones')
            })
            .finally(() => setOrgLoading(false))
    }, [isIntermediario, organizaciones.length])

    const titleByRole = useMemo(() => {
        return isIntermediario ? 'Registro de Intermediario' : 'Registro de Donante'
    }, [isIntermediario])

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((previous) => {
            const next = { ...previous, [name]: value }

            if (name === 'rol') {
                if (value === 'donante') {
                    next.id_organizacion = ''
                    next.cargo = ''
                } else {
                    next.departamento = ''
                    next.municipio = ''
                    next.zona = ''
                    next.direccion_detalle = ''
                }
            }

            return next
        })

        setApiError('')
        setSuccessMessage('')
        setErrors((previous) => {
            if (!previous[name]) {
                return previous
            }

            const next = { ...previous }
            delete next[name]

            if (name === 'password' || name === 'confirmPassword') {
                delete next.password
                delete next.confirmPassword
            }

            return next
        })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const nextErrors = validateForm(form)
        setErrors(nextErrors)
        setApiError('')
        setSuccessMessage('')

        if (Object.keys(nextErrors).length > 0) {
            return
        }

        setIsSubmitting(true)

        try {
            const payload = buildPayload(form)

            const signupResponse = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const signupBody = await signupResponse.json().catch(() => null)
            if (!signupResponse.ok) {
                throw new Error(signupBody?.error || 'No se pudo completar el registro')
            }

            const loginResponse = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correo: payload.correo,
                    password: payload.password
                })
            })

            const loginBody = await loginResponse.json().catch(() => null)
            if (!loginResponse.ok || !loginBody?.usuario) {
                throw new Error(loginBody?.error || 'Cuenta creada, pero no se pudo iniciar sesion automaticamente')
            }

            guardarUsuarioSesion(loginBody.usuario)
            if (typeof onAuthSuccess === 'function') {
                onAuthSuccess(loginBody.usuario)
            }

            setSuccessMessage('Usuario creado con exito. Redirigiendo a tu perfil...')
            setTimeout(() => {
                navigate('/perfil', { state: { flash: 'Usuario creado con exito' } })
            }, 800)
        } catch (error) {
            setApiError(error.message || 'No se pudo completar el registro')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="signup-page fade-in">
            <header className="signup-header">
                <h1 className="signup-title">Crear cuenta</h1>
                <p className="signup-subtitle">
                    Completa tu informacion para empezar a donar o gestionar donaciones.
                </p>
            </header>

            <article className="signup-card">
                <div className="signup-card-head">
                    <h2>{titleByRole}</h2>
                    <p>Tu cuenta quedara lista para iniciar sesion de inmediato.</p>
                </div>

                <form className="form-grid" onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="nombre">Nombre completo</label>
                            <input
                                id="nombre"
                                className={`form-input ${errors.nombre ? 'form-input-invalid' : ''}`}
                                name="nombre"
                                placeholder="Tu nombre"
                                value={form.nombre}
                                onChange={handleChange}
                            />
                            {errors.nombre && <span className="form-error-text">{errors.nombre}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="telefono">Telefono</label>
                            <input
                                id="telefono"
                                className={`form-input ${errors.telefono ? 'form-input-invalid' : ''}`}
                                name="telefono"
                                placeholder="5555-0000"
                                value={form.telefono}
                                onChange={handleChange}
                            />
                            {errors.telefono && <span className="form-error-text">{errors.telefono}</span>}
                        </div>
                    </div>

                    <div className="form-row">
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
                            <label className="form-label" htmlFor="rol">Tipo de cuenta</label>
                            <select
                                id="rol"
                                className={`form-select ${errors.rol ? 'form-input-invalid' : ''}`}
                                name="rol"
                                value={form.rol}
                                onChange={handleChange}
                            >
                                <option value="donante">Donante</option>
                                <option value="intermediario">Intermediario</option>
                            </select>
                            {errors.rol && <span className="form-error-text">{errors.rol}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="password">Contrasena</label>
                            <input
                                id="password"
                                type="password"
                                className={`form-input ${errors.password ? 'form-input-invalid' : ''}`}
                                name="password"
                                placeholder="Minimo 8 caracteres"
                                value={form.password}
                                onChange={handleChange}
                            />
                            {errors.password && <span className="form-error-text">{errors.password}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="confirmPassword">Confirmar contrasena</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className={`form-input ${errors.confirmPassword ? 'form-input-invalid' : ''}`}
                                name="confirmPassword"
                                placeholder="Repite tu contrasena"
                                value={form.confirmPassword}
                                onChange={handleChange}
                            />
                            {errors.confirmPassword && (
                                <span className="form-error-text">{errors.confirmPassword}</span>
                            )}
                        </div>
                    </div>

                    {form.rol === 'donante' && (
                        <>
                            <div className="form-row">
                                <div className="form-field">
                                    <label className="form-label" htmlFor="departamento">Departamento</label>
                                    <input
                                        id="departamento"
                                        className={`form-input ${errors.departamento ? 'form-input-invalid' : ''}`}
                                        name="departamento"
                                        placeholder="Departamento"
                                        value={form.departamento}
                                        onChange={handleChange}
                                    />
                                    {errors.departamento && (
                                        <span className="form-error-text">{errors.departamento}</span>
                                    )}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="municipio">Municipio</label>
                                    <input
                                        id="municipio"
                                        className={`form-input ${errors.municipio ? 'form-input-invalid' : ''}`}
                                        name="municipio"
                                        placeholder="Municipio"
                                        value={form.municipio}
                                        onChange={handleChange}
                                    />
                                    {errors.municipio && <span className="form-error-text">{errors.municipio}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label className="form-label" htmlFor="zona">Zona</label>
                                    <input
                                        id="zona"
                                        className={`form-input ${errors.zona ? 'form-input-invalid' : ''}`}
                                        name="zona"
                                        placeholder="Zona"
                                        value={form.zona}
                                        onChange={handleChange}
                                    />
                                    {errors.zona && <span className="form-error-text">{errors.zona}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="direccion_detalle">Direccion</label>
                                    <input
                                        id="direccion_detalle"
                                        className={`form-input ${errors.direccion_detalle ? 'form-input-invalid' : ''}`}
                                        name="direccion_detalle"
                                        placeholder="Calle, avenida, referencia"
                                        value={form.direccion_detalle}
                                        onChange={handleChange}
                                    />
                                    {errors.direccion_detalle && (
                                        <span className="form-error-text">{errors.direccion_detalle}</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {form.rol === 'intermediario' && (
                        <>
                            <div className="form-row">
                                <div className="form-field">
                                    <label className="form-label" htmlFor="id_organizacion">Organizacion</label>
                                    <select
                                        id="id_organizacion"
                                        className={`form-select ${errors.id_organizacion ? 'form-input-invalid' : ''}`}
                                        name="id_organizacion"
                                        value={form.id_organizacion}
                                        onChange={handleChange}
                                        disabled={orgLoading}
                                    >
                                        <option value="">Selecciona una organizacion</option>
                                        {organizaciones.map((organizacion) => (
                                            <option key={organizacion.id_organizacion} value={organizacion.id_organizacion}>
                                                {organizacion.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.id_organizacion && (
                                        <span className="form-error-text">{errors.id_organizacion}</span>
                                    )}
                                    {orgLoading && <span className="form-help-text">Cargando organizaciones...</span>}
                                    {orgError && <span className="form-error-text">{orgError}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="cargo">Cargo</label>
                                    <input
                                        id="cargo"
                                        className={`form-input ${errors.cargo ? 'form-input-invalid' : ''}`}
                                        name="cargo"
                                        placeholder="Ej: Coordinador"
                                        value={form.cargo}
                                        onChange={handleChange}
                                    />
                                    {errors.cargo && <span className="form-error-text">{errors.cargo}</span>}
                                </div>
                            </div>
                        </>
                    )}

                    {apiError && <div className="error-box">{apiError}</div>}
                    {successMessage && <div className="loading-box">{successMessage}</div>}

                    <button type="submit" className="btn-confirmar" disabled={isSubmitting}>
                        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                </form>
            </article>
        </section>
    )
}

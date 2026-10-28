// Pagina de perfil del usuario autenticado: ver y editar datos, con campos
// condicionados por rol (donante/intermediario/administrador).
import React from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPut } from '../utils/api'
import { guardarUsuarioSesion } from '../utils/session'
import { IconUser, IconDonation, IconLocation } from '../components/icons'
import './PerfilPage.css'
import PerfilFoto from './PerfilFoto'

function roleLabel(role) {
    if (!role) return 'Sin rol'
    if (role === 'donante') return 'Donante'
    if (role === 'intermediario') return 'Intermediario'
    if (role === 'administrador') return 'Administrador'
    return role
}

function buildProfileForm(perfil) {
    const datosPerfil = perfil?.perfil || {}

    return {
        nombre: perfil?.nombre || '',
        correo: perfil?.correo || '',
        telefono: perfil?.telefono || '',
        departamento: datosPerfil.departamento || '',
        municipio: datosPerfil.municipio || '',
        zona: datosPerfil.zona || '',
        direccion_detalle: datosPerfil.direccion_detalle || '',
        cargo: datosPerfil.cargo || ''
    }
}

function validateProfileForm(form, rol) {
    const errors = {}

    if (!form.nombre.trim()) {
        errors.nombre = 'El nombre es obligatorio'
    } else if (form.nombre.trim().length < 3) {
        errors.nombre = 'Ingresa al menos 3 caracteres'
    }

    if (!form.correo.trim()) {
        errors.correo = 'El correo es obligatorio'
    } else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
        errors.correo = 'Ingresa un correo válido'
    }

    if (!form.telefono.trim()) {
        errors.telefono = 'El teléfono es obligatorio'
    } else if (!/^[0-9\-+()\s]{8,20}$/.test(form.telefono.trim())) {
        errors.telefono = 'Ingresa un teléfono válido'
    }

    if (rol === 'donante') {
        if (!form.departamento.trim()) errors.departamento = 'El departamento es obligatorio'
        if (!form.municipio.trim()) errors.municipio = 'El municipio es obligatorio'
        if (!form.zona.trim()) errors.zona = 'La zona es obligatoria'
        if (!form.direccion_detalle.trim()) errors.direccion_detalle = 'La dirección es obligatoria'
    }

    if (rol === 'intermediario') {
        if (!form.cargo.trim()) errors.cargo = 'El cargo es obligatorio'
    }

    return errors
}

function buildProfilePayload(form, rol) {
    const base = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim()
    }

    if (rol === 'donante') {
        return {
            ...base,
            departamento: form.departamento.trim(),
            municipio: form.municipio.trim(),
            zona: form.zona.trim(),
            direccion_detalle: form.direccion_detalle.trim()
        }
    }

    if (rol === 'intermediario') {
        return {
            ...base,
            cargo: form.cargo.trim()
        }
    }

    return base
}

export default function PerfilPage({ usuarioSesion, onProfileUpdated }) {
    const formRef = React.useRef(null)
    const savingRef = React.useRef(false)
    const [perfil, setPerfil] = React.useState(null)
    const [resumen, setResumen] = React.useState({ total: 0, organizaciones: 0 })
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState('')
    const [form, setForm] = React.useState(() => buildProfileForm(null))
    const [formErrors, setFormErrors] = React.useState({})
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [saveError, setSaveError] = React.useState('')
    const [saveSuccess, setSaveSuccess] = React.useState('')

    React.useEffect(() => {
        if (!usuarioSesion?.id_usuario) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError('')

        apiGet(`/api/usuarios/${usuarioSesion.id_usuario}`)
            .then((body) => {
                setPerfil(body)
                setForm(buildProfileForm(body))
                if (body.rol === 'donante') {
                    return apiGet(`/api/donaciones?id_donante=${body.id_usuario}`)
                        .then((donaciones) => {
                            if (!Array.isArray(donaciones)) return
                            const organizaciones = new Set(donaciones.map((item) => item.organizacion_nombre).filter(Boolean))
                            setResumen({ total: donaciones.length, organizaciones: organizaciones.size })
                        })
                }
                return null
            })
            .catch((fetchError) => {
                setError(fetchError.message || 'No se pudo cargar tu perfil')
            })
            .finally(() => setLoading(false))
    }, [usuarioSesion?.id_usuario])

    const handleEdit = () => {
        setForm(buildProfileForm(perfil))
        setFormErrors({})
        setSaveError('')
        setSaveSuccess('')
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setForm(buildProfileForm(perfil))
        setFormErrors({})
        setSaveError('')
        setIsEditing(false)
    }

    const handleFormChange = (event) => {
        const { name, value } = event.target

        setForm((previous) => ({ ...previous, [name]: value }))
        setSaveError('')
        setSaveSuccess('')
        setFormErrors((previous) => {
            if (!previous[name]) return previous
            const next = { ...previous }
            delete next[name]
            return next
        })
    }

    const handleSaveProfile = async (event) => {
        event.preventDefault()
        if (savingRef.current) return

        const nextErrors = validateProfileForm(form, perfil?.rol)
        setFormErrors(nextErrors)
        setSaveError('')
        setSaveSuccess('')

        if (Object.keys(nextErrors).length > 0) {
            const firstField = Object.keys(nextErrors)[0]
            formRef.current?.elements.namedItem(firstField)?.focus()
            return
        }

        savingRef.current = true
        setIsSaving(true)

        try {
            const payload = buildProfilePayload(form, perfil?.rol)
            const body = await apiPut(`/api/usuarios/${perfil.id_usuario}`, payload)
            if (!body?.usuario) {
                throw new Error('No se pudo actualizar tu perfil')
            }

            const usuarioActualizado = {
                id_usuario: body.usuario.id_usuario,
                nombre: body.usuario.nombre,
                correo: body.usuario.correo,
                telefono: body.usuario.telefono,
                rol: body.usuario.rol
            }

            guardarUsuarioSesion(usuarioActualizado)
            if (typeof onProfileUpdated === 'function') {
                onProfileUpdated(usuarioActualizado)
            }

            setPerfil(body.usuario)
            setForm(buildProfileForm(body.usuario))
            setIsEditing(false)
            setSaveSuccess('Perfil actualizado con éxito')
        } catch (fetchError) {
            setSaveError(fetchError.message || 'No se pudo actualizar tu perfil')
        } finally {
            savingRef.current = false
            setIsSaving(false)
        }
    }

    if (!usuarioSesion) {
        return (
            <div className="fade-in">
                <div className="error-box">
                    Debes iniciar sesión para ver tu perfil. <Link to="/login">Ir a login</Link>
                </div>
            </div>
        )
    }

    if (loading) {
        return <div className="empty-box">Cargando perfil...</div>
    }

    if (error) {
        return <div className="error-box">{error}</div>
    }

    return (
        <div className="fade-in profile-page-figma">
            <header className="profile-header-figma">
                <h1 className="profile-main-title">Mi Perfil</h1>
                <p className="profile-main-subtitle">Información personal y datos de tu cuenta</p>
            </header>

            {saveSuccess && <div className="loading-box" role="status">{saveSuccess}</div>}
            {saveError && <div className="error-box" role="alert">{saveError}</div>}

            <div className="profile-grid-figma">
                <section className="profile-card-figma profile-info-card-figma">
                    <div className="profile-title-row">
                        <h2 className="profile-section-title">Información personal</h2>
                        {!isEditing && (
                            <button type="button" className="profile-edit-button" onClick={handleEdit}>
                                Editar perfil
                            </button>
                        )}
                    </div>

                    <div className="profile-user-row">
                        <PerfilFoto key={perfil?.id_usuario} idUsuario={perfil?.id_usuario} />

                        <div className="profile-user-copy">
                            <h3 className="profile-user-name">{perfil?.nombre}</h3>
                            <p className="profile-user-role">{roleLabel(perfil?.rol)}</p>
                        </div>
                    </div>

                    {isEditing ? (
                        <form ref={formRef} className="profile-edit-form form-grid" onSubmit={handleSaveProfile} noValidate aria-busy={isSaving}>
                            <p className="profile-edit-help">Actualiza tus datos y guarda los cambios al terminar. Los campos son obligatorios.</p>
                            <fieldset className="profile-edit-section" disabled={isSaving}>
                                <legend>Datos de contacto</legend>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label className="form-label" htmlFor="profile-nombre">Nombre completo</label>
                                        <input
                                            id="profile-nombre"
                                            className={`form-input ${formErrors.nombre ? 'form-input-invalid' : ''}`}
                                            autoComplete="name" name="nombre"
                                            aria-invalid={!!formErrors.nombre}
                                            aria-describedby={formErrors.nombre ? 'profile-nombre-error' : undefined}
                                            value={form.nombre}
                                            onChange={handleFormChange}
                                        />
                                        {formErrors.nombre && <span id="profile-nombre-error" className="form-error-text">{formErrors.nombre}</span>}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" htmlFor="profile-telefono">Teléfono</label>
                                        <input
                                            id="profile-telefono"
                                            className={`form-input ${formErrors.telefono ? 'form-input-invalid' : ''}`}
                                            type="tel" autoComplete="tel" name="telefono"
                                            aria-invalid={!!formErrors.telefono}
                                            aria-describedby={formErrors.telefono ? 'profile-telefono-error' : undefined}
                                            value={form.telefono}
                                            onChange={handleFormChange}
                                        />
                                        {formErrors.telefono && <span id="profile-telefono-error" className="form-error-text">{formErrors.telefono}</span>}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="profile-correo">Correo</label>
                                    <input
                                        id="profile-correo"
                                        type="email"
                                        className={`form-input ${formErrors.correo ? 'form-input-invalid' : ''}`}
                                        autoComplete="email" name="correo"
                                        aria-invalid={!!formErrors.correo}
                                        aria-describedby={formErrors.correo ? 'profile-correo-error' : undefined}
                                        value={form.correo}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.correo && <span id="profile-correo-error" className="form-error-text">{formErrors.correo}</span>}
                                </div>

                            </fieldset>
                            {perfil?.rol === 'donante' && (
                                <fieldset className="profile-edit-section" disabled={isSaving}>
                                    <legend>Dirección</legend>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-departamento">Departamento</label>
                                            <input
                                                id="profile-departamento"
                                                className={`form-input ${formErrors.departamento ? 'form-input-invalid' : ''}`}
                                                name="departamento"
                                                aria-invalid={!!formErrors.departamento}
                                                aria-describedby={formErrors.departamento ? 'profile-departamento-error' : undefined}
                                                value={form.departamento}
                                                onChange={handleFormChange}
                                            />
                                            {formErrors.departamento && <span id="profile-departamento-error" className="form-error-text">{formErrors.departamento}</span>}
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-municipio">Municipio</label>
                                            <input
                                                id="profile-municipio"
                                                className={`form-input ${formErrors.municipio ? 'form-input-invalid' : ''}`}
                                                name="municipio"
                                                aria-invalid={!!formErrors.municipio}
                                                aria-describedby={formErrors.municipio ? 'profile-municipio-error' : undefined}
                                                value={form.municipio}
                                                onChange={handleFormChange}
                                            />
                                            {formErrors.municipio && <span id="profile-municipio-error" className="form-error-text">{formErrors.municipio}</span>}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-zona">Zona</label>
                                            <input
                                                id="profile-zona"
                                                className={`form-input ${formErrors.zona ? 'form-input-invalid' : ''}`}
                                                name="zona"
                                                aria-invalid={!!formErrors.zona}
                                                aria-describedby={formErrors.zona ? 'profile-zona-error' : undefined}
                                                value={form.zona}
                                                onChange={handleFormChange}
                                            />
                                            {formErrors.zona && <span id="profile-zona-error" className="form-error-text">{formErrors.zona}</span>}
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-direccion">Dirección</label>
                                            <input
                                                id="profile-direccion"
                                                className={`form-input ${formErrors.direccion_detalle ? 'form-input-invalid' : ''}`}
                                                name="direccion_detalle"
                                                aria-invalid={!!formErrors.direccion_detalle}
                                                aria-describedby={formErrors.direccion_detalle ? 'profile-direccion_detalle-error' : undefined}
                                                value={form.direccion_detalle}
                                                onChange={handleFormChange}
                                            />
                                            {formErrors.direccion_detalle && (
                                                <span id="profile-direccion_detalle-error" className="form-error-text">{formErrors.direccion_detalle}</span>
                                            )}
                                        </div>
                                    </div>
                                </fieldset>
                            )}

                            {perfil?.rol === 'intermediario' && (
                                <fieldset className="profile-edit-section" disabled={isSaving}>
                                    <legend>Datos de la organización</legend>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-organizacion">Organización</label>
                                            <input
                                                id="profile-organizacion"
                                                className="form-input"
                                                value={perfil?.perfil?.organizacion_nombre || 'No asignada'}
                                                readOnly
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label" htmlFor="profile-cargo">Cargo</label>
                                            <input
                                                id="profile-cargo"
                                                className={`form-input ${formErrors.cargo ? 'form-input-invalid' : ''}`}
                                                name="cargo"
                                                aria-invalid={!!formErrors.cargo}
                                                aria-describedby={formErrors.cargo ? 'profile-cargo-error' : undefined}
                                                value={form.cargo}
                                                onChange={handleFormChange}
                                            />
                                            {formErrors.cargo && <span id="profile-cargo-error" className="form-error-text">{formErrors.cargo}</span>}
                                        </div>
                                    </div>
                                </fieldset>
                            )}

                            <div className="profile-edit-actions">
                                <button type="submit" className="btn-confirmar" disabled={isSaving}>
                                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button type="button" className="profile-cancel-button" onClick={handleCancelEdit} disabled={isSaving}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-info-grid">
                            <div className="profile-info-item">
                                <div className="profile-info-icon-box">
                                    <IconUser className="nav-icon" />
                                </div>
                                <div>
                                    <p className="profile-info-label">Correo</p>
                                    <p className="profile-info-value">{perfil?.correo || 'Sin correo registrado'}</p>
                                </div>
                            </div>

                            <div className="profile-info-item">
                                <div className="profile-info-icon-box">
                                    <IconDonation className="nav-icon" />
                                </div>
                                <div>
                                    <p className="profile-info-label">Teléfono</p>
                                    <p className="profile-info-value">{perfil?.telefono || 'Sin teléfono registrado'}</p>
                                </div>
                            </div>

                            {perfil?.rol === 'donante' && (
                                <div className="profile-info-item">
                                    <div className="profile-info-icon-box">
                                        <IconLocation className="meta-icon" />
                                    </div>
                                    <div>
                                        <p className="profile-info-label">Ubicación</p>
                                        <p className="profile-info-value">
                                            {[perfil?.perfil?.municipio, perfil?.perfil?.departamento].filter(Boolean).join(', ') || 'Sin ubicación registrada'}
                                            <span className="profile-address-detail">
                                                {[perfil?.perfil?.zona && `Zona ${perfil.perfil.zona}`, perfil?.perfil?.direccion_detalle].filter(Boolean).join(' · ')}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {perfil?.rol === 'intermediario' && (
                                <div className="profile-info-item">
                                    <div className="profile-info-icon-box">
                                        <IconLocation className="meta-icon" />
                                    </div>
                                    <div>
                                        <p className="profile-info-label">Organización</p>
                                        <p className="profile-info-value">{perfil?.perfil?.organizacion_nombre || 'No asignada'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {perfil?.rol === 'donante' && (
                    <section className="profile-card-figma profile-achievements-card-figma">
                        <h2 className="profile-section-title">Resumen de donaciones</h2>
                        <div className="profile-achievements-grid">
                            <div className="achievement-box">
                                <p className="achievement-label">Total de donaciones</p>
                                <p className="profile-stat-value">{resumen.total}</p>
                            </div>

                            <div className="achievement-box">
                                <p className="achievement-label">Organizaciones apoyadas</p>
                                <p className="profile-stat-value">{resumen.organizaciones}</p>
                            </div>

                            <Link className="profile-history-link" to="/donaciones">Ver mis donaciones</Link>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}


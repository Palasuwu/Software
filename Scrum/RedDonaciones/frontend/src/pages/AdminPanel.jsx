import React from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'

const USER_INITIAL_FORM = {
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    rol: 'donante',
    departamento: '',
    municipio: '',
    zona: '',
    direccion_detalle: '',
    id_organizacion: '',
    cargo: ''
}

function IconUsers() {
    return (
        <svg viewBox="0 0 24 24" className="admin-svg-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="3.5" />
            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
        </svg>
    )
}

function IconCampaigns() {
    return (
        <svg viewBox="0 0 24 24" className="admin-svg-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h5" />
        </svg>
    )
}

function IconEdit() {
    return (
        <svg viewBox="0 0 24 24" className="admin-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    )
}

function IconTrash() {
    return (
        <svg viewBox="0 0 24 24" className="admin-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
        </svg>
    )
}

function IconPlus() {
    return (
        <svg viewBox="0 0 24 24" className="admin-button-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
        </svg>
    )
}

function roleLabel(role) {
    if (role === 'donante') return 'Donante'
    if (role === 'intermediario') return 'Intermediario'
    if (role === 'administrador') return 'Administrador'
    return 'Sin rol'
}

function campaignStatusLabel(status) {
    if (status === 'activa') return 'Activa'
    if (status === 'finalizada') return 'Finalizada'
    if (status === 'cancelada') return 'Cancelada'
    return 'Sin estado'
}

function formatDate(value) {
    if (!value) return 'Sin fecha'

    try {
        return new Intl.DateTimeFormat('es-GT', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }).format(new Date(value))
    } catch {
        return String(value)
    }
}

function getProgress(publicacion) {
    const necesaria = Number(publicacion.cantidad_necesaria || 0)
    const recibida = Number(publicacion.cantidad_recibida || 0)

    if (necesaria <= 0) return 0

    return Math.min(100, Math.round((recibida / necesaria) * 100))
}

function buildUserPayload(form, includePassword) {
    const payload = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim()
    }

    if (includePassword) {
        payload.password = form.password
        payload.rol = form.rol
    }

    if (form.rol === 'donante') {
        payload.departamento = form.departamento.trim()
        payload.municipio = form.municipio.trim()
        payload.zona = form.zona.trim()
        payload.direccion_detalle = form.direccion_detalle.trim()
    }

    if (form.rol === 'intermediario') {
        payload.id_organizacion = Number(form.id_organizacion)
        payload.cargo = form.cargo.trim()
    }

    return payload
}

function validateUserForm(form, mode) {
    const errors = {}

    if (!form.nombre.trim()) {
        errors.nombre = 'El nombre es obligatorio'
    } else if (form.nombre.trim().length < 3) {
        errors.nombre = 'Ingresa al menos 3 caracteres'
    }

    if (!form.correo.trim()) {
        errors.correo = 'El correo es obligatorio'
    } else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
        errors.correo = 'Ingresa un correo valido'
    }

    if (!form.telefono.trim()) {
        errors.telefono = 'El telefono es obligatorio'
    } else if (!/^[0-9\-+()\s]{8,20}$/.test(form.telefono.trim())) {
        errors.telefono = 'Ingresa un telefono valido'
    }

    if (mode === 'create') {
        if (!form.password) {
            errors.password = 'La contrasena es obligatoria'
        } else if (form.password.length < 8) {
            errors.password = 'La contrasena debe tener al menos 8 caracteres'
        }

        if (!['donante', 'intermediario', 'administrador'].includes(form.rol)) {
            errors.rol = 'Selecciona un rol valido'
        }
    }

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

function AdminModal({ title, description, children, footer, onClose }) {
    return (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-modal-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="admin-modal-header">
                    <div>
                        <h2 id="admin-modal-title">{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Cerrar modal">
                        x
                    </button>
                </header>
                <div className="admin-modal-body">{children}</div>
                {footer && <footer className="admin-modal-footer">{footer}</footer>}
            </section>
        </div>
    )
}

function UserFormFields({ form, errors, mode, organizaciones, orgLoading, orgError, onChange }) {
    const isAdmin = form.rol === 'administrador'
    const isDonante = form.rol === 'donante'
    const isIntermediario = form.rol === 'intermediario'

    return (
        <div className="form-grid">
            <div className="form-row">
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-nombre">Nombre completo</label>
                    <input
                        id="admin-user-nombre"
                        className={`form-input ${errors.nombre ? 'form-input-invalid' : ''}`}
                        name="nombre"
                        value={form.nombre}
                        onChange={onChange}
                    />
                    {errors.nombre && <span className="form-error-text">{errors.nombre}</span>}
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-telefono">Telefono</label>
                    <input
                        id="admin-user-telefono"
                        className={`form-input ${errors.telefono ? 'form-input-invalid' : ''}`}
                        name="telefono"
                        value={form.telefono}
                        onChange={onChange}
                    />
                    {errors.telefono && <span className="form-error-text">{errors.telefono}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-correo">Correo</label>
                    <input
                        id="admin-user-correo"
                        type="email"
                        className={`form-input ${errors.correo ? 'form-input-invalid' : ''}`}
                        name="correo"
                        value={form.correo}
                        onChange={onChange}
                    />
                    {errors.correo && <span className="form-error-text">{errors.correo}</span>}
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-rol">Rol</label>
                    <select
                        id="admin-user-rol"
                        className={`form-select ${errors.rol ? 'form-input-invalid' : ''}`}
                        name="rol"
                        value={form.rol}
                        onChange={onChange}
                        disabled={mode === 'edit'}
                    >
                        <option value="donante">Donante</option>
                        <option value="intermediario">Intermediario</option>
                        <option value="administrador">Administrador</option>
                    </select>
                    {errors.rol && <span className="form-error-text">{errors.rol}</span>}
                </div>
            </div>

            {mode === 'create' && (
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-password">Contrasena temporal</label>
                    <input
                        id="admin-user-password"
                        type="password"
                        className={`form-input ${errors.password ? 'form-input-invalid' : ''}`}
                        name="password"
                        value={form.password}
                        onChange={onChange}
                    />
                    {errors.password && <span className="form-error-text">{errors.password}</span>}
                </div>
            )}

            {isDonante && (
                <>
                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-departamento">Departamento</label>
                            <input
                                id="admin-user-departamento"
                                className={`form-input ${errors.departamento ? 'form-input-invalid' : ''}`}
                                name="departamento"
                                value={form.departamento}
                                onChange={onChange}
                            />
                            {errors.departamento && <span className="form-error-text">{errors.departamento}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-municipio">Municipio</label>
                            <input
                                id="admin-user-municipio"
                                className={`form-input ${errors.municipio ? 'form-input-invalid' : ''}`}
                                name="municipio"
                                value={form.municipio}
                                onChange={onChange}
                            />
                            {errors.municipio && <span className="form-error-text">{errors.municipio}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-zona">Zona</label>
                            <input
                                id="admin-user-zona"
                                className={`form-input ${errors.zona ? 'form-input-invalid' : ''}`}
                                name="zona"
                                value={form.zona}
                                onChange={onChange}
                            />
                            {errors.zona && <span className="form-error-text">{errors.zona}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-direccion">Direccion</label>
                            <input
                                id="admin-user-direccion"
                                className={`form-input ${errors.direccion_detalle ? 'form-input-invalid' : ''}`}
                                name="direccion_detalle"
                                value={form.direccion_detalle}
                                onChange={onChange}
                            />
                            {errors.direccion_detalle && (
                                <span className="form-error-text">{errors.direccion_detalle}</span>
                            )}
                        </div>
                    </div>
                </>
            )}

            {isIntermediario && (
                <div className="form-row">
                    <div className="form-field">
                        <label className="form-label" htmlFor="admin-user-organizacion">Organizacion</label>
                        <select
                            id="admin-user-organizacion"
                            className={`form-select ${errors.id_organizacion ? 'form-input-invalid' : ''}`}
                            name="id_organizacion"
                            value={form.id_organizacion}
                            onChange={onChange}
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
                        <label className="form-label" htmlFor="admin-user-cargo">Cargo</label>
                        <input
                            id="admin-user-cargo"
                            className={`form-input ${errors.cargo ? 'form-input-invalid' : ''}`}
                            name="cargo"
                            value={form.cargo}
                            onChange={onChange}
                        />
                        {errors.cargo && <span className="form-error-text">{errors.cargo}</span>}
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="admin-inline-note">
                    Esta cuenta tendra acceso al Panel de Administrador.
                </div>
            )}
        </div>
    )
}

function SkeletonRows({ cols, rows = 5 }) {
    return Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="skeleton-row">
            {Array.from({ length: cols }).map((__, j) => (
                <td key={j}><div className="skeleton-cell" /></td>
            ))}
        </tr>
    ))
}

export default function AdminPanel({ usuarioSesion }) {
    const [activeTab, setActiveTab] = React.useState('usuarios')
    const [usuarios, setUsuarios] = React.useState([])
    const [publicaciones, setPublicaciones] = React.useState([])
    const [organizaciones, setOrganizaciones] = React.useState([])
    const [loadingUsers, setLoadingUsers] = React.useState(true)
    const [loadingCampaigns, setLoadingCampaigns] = React.useState(true)
    const [orgLoading, setOrgLoading] = React.useState(false)
    const [usersError, setUsersError] = React.useState('')
    const [campaignsError, setCampaignsError] = React.useState('')
    const [orgError, setOrgError] = React.useState('')
    const [successMessage, setSuccessMessage] = React.useState('')
    const [modal, setModal] = React.useState(null)
    const [userForm, setUserForm] = React.useState(USER_INITIAL_FORM)
    const [formErrors, setFormErrors] = React.useState({})
    const [modalError, setModalError] = React.useState('')
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [savingCampaignId, setSavingCampaignId] = React.useState(null)

    React.useEffect(() => {
        if (!successMessage) return
        const t = setTimeout(() => setSuccessMessage(''), 3500)
        return () => clearTimeout(t)
    }, [successMessage])

    const loadUsers = React.useCallback(async () => {
        setLoadingUsers(true)
        setUsersError('')

        try {
            const data = await apiGet('/api/usuarios')
            setUsuarios(Array.isArray(data) ? data : [])
        } catch (error) {
            setUsersError(error.message || 'No se pudieron cargar los usuarios')
        } finally {
            setLoadingUsers(false)
        }
    }, [])

    const loadCampaigns = React.useCallback(async (options = {}) => {
        const { silent = false } = options

        if (!silent) {
            setLoadingCampaigns(true)
        }
        setCampaignsError('')

        try {
            const data = await apiGet('/api/publicaciones')
            setPublicaciones(Array.isArray(data) ? data : [])
        } catch (error) {
            setCampaignsError(error.message || 'No se pudieron cargar las campanas')
        } finally {
            if (!silent) {
                setLoadingCampaigns(false)
            }
        }
    }, [])

    const ensureOrganizations = React.useCallback(async () => {
        if (organizaciones.length > 0 || orgLoading) return

        setOrgLoading(true)
        setOrgError('')

        try {
            const data = await apiGet('/api/organizaciones')
            setOrganizaciones(Array.isArray(data) ? data : [])
        } catch (error) {
            setOrgError(error.message || 'No se pudieron cargar las organizaciones')
        } finally {
            setOrgLoading(false)
        }
    }, [organizaciones.length, orgLoading])

    React.useEffect(() => {
        loadUsers()
        loadCampaigns()
    }, [loadUsers, loadCampaigns])

    React.useEffect(() => {
        if (activeTab !== 'campanas') return undefined

        const intervalId = window.setInterval(() => {
            loadCampaigns({ silent: true })
        }, 8000)

        return () => window.clearInterval(intervalId)
    }, [activeTab, loadCampaigns])

    React.useEffect(() => {
        if (modal && userForm.rol === 'intermediario') {
            ensureOrganizations()
        }
    }, [ensureOrganizations, modal, userForm.rol])

    const clearFeedback = () => {
        setSuccessMessage('')
        setModalError('')
    }

    const closeModal = () => {
        setModal(null)
        setUserForm(USER_INITIAL_FORM)
        setFormErrors({})
        setModalError('')
        setIsSubmitting(false)
    }

    const handleUserFormChange = (event) => {
        const { name, value } = event.target
        clearFeedback()

        setUserForm((previous) => {
            const next = { ...previous, [name]: value }

            if (name === 'rol') {
                if (value === 'donante') {
                    next.id_organizacion = ''
                    next.cargo = ''
                } else if (value === 'intermediario') {
                    next.departamento = ''
                    next.municipio = ''
                    next.zona = ''
                    next.direccion_detalle = ''
                } else {
                    next.departamento = ''
                    next.municipio = ''
                    next.zona = ''
                    next.direccion_detalle = ''
                    next.id_organizacion = ''
                    next.cargo = ''
                }
            }

            return next
        })

        setFormErrors((previous) => {
            if (!previous[name]) return previous
            const next = { ...previous }
            delete next[name]
            return next
        })
    }

    const openCreateUser = () => {
        clearFeedback()
        setUserForm(USER_INITIAL_FORM)
        setFormErrors({})
        setModal({ type: 'createUser' })
    }

    const openEditUser = async (usuario) => {
        clearFeedback()
        setFormErrors({})
        setModalError('')
        setIsSubmitting(true)
        setModal({ type: 'editUser', usuario })

        try {
            const fullUser = await apiGet(`/api/usuarios/${usuario.id_usuario}`)
            const perfil = fullUser.perfil || {}

            setUserForm({
                ...USER_INITIAL_FORM,
                nombre: fullUser.nombre || '',
                correo: fullUser.correo || '',
                telefono: fullUser.telefono || '',
                rol: fullUser.rol || usuario.rol,
                departamento: perfil.departamento || '',
                municipio: perfil.municipio || '',
                zona: perfil.zona || '',
                direccion_detalle: perfil.direccion_detalle || '',
                id_organizacion: perfil.id_organizacion ? String(perfil.id_organizacion) : '',
                cargo: perfil.cargo || ''
            })
        } catch (error) {
            setModalError(error.message || 'No se pudo cargar el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openDeleteUser = (usuario) => {
        clearFeedback()
        setModal({ type: 'deleteUser', usuario })
    }

    const submitUserForm = async (event) => {
        event.preventDefault()

        const mode = modal?.type === 'createUser' ? 'create' : 'edit'
        const nextErrors = validateUserForm(userForm, mode)
        setFormErrors(nextErrors)
        setModalError('')
        setSuccessMessage('')

        if (Object.keys(nextErrors).length > 0) return

        setIsSubmitting(true)

        try {
            if (mode === 'create') {
                await apiPost('/api/usuarios', buildUserPayload(userForm, true))
                setSuccessMessage('Usuario creado con exito')
            } else {
                await apiPut(`/api/usuarios/${modal.usuario.id_usuario}`, buildUserPayload(userForm, false))
                setSuccessMessage('Usuario actualizado con exito')
            }

            await loadUsers()
            closeModal()
        } catch (error) {
            setModalError(error.message || 'No se pudo guardar el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmDeleteUser = async () => {
        if (!modal?.usuario) return

        setIsSubmitting(true)
        setModalError('')
        setSuccessMessage('')

        try {
            await apiDelete(`/api/usuarios/${modal.usuario.id_usuario}`)
            await loadUsers()
            setSuccessMessage('Usuario eliminado con exito')
            closeModal()
        } catch (error) {
            setModalError(error.message || 'No se pudo eliminar el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleCampaignStatus = async (publicacion) => {
        const nextStatus = publicacion.estado === 'cancelada' ? 'activa' : 'cancelada'
        setSavingCampaignId(publicacion.id_publicacion)
        setCampaignsError('')
        setSuccessMessage('')

        try {
            await apiPut(`/api/publicaciones/${publicacion.id_publicacion}/estado`, { estado: nextStatus })
            setPublicaciones((previous) => previous.map((item) => (
                item.id_publicacion === publicacion.id_publicacion
                    ? { ...item, estado: nextStatus }
                    : item
            )))
            window.dispatchEvent(new Event('admin:campaigns-changed'))
            localStorage.setItem('admin_campaigns_changed_at', String(Date.now()))
            setSuccessMessage(`Campana ${nextStatus === 'activa' ? 'activada' : 'desactivada'} con exito`)
        } catch (error) {
            setCampaignsError(error.message || 'No se pudo cambiar el estado de la campana')
        } finally {
            setSavingCampaignId(null)
        }
    }

    const renderUsersTable = () => {
        if (usersError) return <ErrorView message={usersError} onRetry={loadUsers} />
        if (usuarios.length === 0 && !loadingUsers) return <div className="empty-box">No hay usuarios registrados.</div>

        return (
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Telefono</th>
                            <th>Rol</th>
                            <th>Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingUsers
                            ? <SkeletonRows cols={5} rows={4} />
                            : usuarios.map((usuario) => {
                            const isSelf = usuarioSesion?.id_usuario === usuario.id_usuario

                            return (
                                <tr key={usuario.id_usuario}>
                                    <td>
                                        <div className="admin-table-primary">{usuario.nombre}</div>
                                        <div className="admin-table-muted">{usuario.correo}</div>
                                    </td>
                                    <td>{usuario.telefono}</td>
                                    <td>
                                        <span className={`admin-status-pill admin-status-${usuario.rol}`}>
                                            {roleLabel(usuario.rol)}
                                        </span>
                                    </td>
                                    <td>{formatDate(usuario.fecha_registro)}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button"
                                                onClick={() => openEditUser(usuario)}
                                                aria-label={`Editar ${usuario.nombre}`}
                                            >
                                                <IconEdit />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-icon-button admin-icon-button-danger"
                                                onClick={() => openDeleteUser(usuario)}
                                                disabled={isSelf}
                                                title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}
                                                aria-label={`Eliminar ${usuario.nombre}`}
                                            >
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    const renderCampaignsTable = () => {
        if (campaignsError) return <ErrorView message={campaignsError} onRetry={loadCampaigns} />
        if (publicaciones.length === 0 && !loadingCampaigns) return <div className="empty-box">No hay campanas registradas.</div>

        return (
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Campana</th>
                            <th>Organizacion</th>
                            <th>Progreso</th>
                            <th>Fechas</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingCampaigns
                            ? <SkeletonRows cols={5} rows={4} />
                            : publicaciones.map((publicacion) => {
                            const progress = getProgress(publicacion)
                            const isVisible = publicacion.estado !== 'cancelada'
                            const isSaving = savingCampaignId === publicacion.id_publicacion

                            return (
                                <tr key={publicacion.id_publicacion}>
                                    <td>
                                        <div className="admin-table-primary">{publicacion.titulo}</div>
                                        <div className="admin-table-muted">{publicacion.categoria || 'Sin categoria'}</div>
                                    </td>
                                    <td>{publicacion.organizacion || 'Sin organizacion'}</td>
                                    <td>
                                        <div className="admin-progress-cell">
                                            <span>{progress}%</span>
                                            <div className="progress-track admin-progress-track">
                                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>{formatDate(publicacion.fecha_publicacion)}</div>
                                        <div className="admin-table-muted">Limite: {formatDate(publicacion.fecha_limite)}</div>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`admin-switch ${isVisible ? 'admin-switch-active' : ''}`}
                                            onClick={() => toggleCampaignStatus(publicacion)}
                                            disabled={isSaving}
                                            aria-pressed={isVisible}
                                        >
                                            <span className="admin-switch-knob" />
                                            <span>{isSaving ? 'Guardando...' : campaignStatusLabel(publicacion.estado)}</span>
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    const currentModal = (() => {

        if (modal?.type === 'createUser' || modal?.type === 'editUser') {
            const isCreate = modal.type === 'createUser'

            return (
                <AdminModal
                    title={isCreate ? 'Nuevo usuario' : 'Editar usuario'}
                    description={isCreate ? 'Crea una cuenta operativa para la plataforma.' : 'Actualiza los datos principales de esta cuenta.'}
                    onClose={closeModal}
                    footer={(
                        <>
                            <button type="button" className="profile-cancel-button" onClick={closeModal} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="submit" form="admin-user-form" className="btn-confirmar admin-submit-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
                            </button>
                        </>
                    )}
                >
                    {modalError && <div className="error-box">{modalError}</div>}
                    <form id="admin-user-form" onSubmit={submitUserForm} noValidate>
                        <UserFormFields
                            form={userForm}
                            errors={formErrors}
                            mode={isCreate ? 'create' : 'edit'}
                            organizaciones={organizaciones}
                            orgLoading={orgLoading}
                            orgError={orgError}
                            onChange={handleUserFormChange}
                        />
                    </form>
                </AdminModal>
            )
        }

        if (modal?.type === 'deleteUser') {
            return (
                <AdminModal
                    title="Eliminar usuario"
                    description="Esta accion no se puede deshacer si el usuario no tiene informacion asociada."
                    onClose={closeModal}
                    footer={(
                        <>
                            <button type="button" className="profile-cancel-button" onClick={closeModal} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="button" className="admin-danger-button" onClick={confirmDeleteUser} disabled={isSubmitting}>
                                {isSubmitting ? 'Eliminando...' : 'Eliminar usuario'}
                            </button>
                        </>
                    )}
                >
                    {modalError && <div className="error-box">{modalError}</div>}
                    <p className="admin-confirm-text">
                        Vas a eliminar a <strong>{modal.usuario.nombre}</strong>. Si tiene donaciones o publicaciones,
                        el backend rechazara la operacion para proteger el historial.
                    </p>
                </AdminModal>
            )
        }

        return null
    })()

    return (
        <section className="admin-page fade-in">
            <header className="admin-hero">
                <div>
                    <p className="page-kicker">Administracion</p>
                    <h1 className="admin-title">Panel de Administrador</h1>
                    <p className="admin-subtitle">
                        Gestiona usuarios y controla la visibilidad operativa de las campanas.
                    </p>
                </div>
                <div className="admin-hero-stat">
                    <strong>{usuarios.length}</strong>
                    <span>usuarios</span>
                </div>
                <div className="admin-hero-stat">
                    <strong>{publicaciones.length}</strong>
                    <span>campanas</span>
                </div>
            </header>

            {successMessage && (
                <div className="admin-toast">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {successMessage}
                </div>
            )}

            <div className="admin-layout">
                <aside className="admin-sidebar">
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => setActiveTab('usuarios')}
                    >
                        <IconUsers />
                        <span>Usuarios</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'campanas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('campanas')}
                    >
                        <IconCampaigns />
                        <span>Campanas</span>
                    </button>
                </aside>

                <section className="admin-content-panel">
                    {activeTab === 'usuarios' ? (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestion de usuarios</h2>
                                    <p>Administra cuentas de donantes, intermediarios y administradores.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateUser}>
                                    <IconPlus />
                                    <span>Nuevo Usuario</span>
                                </button>
                            </div>
                            {renderUsersTable()}
                        </>
                    ) : (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestion de campanas</h2>
                                    <p>Activa o desactiva campanas publicadas en la plataforma.</p>
                                </div>
                            </div>
                            {renderCampaignsTable()}
                        </>
                    )}
                </section>
            </div>

            {currentModal}
        </section>
    )
}

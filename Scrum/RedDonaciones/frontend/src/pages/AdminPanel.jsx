import React from 'react'
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'
import './AdminPanel.css'

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

const CAMP_INITIAL_FORM = {
    titulo: '',
    descripcion: '',
    cantidad_necesaria: '',
    fecha_publicacion: '',
    fecha_limite: '',
    estado: 'activa',
    id_intermediario: '',
    id_organizacion: '',
    id_articulo: '',
    imagen_url: ''
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

function IconToggle({ checked }) {
    return (
        <svg viewBox="0 0 24 24" className={`admin-action-icon ${checked ? 'checked' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'all 0.2s ease' }}>
            <rect x="2" y="6" width="20" height="12" rx="6" ry="6" fill={checked ? "var(--success)" : "var(--danger)"} stroke={checked ? "var(--success)" : "var(--danger)"} />
            <circle cx={checked ? "16" : "8"} cy="12" r="3.5" fill="#ffffff" stroke="#ffffff" style={{ transition: 'all 0.2s ease' }} />
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
        if (form.password && form.password.length < 8) {
            errors.password = 'La contraseña debe tener al menos 8 caracteres'
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
        if (!form.id_organizacion) errors.id_organizacion = 'Selecciona una organización'
        if (!form.cargo.trim()) errors.cargo = 'El cargo es obligatorio'
    }

    return errors;
}

function ConfirmationModal({ isOpen, title, message, onCancel, onConfirm, isSubmitting }) {
    if (!isOpen) return null;
    return (
        <AdminModal
            title={title}
            onClose={onCancel}
            sizeClass="modal-confirm"
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="button" className="admin-danger-button" onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirmando...' : 'Confirmar'}
                    </button>
                </>
            )}
        >
            <p className="admin-confirm-text">{message}</p>
        </AdminModal>
    )
}

function AdminModal({ title, description, children, footer, onClose, sizeClass = '' }) {
    return (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className={`admin-modal ${sizeClass}`}
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
                    <label className="form-label" htmlFor="admin-user-password">Contraseña temporal</label>
                    <input
                        id="admin-user-password"
                        type="password"
                        className={`form-input ${errors.password ? 'form-input-invalid' : ''}`}
                        name="password"
                        placeholder="Dejar en blanco para autogenerar automáticamente"
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
                        <label className="form-label" htmlFor="admin-user-organizacion">Organización</label>
                        <select
                            id="admin-user-organizacion"
                            className={`form-select ${errors.id_organizacion ? 'form-input-invalid' : ''}`}
                            name="id_organizacion"
                            value={form.id_organizacion}
                            onChange={onChange}
                            disabled={orgLoading}
                        >
                            <option value="">Selecciona una organización</option>
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
    const [articulos, setArticulos] = React.useState([])
    const [loadingUsers, setLoadingUsers] = React.useState(true)
    const [loadingCampaigns, setLoadingCampaigns] = React.useState(true)
    const [orgLoading, setOrgLoading] = React.useState(false)
    const [usersError, setUsersError] = React.useState('')
    const [campaignsError, setCampaignsError] = React.useState('')
    const [orgError, setOrgError] = React.useState('')
    const [campForm, setCampForm] = React.useState(CAMP_INITIAL_FORM)
    const [campFormErrors, setCampFormErrors] = React.useState({})
    const [imagePreview, setImagePreview] = React.useState(null)
    const [uploadingImage, setUploadingImage] = React.useState(false)
    const [orgForm, setOrgForm] = React.useState({
        nombre: '',
        descripcion: '',
        direccion: '',
        telefono: '',
        correo: '',
        estado_verificacion: 'pendiente'
    })
    const [orgFormErrors, setOrgFormErrors] = React.useState({})
    const [successMessage, setSuccessMessage] = React.useState('')
    const [modal, setModal] = React.useState(null)
    const [userForm, setUserForm] = React.useState(USER_INITIAL_FORM)
    const [formErrors, setFormErrors] = React.useState({})
    const [modalError, setModalError] = React.useState('')
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [savingCampaignId, setSavingCampaignId] = React.useState(null)
    const [copied, setCopied] = React.useState(false)
    const [confirmModal, setConfirmModal] = React.useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    })

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

    const loadOrganizations = React.useCallback(async () => {
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
    }, [])

    const ensureOrganizations = React.useCallback(async () => {
        if (organizaciones.length > 0 || orgLoading) return
        await loadOrganizations()
    }, [organizaciones.length, orgLoading, loadOrganizations])

    const loadArticulos = React.useCallback(async () => {
        try {
            const data = await apiGet('/api/articulos')
            setArticulos(Array.isArray(data) ? data : [])
        } catch {
            // no bloqueante
        }
    }, [])

    React.useEffect(() => {
        loadUsers()
        loadCampaigns()
        loadArticulos()
    }, [loadUsers, loadCampaigns, loadArticulos])

    React.useEffect(() => {
        if (activeTab === 'organizaciones') {
            ensureOrganizations()
        }
    }, [activeTab, ensureOrganizations])

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
        setOrgFormErrors({})
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

    const openCreateOrg = () => {
        clearFeedback()
        setOrgForm({
            nombre: '',
            descripcion: '',
            direccion: '',
            telefono: '',
            correo: '',
            estado_verificacion: 'pendiente'
        })
        setOrgFormErrors({})
        setModal({ type: 'createOrg' })
    }

    const openCreateCampaign = () => {
        clearFeedback()
        setCampForm(CAMP_INITIAL_FORM)
        setCampFormErrors({})
        setImagePreview(null)
        ensureOrganizations()
        setModal({ type: 'createCampaign' })
    }

    const handleCampChange = (event) => {
        const { name, value } = event.target
        setCampForm((prev) => ({ ...prev, [name]: value }))
        setCampFormErrors((prev) => {
            if (!prev[name]) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })
        setModalError(null)
    }

    const handleImageChange = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        const MAX_SIZE = 5 * 1024 * 1024

        if (!ALLOWED_TYPES.includes(file.type)) {
            setCampFormErrors((prev) => ({ ...prev, imagen_url: 'Formato no permitido. Solo JPG, PNG, GIF o WEBP' }))
            event.target.value = ''
            return
        }

        if (file.size > MAX_SIZE) {
            setCampFormErrors((prev) => ({ ...prev, imagen_url: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es 5 MB` }))
            event.target.value = ''
            return
        }

        setCampFormErrors((prev) => { const next = { ...prev }; delete next.imagen_url; return next })
        setImagePreview(URL.createObjectURL(file))
        setUploadingImage(true)
        setModalError(null)

        try {
            const result = await apiUpload(file)
            setCampForm((prev) => ({ ...prev, imagen_url: result.url }))
        } catch (error) {
            setModalError(error.message || 'No se pudo subir la imagen')
            setImagePreview(null)
            setCampForm((prev) => ({ ...prev, imagen_url: '' }))
        } finally {
            setUploadingImage(false)
        }
    }

    const submitCampForm = async (event) => {
        event.preventDefault()
        const errors = {}
        if (!campForm.titulo.trim()) errors.titulo = 'El título es obligatorio'
        if (!campForm.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria'
        if (!campForm.cantidad_necesaria || Number(campForm.cantidad_necesaria) <= 0) errors.cantidad_necesaria = 'Ingresa una cantidad válida'
        if (!campForm.fecha_publicacion) errors.fecha_publicacion = 'La fecha de publicación es obligatoria'
        if (!campForm.fecha_limite) errors.fecha_limite = 'La fecha límite es obligatoria'
        if (!campForm.id_intermediario) errors.id_intermediario = 'Selecciona un intermediario'
        if (!campForm.id_organizacion) errors.id_organizacion = 'Selecciona una organización'
        if (!campForm.id_articulo) errors.id_articulo = 'Selecciona un artículo'
        if (!campForm.imagen_url) errors.imagen_url = 'La imagen es obligatoria'

        if (Object.keys(errors).length > 0) {
            setCampFormErrors(errors)
            return
        }

        setIsSubmitting(true)
        setModalError('')

        try {
            await apiPost('/api/publicaciones', {
                titulo: campForm.titulo.trim(),
                descripcion: campForm.descripcion.trim(),
                cantidad_necesaria: Number(campForm.cantidad_necesaria),
                fecha_publicacion: campForm.fecha_publicacion,
                fecha_limite: campForm.fecha_limite,
                estado: campForm.estado,
                id_intermediario: Number(campForm.id_intermediario),
                id_organizacion: Number(campForm.id_organizacion),
                id_articulo: Number(campForm.id_articulo),
                imagen_url: campForm.imagen_url || null
            })
            setSuccessMessage('Campaña creada con éxito')
            await loadCampaigns()
            closeModal()
        } catch (error) {
            setModalError(error.message || 'No se pudo crear la campaña')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEditOrg = (org) => {
        clearFeedback()
        setOrgFormErrors({})
        setOrgForm({
            nombre: org.nombre || '',
            descripcion: org.descripcion || '',
            direccion: org.direccion || '',
            telefono: org.telefono || '',
            correo: org.correo || '',
            estado_verificacion: org.estado_verificacion || 'pendiente'
        })
        setModal({ type: 'editOrg', org })
    }

    const handleOrgChange = (event) => {
        const { name, value } = event.target
        setOrgForm((previous) => ({
            ...previous,
            [name]: value
        }))
        setOrgFormErrors((previous) => {
            if (!previous[name]) return previous
            const next = { ...previous }
            delete next[name]
            return next
        })
        setModalError(null)
    }

    const submitOrgForm = async (event) => {
        event.preventDefault()

        setModalError('')
        setIsSubmitting(true)

        try {
            if (modal?.type === 'editOrg') {
                await apiPut(`/api/organizaciones/${modal.org.id_organizacion}`, orgForm)
                setSuccessMessage('Organización actualizada')
            } else {
                await apiPost('/api/organizaciones', orgForm)
                setSuccessMessage('Organización creada')
            }

            await loadOrganizations()
            closeModal()
        } catch (error) {
            const errMsg = error.message || ''
            if (errMsg.startsWith("Falta el campo ")) {
                const fieldName = errMsg.replace("Falta el campo ", "").trim()
                setOrgFormErrors({ [fieldName]: errMsg })
            } else {
                setModalError(errMsg || 'Error guardando organización')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const openArchivarOrg = (org) => {
        setConfirmModal({
            isOpen: true,
            title: 'Archivar Organización',
            message: `¿Estás seguro de que deseas archivar la organización "${org.nombre}"? Esta acción cambiará su estado a 'archivada'.`,
            onConfirm: async () => {
                setIsSubmitting(true)
                setModalError('')
                setSuccessMessage('')
                try {
                    await apiPut(`/api/organizaciones/${org.id_organizacion}/archivar`, {})
                    setSuccessMessage('Organización archivada')
                    await loadOrganizations()
                } catch (error) {
                    setModalError(error.message || 'No se pudo archivar la organización')
                } finally {
                    setIsSubmitting(false)
                }
            }
        })
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
                const response = await apiPost('/api/usuarios', buildUserPayload(userForm, true))
                if (response && response.password_temporal) {
                    await loadUsers()
                    setModal({ type: 'tempPassword', password: response.password_temporal, email: userForm.correo })
                } else {
                    setSuccessMessage('Usuario creado con exito')
                    await loadUsers()
                    closeModal()
                }
            } else {
                await apiPut(`/api/usuarios/${modal.usuario.id_usuario}`, buildUserPayload(userForm, false))
                setSuccessMessage('Usuario actualizado con exito')
                await loadUsers()
                closeModal()
            }
        } catch (error) {
            setModalError(error.message || 'No se pudo guardar el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openDesactivarUser = (usuario) => {
        setConfirmModal({
            isOpen: true,
            title: 'Desactivar Usuario',
            message: `¿Estás seguro de que deseas desactivar la cuenta del usuario "${usuario.nombre}"? No podra iniciar sesion temporalmente.`,
            onConfirm: async () => {
                setIsSubmitting(true)
                setModalError('')
                setSuccessMessage('')
                try {
                    await apiPut(`/api/usuarios/${usuario.id_usuario}/desactivar`, {})
                    setSuccessMessage('Usuario desactivado con exito')
                    await loadUsers()
                } catch (error) {
                    setModalError(error.message || 'No se pudo desactivar el usuario')
                } finally {
                    setIsSubmitting(false)
                }
            }
        })
    }

    const openActivarUser = (usuario) => {
        setConfirmModal({
            isOpen: true,
            title: 'Activar Usuario',
            message: `¿Estás seguro de que deseas activar la cuenta del usuario "${usuario.nombre}"? Volverá a tener acceso a la plataforma.`,
            onConfirm: async () => {
                setIsSubmitting(true)
                setModalError('')
                setSuccessMessage('')
                try {
                    await apiPut(`/api/usuarios/${usuario.id_usuario}/activar`, {})
                    setSuccessMessage('Usuario activado con éxito')
                    await loadUsers()
                } catch (error) {
                    setModalError(error.message || 'No se pudo activar el usuario')
                } finally {
                    setIsSubmitting(false)
                }
            }
        })
    }

    const openAnonimizarUser = (usuario) => {
        setConfirmModal({
            isOpen: true,
            title: 'Anonimizar Usuario (GDPR)',
            message: `¿Estás seguro de que deseas anonimizar la cuenta del usuario "${usuario.nombre}"? Se eliminaran su correo y telefono, y su nombre sera cambiado a 'Usuario Anonimizado'. Esta accion cumple con la normativa GDPR y no se puede deshacer.`,
            onConfirm: async () => {
                setIsSubmitting(true)
                setModalError('')
                setSuccessMessage('')
                try {
                    await apiPut(`/api/usuarios/${usuario.id_usuario}/anonimizar`, {})
                    setSuccessMessage('Usuario anonimizado con exito')
                    await loadUsers()
                } catch (error) {
                    setModalError(error.message || 'No se pudo anonimizar el usuario')
                } finally {
                    setIsSubmitting(false)
                }
            }
        })
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

    const handleChangeCampaignStatus = (publicacion, nextStatus) => {
        const performChange = async () => {
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
                setSuccessMessage(`Campana cambiada a "${campaignStatusLabel(nextStatus)}" con exito`)
            } catch (error) {
                setCampaignsError(error.message || 'No se pudo cambiar el estado de la campana')
            } finally {
                setSavingCampaignId(null)
            }
        }

        if (nextStatus === 'cancelada') {
            setConfirmModal({
                isOpen: true,
                title: 'Cancelar Campaña',
                message: `¿Estás seguro de que deseas cancelar la campaña "${publicacion.titulo}"? Esta acción detendrá la recolección de donaciones y no se puede deshacer.`,
                onConfirm: performChange
            })
        } else {
            performChange()
        }
    }

    const renderUsersTable = () => {
        if (usersError) return <ErrorView message={usersError} onRetry={loadUsers} />
        if (usuarios.length === 0 && !loadingUsers) return <div className="empty-box">No hay usuarios registrados.</div>

        return (
            <div className="admin-table-wrap">
                <table className="admin-table admin-table-users">
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
                                                title="Editar"
                                            >
                                                <IconEdit />
                                            </button>
                                            {usuario.activo !== 0 ? (
                                                <button
                                                    type="button"
                                                    className="admin-icon-button"
                                                    onClick={() => openDesactivarUser(usuario)}
                                                    disabled={isSelf}
                                                    aria-label={`Desactivar ${usuario.nombre}`}
                                                    title="Desactivar"
                                                >
                                                    <IconToggle checked={true} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="admin-icon-button"
                                                    onClick={() => openActivarUser(usuario)}
                                                    disabled={isSelf}
                                                    aria-label={`Activar ${usuario.nombre}`}
                                                    title="Activar"
                                                >
                                                    <IconToggle checked={false} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="admin-icon-button admin-icon-button-danger"
                                                onClick={() => openAnonimizarUser(usuario)}
                                                disabled={isSelf || usuario.nombre === 'Usuario Anonimizado'}
                                                aria-label={`Anonimizar ${usuario.nombre}`}
                                                title="Anonimizar"
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
                <table className="admin-table admin-table-campaigns">
                    <thead>
                        <tr>
                            <th>Campana</th>
                            <th>Organización</th>
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
                            const isSaving = savingCampaignId === publicacion.id_publicacion
                            
                            const statusClass = publicacion.estado === 'activa'
                                ? 'status-active'
                                : publicacion.estado === 'finalizada'
                                ? 'status-finished'
                                : publicacion.estado === 'cancelada'
                                ? 'status-canceled'
                                : ''

                            return (
                                <tr key={publicacion.id_publicacion}>
                                    <td>
                                        <div className="admin-table-primary">{publicacion.titulo}</div>
                                        <div className="admin-table-muted">{publicacion.categoria || 'Sin categoria'}</div>
                                    </td>
                                    <td>{publicacion.organizacion || 'Sin organización'}</td>
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
                                        <select
                                            className={`form-select admin-select-status campaign-select-status ${statusClass}`}
                                            value={publicacion.estado}
                                            onChange={(e) => handleChangeCampaignStatus(publicacion, e.target.value)}
                                            disabled={isSaving}
                                        >
                                            <option value="activa">Activa</option>
                                            <option value="finalizada">Finalizada</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
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

        if (modal?.type === 'createCampaign') {
            const intermediarios = usuarios.filter((u) => u.rol === 'intermediario')
            return (
                <AdminModal
                    title="Nueva campaña"
                    description="Crea una campaña de recolección de donaciones."
                    onClose={closeModal}
                    footer={(
                        <>
                            <button type="button" className="profile-cancel-button" onClick={closeModal} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="submit" form="camp-form" className="btn-confirmar admin-submit-button" disabled={isSubmitting || uploadingImage}>
                                {isSubmitting ? 'Guardando...' : 'Crear campaña'}
                            </button>
                        </>
                    )}
                >
                    {modalError && <div className="error-box">{modalError}</div>}
                    <form id="camp-form" onSubmit={submitCampForm} noValidate>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Título</label>
                                <input className={`form-input ${campFormErrors.titulo ? 'form-input-invalid' : ''}`} name="titulo" value={campForm.titulo} onChange={handleCampChange} />
                                {campFormErrors.titulo && <span className="form-error-text">{campFormErrors.titulo}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Descripción</label>
                                <textarea className={`form-textarea ${campFormErrors.descripcion ? 'form-input-invalid' : ''}`} name="descripcion" value={campForm.descripcion} onChange={handleCampChange} />
                                {campFormErrors.descripcion && <span className="form-error-text">{campFormErrors.descripcion}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Cantidad necesaria</label>
                                <input className={`form-input ${campFormErrors.cantidad_necesaria ? 'form-input-invalid' : ''}`} name="cantidad_necesaria" type="number" min="1" value={campForm.cantidad_necesaria} onChange={handleCampChange} />
                                {campFormErrors.cantidad_necesaria && <span className="form-error-text">{campFormErrors.cantidad_necesaria}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Fecha de publicación</label>
                                <input className={`form-input ${campFormErrors.fecha_publicacion ? 'form-input-invalid' : ''}`} name="fecha_publicacion" type="date" value={campForm.fecha_publicacion} onChange={handleCampChange} />
                                {campFormErrors.fecha_publicacion && <span className="form-error-text">{campFormErrors.fecha_publicacion}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Fecha límite</label>
                                <input className={`form-input ${campFormErrors.fecha_limite ? 'form-input-invalid' : ''}`} name="fecha_limite" type="date" value={campForm.fecha_limite} onChange={handleCampChange} />
                                {campFormErrors.fecha_limite && <span className="form-error-text">{campFormErrors.fecha_limite}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Estado</label>
                                <select className="form-select" name="estado" value={campForm.estado} onChange={handleCampChange}>
                                    <option value="activa">Activa</option>
                                    <option value="finalizada">Finalizada</option>
                                    <option value="cancelada">Cancelada</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Intermediario</label>
                                <select className={`form-select ${campFormErrors.id_intermediario ? 'form-input-invalid' : ''}`} name="id_intermediario" value={campForm.id_intermediario} onChange={handleCampChange}>
                                    <option value="">Selecciona un intermediario</option>
                                    {intermediarios.map((u) => (
                                        <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                                    ))}
                                </select>
                                {campFormErrors.id_intermediario && <span className="form-error-text">{campFormErrors.id_intermediario}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Organización</label>
                                <select className={`form-select ${campFormErrors.id_organizacion ? 'form-input-invalid' : ''}`} name="id_organizacion" value={campForm.id_organizacion} onChange={handleCampChange}>
                                    <option value="">Selecciona una organización</option>
                                    {organizaciones.map((o) => (
                                        <option key={o.id_organizacion} value={o.id_organizacion}>{o.nombre}</option>
                                    ))}
                                </select>
                                {campFormErrors.id_organizacion && <span className="form-error-text">{campFormErrors.id_organizacion}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Artículo</label>
                                <select className={`form-select ${campFormErrors.id_articulo ? 'form-input-invalid' : ''}`} name="id_articulo" value={campForm.id_articulo} onChange={handleCampChange}>
                                    <option value="">Selecciona un artículo</option>
                                    {articulos.map((a) => (
                                        <option key={a.id_articulo} value={a.id_articulo}>{a.nombre}</option>
                                    ))}
                                </select>
                                {campFormErrors.id_articulo && <span className="form-error-text">{campFormErrors.id_articulo}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Imagen</label>
                                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange} disabled={uploadingImage} className={`form-input ${campFormErrors.imagen_url ? 'form-input-invalid' : ''}`} />
                                {uploadingImage && <span className="form-error-text" style={{ color: 'var(--primary)' }}>Subiendo imagen...</span>}
                                {campFormErrors.imagen_url && <span className="form-error-text">{campFormErrors.imagen_url}</span>}
                                {imagePreview && !uploadingImage && (
                                    <img src={imagePreview} alt="Vista previa" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                                )}
                            </div>
                        </div>
                    </form>
                </AdminModal>
            )
        }

        if (modal?.type === 'createOrg' || modal?.type === 'editOrg') {
            return (
                <AdminModal
                    title={modal.type === 'editOrg' ? 'Editar organización' : 'Nueva organización'}
                    description={modal.type === 'editOrg' ? 'Actualiza los datos de la organización.' : 'Crea una organización en la plataforma'}
                    onClose={closeModal}
                    footer={(
                        <>
                            <button type="button" className="profile-cancel-button" onClick={closeModal} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="org-form"
                                className="btn-confirmar admin-submit-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </button>
                        </>
                    )}
                >
                    {modalError && <div className="error-box">{modalError}</div>}

                    <form id="org-form" onSubmit={submitOrgForm}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Nombre</label>
                                <input
                                    className={`form-input ${orgFormErrors.nombre ? 'form-input-invalid' : ''}`}
                                    name="nombre"
                                    value={orgForm.nombre}
                                    onChange={handleOrgChange}
                                />
                                {orgFormErrors.nombre && <span className="form-error-text org-field-error-text">{orgFormErrors.nombre}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Descripcion</label>
                                <textarea
                                    className={`form-textarea ${orgFormErrors.descripcion ? 'form-input-invalid' : ''}`}
                                    name="descripcion"
                                    value={orgForm.descripcion}
                                    onChange={handleOrgChange}
                                />
                                {orgFormErrors.descripcion && <span className="form-error-text org-field-error-text">{orgFormErrors.descripcion}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Direccion</label>
                                <input
                                    className={`form-input ${orgFormErrors.direccion ? 'form-input-invalid' : ''}`}
                                    name="direccion"
                                    value={orgForm.direccion}
                                    onChange={handleOrgChange}
                                />
                                {orgFormErrors.direccion && <span className="form-error-text org-field-error-text">{orgFormErrors.direccion}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Telefono</label>
                                <input
                                    className={`form-input ${orgFormErrors.telefono ? 'form-input-invalid' : ''}`}
                                    name="telefono"
                                    value={orgForm.telefono}
                                    onChange={handleOrgChange}
                                />
                                {orgFormErrors.telefono && <span className="form-error-text org-field-error-text">{orgFormErrors.telefono}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Correo</label>
                                <input
                                    className={`form-input ${orgFormErrors.correo ? 'form-input-invalid' : ''}`}
                                    name="correo"
                                    value={orgForm.correo}
                                    onChange={handleOrgChange}
                                />
                                {orgFormErrors.correo && <span className="form-error-text org-field-error-text">{orgFormErrors.correo}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label">Estado</label>
                                <select
                                    className="form-select"
                                    name="estado_verificacion"
                                    value={orgForm.estado_verificacion}
                                    onChange={handleOrgChange}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="verificada">Verificada</option>
                                    <option value="rechazada">Rechazada</option>
                                    <option value="inactiva">Inactiva</option>
                                    <option value="archivada">Archivada</option>
                                </select>
                            </div>
                        </div>
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

        if (modal?.type === 'tempPassword') {
            const handleCopy = () => {
                navigator.clipboard.writeText(modal.password)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }

            return (
                <AdminModal
                    title="Contraseña Temporal Generada"
                    description="Se ha creado el usuario con una contraseña temporal. Por favor, cópiala y compártela de forma segura."
                    onClose={closeModal}
                    footer={(
                        <button type="button" className="btn-confirmar temp-password-close-btn" onClick={closeModal}>
                            He guardado la contraseña
                        </button>
                    )}
                >
                    <div className="temp-password-box">
                        <p className="temp-password-user-label">
                            <strong>Usuario:</strong> {modal.email}
                        </p>
                        <div className="temp-password-value-container">
                            <span className="temp-password-monospace">
                                {modal.password}
                            </span>
                            <button
                                type="button"
                                className="profile-edit-button temp-password-copy-btn"
                                onClick={handleCopy}
                            >
                                {copied ? 'Copiado' : 'Copiar Contraseña'}
                            </button>
                        </div>
                    </div>
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
                        className={`admin-tab-button ${activeTab === 'organizaciones' ? 'active' : ''}`}
                        onClick={() => setActiveTab('organizaciones')}
                    >
                        <IconUsers />
                        <span>Organizaciones</span>
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
                    ) : activeTab === 'organizaciones' ? (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestión de organizaciones</h2>
                                    <p>Administra organizaciones registradas en la plataforma.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateOrg}>
                                    <IconPlus />
                                    <span>Nueva Organización</span>
                                </button>
                            </div>

                            {orgError && <ErrorView message={orgError} onRetry={ensureOrganizations} />}
                            {orgLoading && <div className="empty-box">Cargando organizaciones...</div>}
                            {!orgLoading && !orgError && organizaciones.length === 0 && (
                                <div className="empty-box">No hay organizaciones registradas.</div>
                            )}
                            {!orgLoading && !orgError && organizaciones.length > 0 && (
                                <div className="admin-table-wrap">
                                    <table className="admin-table admin-table-orgs">
                                        <thead>
                                            <tr>
                                                <th>Organización</th>
                                                <th>Estado</th>
                                                <th>Dirección</th>
                                                <th>Telefono</th>
                                                <th>Correo</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {organizaciones.map((org) => (
                                                <tr key={org.id_organizacion}>
                                                    <td>
                                                        <div className="admin-table-primary">{org.nombre}</div>
                                                        <div className="admin-table-muted">{org.descripcion || 'Sin descripción'}</div>
                                                    </td>
                                                    <td>{org.estado_verificacion || 'Sin estado'}</td>
                                                    <td>{org.direccion || '-'}</td>
                                                    <td>{org.telefono || '-'}</td>
                                                    <td>{org.correo || '-'}</td>
                                                    <td>
                                                        <div className="admin-row-actions">
                                                            <button
                                                                type="button"
                                                                className="admin-icon-button"
                                                                onClick={() => openEditOrg(org)}
                                                                title="Editar"
                                                                aria-label={`Editar ${org.nombre}`}
                                                            >
                                                                <IconEdit />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-icon-button admin-icon-button-danger"
                                                                onClick={() => openArchivarOrg(org)}
                                                                disabled={isSubmitting}
                                                                title="Archivar"
                                                                aria-label={`Archivar ${org.nombre}`}
                                                            >
                                                                <IconTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestion de campanas</h2>
                                    <p>Activa o desactiva campanas publicadas en la plataforma.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateCampaign}>
                                    <IconPlus />
                                    <span>Nueva Campaña</span>
                                </button>
                            </div>
                            {renderCampaignsTable()}
                        </>
                    )}
                </section>
            </div>

            {currentModal}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={async () => {
                    if (confirmModal.onConfirm) {
                        await confirmModal.onConfirm()
                    }
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }}
                isSubmitting={isSubmitting}
            />
        </section>
    )
}

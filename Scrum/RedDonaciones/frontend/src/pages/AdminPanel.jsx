// Contenedor del panel de administrador: mantiene todo el estado y las
// llamadas a la API. La presentacion (tablas, modales, formularios) vive en
// pages/admin/ y recibe todo por props.
import React from 'react'
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../utils/api'
import { IconUsers, IconCampaigns, IconPlus } from '../components/icons'
import {
    USER_INITIAL_FORM,
    CAMP_INITIAL_FORM,
    buildOrgPayload,
    validateOrgForm,
    buildUserPayload,
    validateUserForm
} from './admin/adminForms'
import { campaignStatusLabel } from './admin/adminHelpers'
import AdminUsersTable from './admin/AdminUsersTable'
import AdminOrgsTable from './admin/AdminOrgsTable'
import AdminCampaignsTable from './admin/AdminCampaignsTable'
import AdminModal from './admin/AdminModal'
import UserFormModal from './admin/UserFormModal'
import CampaignFormModal from './admin/CampaignFormModal'
import OrgFormModal from './admin/OrgFormModal'
import TempPasswordModal from './admin/TempPasswordModal'
import ConfirmationModal from './admin/ConfirmationModal'
import './AdminPanel.css'

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
            setCampaignsError(error.message || 'No se pudieron cargar las campañas')
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
            const data = await apiGet('/api/organizaciones?vista=admin')
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
        const errors = validateOrgForm(orgForm)
        setOrgFormErrors(errors)
        if (Object.keys(errors).length > 0) {
            return
        }

        setIsSubmitting(true)
        const payload = buildOrgPayload(orgForm)

        try {
            if (modal?.type === 'editOrg') {
                await apiPut(`/api/organizaciones/${modal.org.id_organizacion}`, payload)
                setSuccessMessage('Organización actualizada')
            } else {
                await apiPost('/api/organizaciones', payload)
                setSuccessMessage('Organización creada')
            }

            await loadOrganizations()
            closeModal()
        } catch (error) {
            const fieldErrors = error.body?.campos
            if (fieldErrors && typeof fieldErrors === 'object') {
                setOrgFormErrors(fieldErrors)
            } else {
                const errMsg = error.message || ''
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
            message: `¿Estás seguro de que deseas desactivar la cuenta del usuario "${usuario.nombre}"? No podrá iniciar sesión temporalmente.`,
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
                setCampaignsError(error.message || 'No se pudo cambiar el estado de la campaña')
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

    const handleCopyTempPassword = () => {
        navigator.clipboard.writeText(modal.password)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const currentModal = (() => {
        if (modal?.type === 'createUser' || modal?.type === 'editUser') {
            return (
                <UserFormModal
                    isCreate={modal.type === 'createUser'}
                    form={userForm}
                    errors={formErrors}
                    organizaciones={organizaciones}
                    orgLoading={orgLoading}
                    orgError={orgError}
                    onChange={handleUserFormChange}
                    onSubmit={submitUserForm}
                    onClose={closeModal}
                    isSubmitting={isSubmitting}
                    modalError={modalError}
                />
            )
        }

        if (modal?.type === 'createCampaign') {
            return (
                <CampaignFormModal
                    campForm={campForm}
                    campFormErrors={campFormErrors}
                    articulos={articulos}
                    organizaciones={organizaciones}
                    intermediarios={usuarios.filter((u) => u.rol === 'intermediario')}
                    onChange={handleCampChange}
                    onImageChange={handleImageChange}
                    onSubmit={submitCampForm}
                    onClose={closeModal}
                    isSubmitting={isSubmitting}
                    uploadingImage={uploadingImage}
                    imagePreview={imagePreview}
                    modalError={modalError}
                />
            )
        }

        if (modal?.type === 'createOrg' || modal?.type === 'editOrg') {
            return (
                <OrgFormModal
                    isEdit={modal.type === 'editOrg'}
                    orgForm={orgForm}
                    orgFormErrors={orgFormErrors}
                    onChange={handleOrgChange}
                    onSubmit={submitOrgForm}
                    onClose={closeModal}
                    isSubmitting={isSubmitting}
                    modalError={modalError}
                />
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
            return (
                <TempPasswordModal
                    email={modal.email}
                    password={modal.password}
                    onClose={closeModal}
                    copied={copied}
                    onCopy={handleCopyTempPassword}
                />
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
                        Gestiona usuarios y controla la visibilidad operativa de las campañas.
                    </p>
                </div>
                <div className="admin-hero-stat">
                    <strong>{usuarios.length}</strong>
                    <span>usuarios</span>
                </div>
                <div className="admin-hero-stat">
                    <strong>{publicaciones.length}</strong>
                    <span>Campañas</span>
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
                        <IconUsers className="admin-svg-icon" />
                        <span>Usuarios</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'organizaciones' ? 'active' : ''}`}
                        onClick={() => setActiveTab('organizaciones')}
                    >
                        <IconUsers className="admin-svg-icon" />
                        <span>Organizaciones</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'campanas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('campanas')}
                    >
                        <IconCampaigns className="admin-svg-icon" />
                        <span>Campañas</span>
                    </button>
                </aside>

                <section className="admin-content-panel">
                    {activeTab === 'usuarios' ? (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestión de usuarios</h2>
                                    <p>Administra cuentas de donantes, intermediarios y administradores.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateUser}>
                                    <IconPlus className="admin-button-icon" />
                                    <span>Nuevo Usuario</span>
                                </button>
                            </div>
                            <AdminUsersTable
                                usuarios={usuarios}
                                loadingUsers={loadingUsers}
                                usersError={usersError}
                                usuarioSesion={usuarioSesion}
                                onRetry={loadUsers}
                                onEdit={openEditUser}
                                onDesactivar={openDesactivarUser}
                                onActivar={openActivarUser}
                                onAnonimizar={openAnonimizarUser}
                            />
                        </>
                    ) : activeTab === 'organizaciones' ? (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestión de organizaciones</h2>
                                    <p>Administra organizaciones registradas en la plataforma.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateOrg}>
                                    <IconPlus className="admin-button-icon" />
                                    <span>Nueva Organización</span>
                                </button>
                            </div>
                            <AdminOrgsTable
                                organizaciones={organizaciones}
                                orgLoading={orgLoading}
                                orgError={orgError}
                                isSubmitting={isSubmitting}
                                onRetry={ensureOrganizations}
                                onEdit={openEditOrg}
                                onArchivar={openArchivarOrg}
                            />
                        </>
                    ) : (
                        <>
                            <div className="admin-section-head">
                                <div>
                                    <h2>Gestión de campañas</h2>
                                    <p>Activa o desactiva campañas publicadas en la plataforma.</p>
                                </div>
                                <button type="button" className="admin-primary-action" onClick={openCreateCampaign}>
                                    <IconPlus className="admin-button-icon" />
                                    <span>Nueva Campaña</span>
                                </button>
                            </div>
                            <AdminCampaignsTable
                                publicaciones={publicaciones}
                                loadingCampaigns={loadingCampaigns}
                                campaignsError={campaignsError}
                                savingCampaignId={savingCampaignId}
                                onRetry={loadCampaigns}
                                onStatusChange={handleChangeCampaignStatus}
                            />
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

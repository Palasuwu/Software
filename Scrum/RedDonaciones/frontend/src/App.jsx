import React from 'react'
import { motion } from 'framer-motion'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom'
import MisDonacionesPage from './pages/MisDonacionesPage'
import Spinner from './components/Spinner'
import ErrorView from './components/ErrorView'
import DetailPage from './pages/DetailPage'
import AuthPage from './pages/AuthPage'
import DonationHistoryDetailPage from './pages/DonationHistoryDetailPage'
import LandingPage from './pages/LandingPage'
import OrganizacionesPage from './pages/OrganizacionesPage'
import OrgaDetailPage from './pages/OrgaDetailPage'
import AdminPanel from './pages/AdminPanel'
import OrgaPanel from './pages/OrgaPanel'
import HomePage from './pages/HomePage'
import NavBar from './components/NavBar'
import { apiGet, apiPut } from './utils/api'
import { obtenerTokenSesion, obtenerUsuarioSesion, limpiarUsuarioSesion, limpiarTokenSesion, guardarUsuarioSesion } from './utils/session'

function IconBrand() {
  return (
    <svg viewBox="0 0 24 24" className="brand-icon" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function IconDonation() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l7 4v6c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg className="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
    </svg>
  )
}

function roleLabel(role) {
  if (!role) return 'Sin rol'
  if (role === 'donante') return 'Donante'
  if (role === 'intermediario') return 'Intermediario'
  return role
}

function BottomNav({ isAuthenticated, usuarioSesion, onLogout }) {
  const isAdmin = usuarioSesion?.rol === 'administrador'
  const isIntermediario = usuarioSesion?.rol === 'intermediario'

  return (
    <nav className="bottom-nav">
      <NavLink to="/home" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconHome />
        <span>Inicio</span>
      </NavLink>

      <NavLink to="/organizaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconUsers />
        <span>Organizaciones</span>
      </NavLink>

      {isAuthenticated ? (
        <>
          <NavLink to="/donaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconDonation />
            <span>Historial</span>
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconUser />
            <span>Perfil</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconAdmin />
              <span>Admin</span>
            </NavLink>
          )}

          {isIntermediario && (
            <NavLink to="/intermediario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconUsers />
              <span>Mi Org</span>
            </NavLink>
          )}
          <button type="button" className="nav-item nav-item-button" onClick={onLogout}>
            <IconRegister />
            <span>Salir</span>
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconUser />
            <span>Login</span>
          </NavLink>
        </>
      )}
    </nav>
  )
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
    id_organizacion: datosPerfil.id_organizacion ? String(datosPerfil.id_organizacion) : '',
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
    errors.correo = 'Ingresa un correo valido'
  }

  if (!form.telefono.trim()) {
    errors.telefono = 'El telefono es obligatorio'
  } else if (!/^[0-9\-+()\s]{8,20}$/.test(form.telefono.trim())) {
    errors.telefono = 'Ingresa un telefono valido'
  }

  if (rol === 'donante') {
    if (!form.departamento.trim()) errors.departamento = 'El departamento es obligatorio'
    if (!form.municipio.trim()) errors.municipio = 'El municipio es obligatorio'
    if (!form.zona.trim()) errors.zona = 'La zona es obligatoria'
    if (!form.direccion_detalle.trim()) errors.direccion_detalle = 'La direccion es obligatoria'
  }

  if (rol === 'intermediario') {
    if (!form.id_organizacion) errors.id_organizacion = 'Selecciona una organización'
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
      id_organizacion: Number(form.id_organizacion),
      cargo: form.cargo.trim()
    }
  }

  return base
}

function PerfilPage({ usuarioSesion, onProfileUpdated }) {
  const location = useLocation()
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
  const [organizaciones, setOrganizaciones] = React.useState([])
  const [orgLoading, setOrgLoading] = React.useState(false)
  const [orgError, setOrgError] = React.useState('')

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

  React.useEffect(() => {
    if (!isEditing || perfil?.rol !== 'intermediario' || organizaciones.length > 0) {
      return
    }

    setOrgLoading(true)
    setOrgError('')

    apiGet('/api/organizaciones')
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Respuesta invalida del servidor')
        }
        setOrganizaciones(data)
      })
      .catch((fetchError) => {
        setOrgError(fetchError.message || 'No se pudo cargar la lista de organizaciones')
      })
      .finally(() => setOrgLoading(false))
  }, [isEditing, perfil?.rol, organizaciones.length])

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

    const nextErrors = validateProfileForm(form, perfil?.rol)
    setFormErrors(nextErrors)
    setSaveError('')
    setSaveSuccess('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

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
      setSaveSuccess('Perfil actualizado con exito')
    } catch (fetchError) {
      setSaveError(fetchError.message || 'No se pudo actualizar tu perfil')
    } finally {
      setIsSaving(false)
    }
  }

  if (!usuarioSesion) {
    return (
      <div className="fade-in">
        <div className="error-box">
          Debes iniciar sesion para ver tu perfil. <Link to="/login">Ir a login</Link>
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
        <p className="profile-main-subtitle">Informacion personal y datos de tu cuenta</p>
      </header>

      {saveSuccess && <div className="loading-box">{saveSuccess}</div>}
      {saveError && <div className="error-box">{saveError}</div>}

      <div className="profile-grid-figma">
        <section className="profile-card-figma profile-info-card-figma">
          <div className="profile-title-row">
            <h2 className="profile-section-title">Informacion Personal</h2>
            {!isEditing && (
              <button type="button" className="profile-edit-button" onClick={handleEdit}>
                Editar perfil
              </button>
            )}
          </div>

          <div className="profile-user-row">
            <div className="profile-avatar-figma">
              <IconUser />
            </div>

            <div className="profile-user-copy">
              <h3 className="profile-user-name">{perfil?.nombre}</h3>
              <p className="profile-user-role">Rol: {roleLabel(perfil?.rol)}</p>
            </div>
          </div>

          {isEditing ? (
            <form className="profile-edit-form form-grid" onSubmit={handleSaveProfile} noValidate>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label" htmlFor="profile-nombre">Nombre completo</label>
                  <input
                    id="profile-nombre"
                    className={`form-input ${formErrors.nombre ? 'form-input-invalid' : ''}`}
                    name="nombre"
                    value={form.nombre}
                    onChange={handleFormChange}
                  />
                  {formErrors.nombre && <span className="form-error-text">{formErrors.nombre}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="profile-telefono">Telefono</label>
                  <input
                    id="profile-telefono"
                    className={`form-input ${formErrors.telefono ? 'form-input-invalid' : ''}`}
                    name="telefono"
                    value={form.telefono}
                    onChange={handleFormChange}
                  />
                  {formErrors.telefono && <span className="form-error-text">{formErrors.telefono}</span>}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="profile-correo">Correo</label>
                <input
                  id="profile-correo"
                  type="email"
                  className={`form-input ${formErrors.correo ? 'form-input-invalid' : ''}`}
                  name="correo"
                  value={form.correo}
                  onChange={handleFormChange}
                />
                {formErrors.correo && <span className="form-error-text">{formErrors.correo}</span>}
              </div>

              {perfil?.rol === 'donante' && (
                <>
                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" htmlFor="profile-departamento">Departamento</label>
                      <input
                        id="profile-departamento"
                        className={`form-input ${formErrors.departamento ? 'form-input-invalid' : ''}`}
                        name="departamento"
                        value={form.departamento}
                        onChange={handleFormChange}
                      />
                      {formErrors.departamento && <span className="form-error-text">{formErrors.departamento}</span>}
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="profile-municipio">Municipio</label>
                      <input
                        id="profile-municipio"
                        className={`form-input ${formErrors.municipio ? 'form-input-invalid' : ''}`}
                        name="municipio"
                        value={form.municipio}
                        onChange={handleFormChange}
                      />
                      {formErrors.municipio && <span className="form-error-text">{formErrors.municipio}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" htmlFor="profile-zona">Zona</label>
                      <input
                        id="profile-zona"
                        className={`form-input ${formErrors.zona ? 'form-input-invalid' : ''}`}
                        name="zona"
                        value={form.zona}
                        onChange={handleFormChange}
                      />
                      {formErrors.zona && <span className="form-error-text">{formErrors.zona}</span>}
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="profile-direccion">Direccion</label>
                      <input
                        id="profile-direccion"
                        className={`form-input ${formErrors.direccion_detalle ? 'form-input-invalid' : ''}`}
                        name="direccion_detalle"
                        value={form.direccion_detalle}
                        onChange={handleFormChange}
                      />
                      {formErrors.direccion_detalle && (
                        <span className="form-error-text">{formErrors.direccion_detalle}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {perfil?.rol === 'intermediario' && (
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label" htmlFor="profile-organizacion">Organización</label>
                    <select
                      id="profile-organizacion"
                      className={`form-select ${formErrors.id_organizacion ? 'form-input-invalid' : ''}`}
                      name="id_organizacion"
                      value={form.id_organizacion}
                      onChange={handleFormChange}
                      disabled={orgLoading}
                    >
                      <option value="">Selecciona una organización</option>
                      {organizaciones.map((organizacion) => (
                        <option key={organizacion.id_organizacion} value={organizacion.id_organizacion}>
                          {organizacion.nombre}
                        </option>
                      ))}
                    </select>
                    {formErrors.id_organizacion && (
                      <span className="form-error-text">{formErrors.id_organizacion}</span>
                    )}
                    {orgLoading && <span className="form-help-text">Cargando organizaciones...</span>}
                    {orgError && <span className="form-error-text">{orgError}</span>}
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="profile-cargo">Cargo</label>
                    <input
                      id="profile-cargo"
                      className={`form-input ${formErrors.cargo ? 'form-input-invalid' : ''}`}
                      name="cargo"
                      value={form.cargo}
                      onChange={handleFormChange}
                    />
                    {formErrors.cargo && <span className="form-error-text">{formErrors.cargo}</span>}
                  </div>
                </div>
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
                  <IconUser />
                </div>
                <div>
                  <p className="profile-info-label">Correo</p>
                  <p className="profile-info-value">{perfil?.correo}</p>
                </div>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-icon-box">
                  <IconDonation />
                </div>
                <div>
                  <p className="profile-info-label">Telefono</p>
                  <p className="profile-info-value">{perfil?.telefono}</p>
                </div>
              </div>

              {perfil?.rol === 'donante' && (
                <div className="profile-info-item">
                  <div className="profile-info-icon-box">
                    <IconLocation />
                  </div>
                  <div>
                    <p className="profile-info-label">Ubicacion</p>
                    <p className="profile-info-value">
                      {perfil?.perfil?.municipio || 'Sin municipio'}, {perfil?.perfil?.departamento || 'Sin departamento'}
                    </p>
                  </div>
                </div>
              )}

              {perfil?.rol === 'intermediario' && (
                <div className="profile-info-item">
                  <div className="profile-info-icon-box">
                    <IconLocation />
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
                <p className="profile-user-name">{resumen.total}</p>
              </div>

              <div className="achievement-box">
                <p className="achievement-label">Organizaciones apoyadas</p>
                <p className="profile-user-name">{resumen.organizaciones}</p>
              </div>

              <div className="achievement-box">
                <p className="achievement-label">Tipo de cuenta</p>
                <p className="profile-user-name">{roleLabel(perfil?.rol)}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ProtectedRoute({ usuarioSesion, requiredRole, children }) {
  const location = useLocation()

  if (!usuarioSesion || !obtenerTokenSesion()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  if (requiredRole && !allowedRoles.includes(usuarioSesion.rol)) {
    return <Navigate to="/home" replace state={{ flash: 'No tienes permisos para acceder a esa seccion' }} />
  }

  return children
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [usuarioSesion, setUsuarioSesion] = React.useState(() => obtenerUsuarioSesion())
  const [authNotice, setAuthNotice] = React.useState('')
  const [navExpanded, setNavExpanded] = React.useState(false)

  React.useEffect(() => {
    setUsuarioSesion(obtenerUsuarioSesion())
  }, [location.pathname])

  React.useEffect(() => {
    setAuthNotice(location.state?.flash || '')
  }, [location.state])

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setUsuarioSesion(null)
      setAuthNotice('Tu sesión expiró. Inicia sesión nuevamente.')
      navigate('/login', { replace: true, state: { from: location.pathname } })
    }

    const handleForbidden = () => {
      setAuthNotice('No tienes permisos para realizar esta accion.')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:forbidden', handleForbidden)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:forbidden', handleForbidden)
    }
  }, [location.pathname, navigate])

  const handleAuthSuccess = (usuario) => {
    setUsuarioSesion(usuario)
  }

  const handleLogout = () => {
    limpiarUsuarioSesion()
    limpiarTokenSesion()
    setUsuarioSesion(null)
    navigate('/login', { replace: true })
  }

  const isAuthenticated = Boolean(usuarioSesion?.id_usuario && obtenerTokenSesion())

  return (
    <div className="app-shell">
      <header
        className="app-header"
        onMouseEnter={() => setNavExpanded(true)}
        onMouseLeave={() => setNavExpanded(false)}
      >
        <motion.div
          className="header-inner"
          initial={{ paddingTop: 6, paddingBottom: 6 }}
          animate={navExpanded
            ? { paddingTop: 15, paddingBottom: 15 }
            : { paddingTop: 6,  paddingBottom: 6  }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
        >
          <div className="brand-block">
            <div className="brand-mark">
              <IconBrand />
            </div>
            <motion.h1
              className="header-title"
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={navExpanded
                ? { opacity: 1, width: 'auto', marginLeft: 14 }
                : { opacity: 0, width: 0,      marginLeft: 0  }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              Red de Donaciones
            </motion.h1>
          </div>

          <NavBar
            isAuthenticated={isAuthenticated}
            usuarioSesion={usuarioSesion}
            onLogout={handleLogout}
            isExpanded={navExpanded}
          />
        </motion.div>
      </header>

      <main className="main-content">
        {authNotice && (
          <div className="error-box" role="alert">
            {authNotice}
          </div>
        )}

        <Routes>
          <Route path="/home" element={<HomePage isAuthenticated={isAuthenticated} />} />
          <Route path="/detalle/:id" element={<DetailPage />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/perfil" replace /> : <AuthPage onAuthSuccess={handleAuthSuccess} defaultMode="login" />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/perfil" replace /> : <AuthPage onAuthSuccess={handleAuthSuccess} defaultMode="register" />}
          />

          <Route
            path="/perfil"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion}>
                <PerfilPage usuarioSesion={usuarioSesion} onProfileUpdated={handleAuthSuccess} />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/donaciones"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole={['donante', 'administrador']}>
                <MisDonacionesPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/donaciones/:idDonacion"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole={['donante', 'administrador']}>
                <DonationHistoryDetailPage />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/organizaciones"
            element={(<OrganizacionesPage />)}
          />

          <Route
            path="/organizaciones/:id"
            element={(<OrgaDetailPage />
            )}
          />

          <Route
            path="/admin"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="administrador">
                <AdminPanel usuarioSesion={usuarioSesion} />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/intermediario"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="intermediario" >
                <OrgaPanel usuarioSesion={usuarioSesion} />
              </ProtectedRoute>
            )}
          />

          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      <BottomNav isAuthenticated={isAuthenticated} usuarioSesion={usuarioSesion} onLogout={handleLogout} />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </Router>
  )
}

import React from 'react'
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
import DetailPage from './pages/DetailPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import DonationHistoryDetailPage from './pages/DonationHistoryDetailPage'
import { obtenerUsuarioSesion, limpiarUsuarioSesion } from './utils/session'

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

function IconSearch() {
  return (
    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function formatAmount(value) {
  return new Intl.NumberFormat('es-GT').format(value)
}

function roleLabel(role) {
  if (!role) return 'Sin rol'
  if (role === 'donante') return 'Donante'
  if (role === 'intermediario') return 'Intermediario'
  return role
}

function DonationCard({ org }) {
  const navigate = useNavigate()

  return (
    <article className="campaign-card" onClick={() => navigate(`/detalle/${org.id}`)}>
      <div className="campaign-image-wrap">
        <div className="campaign-image-placeholder" />
        <span className="campaign-tag">{org.category}</span>
      </div>

      <div className="campaign-body">
        <h3 className="campaign-title">{org.title}</h3>
        <p className="campaign-org">{org.organizacion}</p>

        <div className="campaign-location">
          <IconLocation />
          <span>{org.location || 'Ubicacion no disponible'}</span>
        </div>

        <p className="campaign-description">{org.description}</p>

        <div className="campaign-stats-head">
          <span>Progreso</span>
          <strong>{org.progress}%</strong>
        </div>

        <div className="progress-track progress-track-home">
          <div className="progress-fill" style={{ width: `${org.progress}%` }} />
        </div>

        <div className="campaign-supporters">
          <IconUsers />
          <span>{formatAmount(org.supporters)} unidades registradas</span>
        </div>

        <button
          className="campaign-button"
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/detalle/${org.id}`)
          }}
        >
          Ver detalle
        </button>
      </div>
    </article>
  )
}

function HeaderNav({ isAuthenticated, onLogout }) {
  return (
    <nav className="top-nav">
      <NavLink to="/" end className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
        <IconHome />
        <span>Inicio</span>
      </NavLink>

      {isAuthenticated && (
        <NavLink to="/donaciones" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
          <IconDonation />
          <span>Mis Donaciones</span>
        </NavLink>
      )}

      {isAuthenticated && (
        <NavLink to="/perfil" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
          <IconUser />
          <span>Perfil</span>
        </NavLink>
      )}

      {!isAuthenticated && (
        <NavLink to="/login" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
          <IconUser />
          <span>Iniciar sesion</span>
        </NavLink>
      )}

      {!isAuthenticated && (
        <NavLink to="/signup" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
          <IconRegister />
          <span>Registro</span>
        </NavLink>
      )}

      {isAuthenticated && (
        <button type="button" className="top-nav-link top-nav-button" onClick={onLogout}>
          Cerrar sesion
        </button>
      )}
    </nav>
  )
}

function BottomNav({ isAuthenticated, onLogout }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconHome />
        <span>Inicio</span>
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
          <NavLink to="/signup" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconRegister />
            <span>Registro</span>
          </NavLink>
        </>
      )}
    </nav>
  )
}

function HomePage({ isAuthenticated }) {
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('Todas')
  const [estado, setEstado] = React.useState('Todos')
  const [organizacion, setOrganizacion] = React.useState('Todas')
  const [progressRange, setProgressRange] = React.useState('Todos')
  const [publicaciones, setPublicaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/publicaciones')
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error || 'No se pudieron cargar las publicaciones')
        }
        if (!Array.isArray(body)) {
          throw new Error('Respuesta invalida del servidor')
        }
        return body
      })
      .then((data) => {
        const adaptadas = data.map((publicacion) => ({
          id: publicacion.id_publicacion,
          title: publicacion.titulo,
          description: publicacion.descripcion,
          category: publicacion.categoria || 'Sin categoria',
          location: publicacion.direccion,
          organizacion: publicacion.organizacion || 'Sin organizacion',
          estado: publicacion.estado || 'activa',
          progress: publicacion.cantidad_necesaria > 0
            ? Math.min(100, Math.round((publicacion.cantidad_recibida / publicacion.cantidad_necesaria) * 100))
            : 0,
          supporters: publicacion.cantidad_recibida || 0
        }))

        setPublicaciones(adaptadas)
        setLoading(false)
      })
      .catch((fetchError) => {
        setError(fetchError.message || 'No se pudieron cargar las publicaciones')
        setLoading(false)
      })
  }, [])

  const categoriasDisponibles = React.useMemo(() => {
    return Array.from(new Set(publicaciones.map((item) => item.category))).sort((a, b) => a.localeCompare(b))
  }, [publicaciones])

  const organizacionesDisponibles = React.useMemo(() => {
    return Array.from(new Set(publicaciones.map((item) => item.organizacion))).sort((a, b) => a.localeCompare(b))
  }, [publicaciones])

  const hasActiveFilters = query.trim() || category !== 'Todas' || estado !== 'Todos' || organizacion !== 'Todas' || progressRange !== 'Todos'

  const filtered = React.useMemo(() => {
    return publicaciones.filter((item) => {
      const text = query.trim().toLowerCase()
      const matchesQuery = !text || (
        item.title.toLowerCase().includes(text)
        || item.description.toLowerCase().includes(text)
        || item.category.toLowerCase().includes(text)
      )

      const matchesCategory = category === 'Todas' || item.category === category
      const matchesEstado = estado === 'Todos' || item.estado === estado
      const matchesOrganizacion = organizacion === 'Todas' || item.organizacion === organizacion

      const matchesProgress = (() => {
        if (progressRange === 'Todos') return true
        if (progressRange === 'Bajo') return item.progress < 50
        if (progressRange === 'Medio') return item.progress >= 50 && item.progress < 100
        if (progressRange === 'Completo') return item.progress >= 100
        return true
      })()

      return matchesQuery && matchesCategory && matchesEstado && matchesOrganizacion && matchesProgress
    })
  }, [publicaciones, query, category, estado, organizacion, progressRange])

  const resetFilters = () => {
    setQuery('')
    setCategory('Todas')
    setEstado('Todos')
    setOrganizacion('Todas')
    setProgressRange('Todos')
  }

  return (
    <div className="fade-in">
      <section className="home-hero home-hero-figma">
        <h1 className="home-title home-title-figma">Transforma vidas con tu ayuda</h1>
        <p className="home-subtitle home-subtitle-figma">
          Encuentra organizaciones y causas que necesitan tu apoyo. Cada donacion cuenta para crear un mundo mejor.
        </p>
      </section>

      {!isAuthenticated && (
        <section className="auth-cta-panel">
          <p>Para donar, ver tu historial y perfil, inicia sesion o registrate.</p>
          <div className="auth-cta-actions">
            <Link to="/login" className="campaign-button auth-cta-button">Iniciar sesion</Link>
            <Link to="/signup" className="campaign-button auth-cta-button">Registrarme</Link>
          </div>
        </section>
      )}

      <section className="search-panel search-panel-extended">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Buscar organizaciones o causas..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="filter-box">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="Todas">Categoria: Todas</option>
            {categoriasDisponibles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="filter-box">
          <select value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="Todos">Estado: Todos</option>
            <option value="activa">Activa</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div className="filter-box">
          <select value={organizacion} onChange={(event) => setOrganizacion(event.target.value)}>
            <option value="Todas">Organizacion: Todas</option>
            {organizacionesDisponibles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="filter-box">
          <select value={progressRange} onChange={(event) => setProgressRange(event.target.value)}>
            <option value="Todos">Progreso: Todos</option>
            <option value="Bajo">0% - 49%</option>
            <option value="Medio">50% - 99%</option>
            <option value="Completo">100%</option>
          </select>
        </div>

        <button type="button" className="btn-filter-reset" onClick={resetFilters}>
          Limpiar filtros
        </button>
      </section>

      {hasActiveFilters && (
        <p className="active-filters-text">Filtros activos aplicados</p>
      )}

      <section className="campaign-grid">
        {loading && <div className="empty-box">Cargando publicaciones...</div>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && (
          filtered.length > 0
            ? filtered.map((item) => <DonationCard key={item.id} org={item} />)
            : <div className="empty-box">No hay publicaciones para los filtros seleccionados.</div>
        )}
      </section>
    </div>
  )
}

function PerfilPage({ usuarioSesion }) {
  const location = useLocation()
  const [perfil, setPerfil] = React.useState(null)
  const [resumen, setResumen] = React.useState({ total: 0, organizaciones: 0 })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!usuarioSesion?.id_usuario) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    fetch(`/api/usuarios/${usuarioSesion.id_usuario}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error || 'No se pudo cargar tu perfil')
        }
        return body
      })
      .then((body) => {
        setPerfil(body)
        if (body.rol === 'donante') {
          return fetch(`/api/donaciones?id_donante=${body.id_usuario}`)
            .then((res) => res.json())
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
      {!!location.state?.flash && <div className="loading-box">{location.state.flash}</div>}

      <header className="profile-header-figma">
        <h1 className="profile-main-title">Mi Perfil</h1>
        <p className="profile-main-subtitle">Informacion personal y datos de tu cuenta</p>
      </header>

      <div className="profile-grid-figma">
        <section className="profile-card-figma profile-info-card-figma">
          <h2 className="profile-section-title">Informacion Personal</h2>

          <div className="profile-user-row">
            <div className="profile-avatar-figma">
              <IconUser />
            </div>

            <div className="profile-user-copy">
              <h3 className="profile-user-name">{perfil?.nombre}</h3>
              <p className="profile-user-role">Rol: {roleLabel(perfil?.rol)}</p>
            </div>
          </div>

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
                  <p className="profile-info-label">Organizacion</p>
                  <p className="profile-info-value">{perfil?.perfil?.organizacion_nombre || 'No asignada'}</p>
                </div>
              </div>
            )}
          </div>
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
  if (!usuarioSesion) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && usuarioSesion.rol !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [usuarioSesion, setUsuarioSesion] = React.useState(() => obtenerUsuarioSesion())

  React.useEffect(() => {
    setUsuarioSesion(obtenerUsuarioSesion())
  }, [location.pathname])

  const handleAuthSuccess = (usuario) => {
    setUsuarioSesion(usuario)
  }

  const handleLogout = () => {
    limpiarUsuarioSesion()
    setUsuarioSesion(null)
    navigate('/login', { replace: true })
  }

  const isAuthenticated = Boolean(usuarioSesion?.id_usuario)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand-mark">
              <IconBrand />
            </div>
            <h1 className="header-title">Red de Donaciones</h1>
          </div>

          <HeaderNav isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} />} />
          <Route path="/detalle/:id" element={<DetailPage />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/perfil" replace /> : <LoginPage onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/perfil" replace /> : <SignupPage onAuthSuccess={handleAuthSuccess} />}
          />

          <Route
            path="/perfil"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion}>
                <PerfilPage usuarioSesion={usuarioSesion} />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/donaciones"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="donante">
                <MisDonacionesPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/donaciones/:idDonacion"
            element={(
              <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="donante">
                <DonationHistoryDetailPage />
              </ProtectedRoute>
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <button className="fab-help">?</button>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}
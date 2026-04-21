import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import MisDonacionesPage from './pages/MisDonacionesPage'
import DetailPage from './pages/DetailPage'

// Íconos definidos como SVG inline dentro del componente

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

function DonationCard({ org }) {
  const navigate = useNavigate()

  return (
    <article className="campaign-card" onClick={() => navigate('/detalle', { state: { org } })}>
      <div className="campaign-image-wrap">
        <div className="campaign-image-placeholder" />
        <span className="campaign-tag">{org.category}</span>
      </div>

      <div className="campaign-body">
        <h3 className="campaign-title">{org.title}</h3>
        <p className="campaign-org">{org.organizacion}</p>

        <div className="campaign-location">
          <IconLocation />
          <span>{org.location}</span>
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
          <span>{formatAmount(org.supporters)} DONANTES</span>
        </div>

        <button
          className="campaign-button"
          onClick={(e) => {
            e.stopPropagation()
            navigate('/detalle', { state: { org } })
          }}
        >
          Donar
        </button>
      </div>
    </article>
  )
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/donaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="15" x2="13" y2="15" />
        </svg>
        <span>Mis Donaciones</span>
      </NavLink>
      <NavLink to="/perfil" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Perfil</span>
      </NavLink>
    </nav>
  )
}


// Página de inicio con búsqueda y listado de campañas
function HomePage() {
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('Todas')
  const [publicaciones, setPublicaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/publicaciones')
      .then(res => res.json())
      .then(data => {
        const adaptadas = data.map(p => ({
          id: p.id_publicacion,
          title: p.titulo,
          description: p.descripcion,
          category: p.categoria,
          location: p.direccion,
          organizacion: p.organizacion,
          progress: p.cantidad_necesaria > 0
            ? Math.round((p.cantidad_recibida / p.cantidad_necesaria) * 100)
            : 0,
          supporters: p.cantidad_recibida || 0,
          raw: p
        }))
        setPublicaciones(adaptadas)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error cargando publicaciones:', err)
        setError('No se pudieron cargar las publicaciones')
        setLoading(false)
      })
  }, [])

  const filtered = publicaciones.filter(org => {
    const matchesQuery =
      org.title.toLowerCase().includes(query.toLowerCase()) ||
      org.description.toLowerCase().includes(query.toLowerCase()) ||
      org.category.toLowerCase().includes(query.toLowerCase())

    const matchesCategory =
      category === 'Todas' || org.category.toLowerCase() === category.toLowerCase()

    return matchesQuery && matchesCategory
  })

  return (
    <div className="fade-in">
      <section className="home-hero home-hero-figma">
        <h1 className="home-title home-title-figma">
          Transforma vidas con tu ayuda
        </h1>
        <p className="home-subtitle home-subtitle-figma">
          Encuentra organizaciones y causas que necesitan tu apoyo. Cada donación cuenta para crear
          un mundo mejor.
        </p>
      </section>

      <section className="search-panel">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Buscar organizaciones o causas..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Todas">Todas</option>
            <option value="General">General</option>
          </select>
        </div>
      </section>

      <section className="campaign-grid">
        {loading && <div className="empty-box">Cargando publicaciones...</div>}
        {error && <div className="empty-box">Error: {error}</div>}
        {!loading && !error && (
          filtered.length > 0
            ? filtered.map(org => <DonationCard key={org.id} org={org} />)
            : <div className="empty-box">No se encontraron resultados para "{query}"</div>
        )}
      </section>
    </div>
  )
}

function PerfilPage() {
  return (
    <div className="fade-in profile-page-figma">
      <header className="profile-header-figma">
        <h1 className="profile-main-title">Mi Perfil</h1>
        <p className="profile-main-subtitle">Información personal y logros</p>
      </header>

      <div className="profile-grid-figma">
        <section className="profile-card-figma profile-info-card-figma">
          <h2 className="profile-section-title">Información Personal</h2>

          <div className="profile-user-row">
            <div className="profile-avatar-figma">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" className="profile-avatar-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div className="profile-user-copy">
              <h3 className="profile-user-name">Adriana Martinez</h3>
              <p className="profile-user-role">Donante</p>
            </div>
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <div className="profile-info-icon-box">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="profile-info-icon">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </div>
              <div>
                <p className="profile-info-label">Email</p>
                <p className="profile-info-value">adriana@uvg.edu.gt</p>
              </div>
            </div>

            <div className="profile-info-item">
              <div className="profile-info-icon-box">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="profile-info-icon">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="profile-info-label">Ubicación</p>
                <p className="profile-info-value">Ciudad de Guatemala</p>
              </div>
            </div>

            <div className="profile-info-item">
              <div className="profile-info-icon-box">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="profile-info-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="profile-info-label">Miembro desde</p>
                <p className="profile-info-value">Enero 2026</p>
              </div>
            </div>

            <div className="profile-info-item">
              <div className="profile-info-icon-box">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="profile-info-icon">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <p className="profile-info-label">Organizaciones apoyadas</p>
                <p className="profile-info-value">6</p>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-card-figma profile-achievements-card-figma">
          <h2 className="profile-section-title">Logros y Reconocimientos</h2>

          <div className="profile-achievements-grid">
            <div className="achievement-box">
              <div className="achievement-icon-circle achievement-icon-circle-solid" />
              <p className="achievement-label">Donante Frecuente</p>
            </div>

            <div className="achievement-box">
              <div className="achievement-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="achievement-icon">
                  <path d="M7 17l5-5 3 3 5-5" />
                  <path d="M14 7h6v6" />
                </svg>
              </div>
              <p className="achievement-label">Causas Múltiples</p>
            </div>

            <div className="achievement-box">
              <div className="achievement-icon-circle achievement-icon-circle-light">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" className="achievement-icon">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11" />
                </svg>
              </div>
              <p className="achievement-label">Generoso</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function HeaderNav() {
  return (
    <nav className="top-nav">
      <NavLink to="/" end className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
        <IconHome />
        <span>Inicio</span>
      </NavLink>

      <NavLink to="/donaciones" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
        <IconDonation />
        <span>Mis Donaciones</span>
      </NavLink>

      <NavLink to="/perfil" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
        <IconUser />
        <span>Perfil</span>
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <Router>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <div className="brand-block">
              <div className="brand-mark">
                <IconBrand />
              </div>
              <h1 className="header-title">Red de Donaciones</h1>
            </div>

            <HeaderNav />
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/donaciones" element={<MisDonacionesPage />} />
            <Route path="/detalle" element={<DetailPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Routes>
        </main>

        <BottomNav />
        <button className="fab-help">?</button>
      </div>
    </Router>
  )
}
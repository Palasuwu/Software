import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import MisDonacionesPage from './pages/MisDonacionesPage'
import DetailPage from './pages/DetailPage'

const ORGANIZATIONS = [
  {
    id: 'esperanza',
    title: 'Hogar de Niños "La Esperanza"',
    description: 'Ropa de invierno para niños en situación de vulnerabilidad. Tallas 6–12 años prioritariamente.',
    category: 'Ropa',
    urgent: 'Cierra hoy a las 18:00',
    address: '5a Calle 10-20, Zona 2, Guatemala',
    isAsilo: false,
  },
  {
    id: 'dorados',
    title: 'Asilo "Años Dorados"',
    description: 'Sábanas y frazadas en buen estado para adultos mayores. Cualquier tamaño es bienvenido.',
    category: 'Hogar',
    urgent: null,
    address: '12a Av. 8-15, Zona 5, Guatemala',
    isAsilo: true,
  },
]

function SearchBar() {
  return (
    <div className="search-wrapper">
      <div className="search-bar">
        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder="Buscar organizaciones o necesidades..." />
      </div>
    </div>
  )
}

function DonationCard({ org }) {
  const navigate = useNavigate()

  return (
    <div className="card" onClick={() => navigate('/detalle', { state: { org } })}>
      <div className="card-top">
        <span className="card-chip">
          <span className="card-chip-dot" />
          {org.category}
        </span>
      </div>
      <h3 className="card-title">{org.title}</h3>
      <p className="card-desc">{org.description}</p>
      <div className="card-footer">
        <div>
          {org.urgent && (
            <span className="card-urgent">
              <span className="urgent-dot" />
              {org.urgent}
            </span>
          )}
        </div>
        <button
          className="btn-donar"
          onClick={(e) => {
            e.stopPropagation()
            navigate('/detalle', { state: { org } })
          }}
        >
          Donar
        </button>
      </div>
    </div>
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

function HomePage() {
  const [query, setQuery] = React.useState('')

  const filtered = ORGANIZATIONS.filter(org =>
    org.title.toLowerCase().includes(query.toLowerCase()) ||
    org.description.toLowerCase().includes(query.toLowerCase()) ||
    org.category.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fade-in">
      <div className="home-hero">
        <span className="home-kicker">
          <span className="home-kicker-dot" />
          Red de Donaciones · Guatemala
        </span>
        <h1 className="home-title">
          Conecta tu<br /><em>generosidad</em><br />con quien la necesita
        </h1>
        <p className="home-subtitle">
          Encuentra organizaciones locales que necesitan tu apoyo hoy.
          Cada donación tiene un impacto real en tu comunidad.
        </p>
      </div>

      <div className="search-wrapper">
        <div className="search-bar">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar organizaciones o necesidades..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Necesidades urgentes</h2>
          <span className="section-count">{filtered.length} activas</span>
        </div>
        <div className="card-grid">
          {filtered.length > 0
            ? filtered.map(org => <DonationCard key={org.id} org={org} />)
            : <div className="empty-box">No se encontraron resultados para "{query}"</div>
          }
        </div>
      </section>
    </div>
  )
}

function PerfilPage() {
  return (
    <div className="fade-in" style={{
      background: 'var(--surface)',
      border: '1px solid var(--outline)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <span className="page-kicker">
        <span className="home-kicker-dot" />
        Mi cuenta
      </span>
      <h2 className="page-title">Perfil</h2>
      <p className="page-subtitle">Vista prototipo. Implementación pendiente.</p>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <div className="app-shell">
        <header className="app-header">
          <h1 className="header-title">
            Red de Donaciones
            <span className="header-dot" />
          </h1>
          <div className="avatar">D</div>
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
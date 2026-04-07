import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'

function SearchBar() {
  return (
    <div className="search-wrapper">
      <div className="search-bar">
        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder="Buscar organizaciones o necesidades..." readOnly />
      </div>
    </div>
  )
}

function DonationCard({ title, description, urgent }) {
  return (
    <div className="card">
      <div className="card-info">
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{description}</p>
        {urgent && <span className="card-urgent">{urgent}</span>}
      </div>
      <button className="btn-donar">Donar</button>
    </div>
  )
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <Link to="/" className="nav-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>Inicio</span>
      </Link>
      <Link to="/donaciones" className="nav-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="15" x2="13" y2="15" />
        </svg>
        <span>Mis Donaciones</span>
      </Link>
      <Link to="/perfil" className="nav-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Perfil</span>
      </Link>
    </nav>
  )
}

function HomePage() {
  return (
    <>
      <SearchBar />

      <section className="section">
        <h2 className="section-title">Necesidades Urgentes</h2>

        <DonationCard
          title={'Hogar de Niños "La Esperanza"'}
          description="Ropa de invierno, tallas 6-12 años"
          urgent="Cierra hoy a las 18:00"
        />

        <DonationCard
          title={'Asilo "Años Dorados"'}
          description="Sábanas y frazadas (Buen estado)"
        />
      </section>
    </>
  )
}

function Placeholder({ title }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>{title}</h2>
      <p>Vista prototipo. Implementación pendiente.</p>
    </div>
  )
}

export default function App() {
  const [backendMessage, setBackendMessage] = useState('Cargando backend...')
  const [backendError, setBackendError] = useState(false)

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message || 'Backend respondió'))
      .catch(() => {
        setBackendMessage('No se pudo conectar al backend')
        setBackendError(true)
      })
  }, [])

  return (
    <Router>
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <h1 className="header-title">Red de Donaciones</h1>
          <div className="avatar">D</div>
        </header>

        {/* Contenido principal: rutas */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/index" element={<Placeholder title="Index" />} />
            <Route path="/login" element={<Placeholder title="Inicio de Sesión" />} />
            <Route path="/perfil" element={<Placeholder title="Perfil" />} />
            <Route path="/donaciones" element={<Placeholder title="Mis Donaciones" />} />
          </Routes>
        </main>

        {/* Navegación inferior */}
        <BottomNav />

        {/* Botón flotante de ayuda */}
        <button className="fab-help">?</button>
      </div>
    </Router>
  )
}
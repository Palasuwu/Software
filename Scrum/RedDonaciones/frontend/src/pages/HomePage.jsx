import React from 'react'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'
import DonationCard from '../components/DonationCard'
import HomeFilterSidebar from '../components/HomeFilterSidebar'
import { apiGet } from '../utils/api'
import defaultImg from '../assets/Defult.jpg'
import card1Img from '../assets/Card1.jpg'
import heroVideo from '../assets/herohome.mp4'
import './HomePage.css'

function useCountUp(target, duration = 1600) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (!target) return
    let raf
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      setCount(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return count
}

const PUBLICATION_IMAGES = {
  1: card1Img,
  2: defaultImg,
}

function resolvePublicationImage(id, urlFromDb) {
  if (urlFromDb && urlFromDb.startsWith('/api/uploads/')) return urlFromDb
  if (PUBLICATION_IMAGES[id]) return PUBLICATION_IMAGES[id]
  if (urlFromDb && (urlFromDb.startsWith('http://') || urlFromDb.startsWith('https://'))) return urlFromDb
  return defaultImg
}

function StatCard({ value, label }) {
  const displayed = useCountUp(value)
  return (
    <div className="hero-stat">
      <span className="hero-stat-number">{displayed}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  )
}

function HeroSection({ finalizadas, activas, total }) {
  return (
    <section className="hero-video-section">
      <video
        className="hero-video"
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1 className="hero-title">Transforma vidas con tu ayuda</h1>
        <p className="hero-subtitle">
          Encuentra organizaciones y causas que necesitan tu apoyo.<br />
          Cada donación cuenta para crear un mundo mejor.
        </p>
        <div className="hero-stats">
          <StatCard value={finalizadas} label="Eventos de ayuda completados" />
          <StatCard value={activas}    label="Campañas activas ahora" />
          <StatCard value={total}      label="Iniciativas y más por venir" />
        </div>
      </div>
    </section>
  )
}

export default function HomePage({ isAuthenticated }) {
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('Todas')
  const [estado, setEstado] = React.useState('Todos')
  const [organizacion, setOrganizacion] = React.useState('Todas')
  const [progressRange, setProgressRange] = React.useState('Todos')
  const [publicaciones, setPublicaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const loadPublicaciones = React.useCallback((options = {}) => {
    const { silent = false } = options
    if (!silent) setLoading(true)

    return apiGet('/api/publicaciones')
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Respuesta invalida del servidor')

        const adaptadas = data.map((p) => ({
          id: p.id_publicacion,
          title: p.titulo,
          description: p.descripcion,
          category: p.categoria || 'Sin categoría',
          location: p.direccion,
          organizacion: p.organizacion || 'Sin organización',
          estado: p.estado || 'activa',
          imagen: resolvePublicationImage(p.id_publicacion, p.imagen_url),
          progress: p.cantidad_necesaria > 0
            ? Math.min(100, Math.round((p.cantidad_recibida / p.cantidad_necesaria) * 100))
            : 0,
          supporters: p.cantidad_recibida || 0,
        }))

        setPublicaciones(adaptadas.filter((p) => p.estado !== 'cancelada'))
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'No se pudieron cargar las publicaciones')
        setLoading(false)
      })
  }, [])

  React.useEffect(() => {
    loadPublicaciones()

    const intervalId = window.setInterval(() => loadPublicaciones({ silent: true }), 8000)
    const handleChanged = () => loadPublicaciones({ silent: true })

    window.addEventListener('admin:campaigns-changed', handleChanged)
    window.addEventListener('storage', handleChanged)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('admin:campaigns-changed', handleChanged)
      window.removeEventListener('storage', handleChanged)
    }
  }, [loadPublicaciones])

  const categoriasDisponibles = React.useMemo(() =>
    Array.from(new Set(publicaciones.map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
    [publicaciones]
  )

  const organizacionesDisponibles = React.useMemo(() =>
    Array.from(new Set(publicaciones.map((p) => p.organizacion))).sort((a, b) => a.localeCompare(b)),
    [publicaciones]
  )

  const filtered = React.useMemo(() => {
    return publicaciones.filter((item) => {
      const text = query.trim().toLowerCase()
      const matchesQuery = !text || (
        item.title.toLowerCase().includes(text) ||
        item.description.toLowerCase().includes(text) ||
        item.category.toLowerCase().includes(text)
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

  const statsFinalizadas = React.useMemo(
    () => publicaciones.filter((p) => p.estado === 'finalizada').length,
    [publicaciones]
  )
  const statsActivas = React.useMemo(
    () => publicaciones.filter((p) => p.estado === 'activa').length,
    [publicaciones]
  )
  const statsTotal = publicaciones.length

  const activeFilterCount = [
    query.trim() !== '',
    category !== 'Todas',
    estado !== 'Todos',
    organizacion !== 'Todas',
    progressRange !== 'Todos',
  ].filter(Boolean).length

  const resetFilters = () => {
    setQuery('')
    setCategory('Todas')
    setEstado('Todos')
    setOrganizacion('Todas')
    setProgressRange('Todos')
  }

  return (
    <div className="fade-in">
      <HeroSection
        finalizadas={statsFinalizadas}
        activas={statsActivas}
        total={statsTotal}
      />

      <div className="home-layout">
        <HomeFilterSidebar
          query={query}
          category={category}
          estado={estado}
          organizacion={organizacion}
          progressRange={progressRange}
          categoriasDisponibles={categoriasDisponibles}
          organizacionesDisponibles={organizacionesDisponibles}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onEstadoChange={setEstado}
          onOrganizacionChange={setOrganizacion}
          onProgressRangeChange={setProgressRange}
          onReset={resetFilters}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="home-main">
          <div className="home-toolbar">
            <button
              type="button"
              className="home-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              ≡ Filtros
              {activeFilterCount > 0 && (
                <span className="hf-badge">{activeFilterCount}</span>
              )}
            </button>
            <p className="home-results-count">
              {filtered.length === publicaciones.length
                ? `${publicaciones.length} campañas disponibles`
                : `Mostrando ${filtered.length} de ${publicaciones.length} campañas`}
            </p>
          </div>

          <section className="campaign-grid">
            {loading && <Spinner message="Cargando publicaciones..." />}
            {error && <ErrorView message={error} onRetry={loadPublicaciones} />}
            {!loading && !error && (
              filtered.length > 0
                ? filtered.map((item, i) => (
                    <DonationCard key={item.id} org={item} index={i} />
                  ))
                : (
                    <div className="empty-box">
                      No hay publicaciones para los filtros seleccionados.
                    </div>
                  )
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

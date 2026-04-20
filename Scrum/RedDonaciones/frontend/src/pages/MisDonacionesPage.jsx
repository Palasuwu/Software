import React, { useEffect, useMemo, useState } from 'react'

// Íconos definidos como SVG inline dentro del componente

const STORAGE_KEY = 'mis_donaciones_local'

function calcularProgreso(cantidadRecibida, cantidadNecesaria) {
  const necesaria = Number(cantidadNecesaria) || 0
  const recibida = Number(cantidadRecibida) || 0

  if (necesaria <= 0) {
    return 0
  }

  return Math.min(100, Math.round((recibida / necesaria) * 100))
}

function formatearFecha(fecha) {
  if (!fecha) {
    return 'Sin fecha'
  }

  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) {
    return fecha
  }

  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function obtenerDonacionesGuardadas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" className="donation-row-icon">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function MisDonacionesPage() {
  const [donaciones, setDonaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    setLoading(true)
    setError('')

    try {
      const data = obtenerDonacionesGuardadas()
      setDonaciones(data)
    } catch {
      setError('No fue posible obtener tus donaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  const resumen = useMemo(() => {
    const total = donaciones.length
    const activas = donaciones.filter((item) => item.publicacion_estado === 'activa').length
    const finalizadas = donaciones.filter((item) => item.publicacion_estado === 'finalizada').length

    return {
      total,
      activas,
      finalizadas
    }
  }, [donaciones])

  const donacionesFiltradas = useMemo(() => {
    if (filtro === 'activas') {
      return donaciones.filter((item) => item.publicacion_estado === 'activa')
    }

    if (filtro === 'finalizadas') {
      return donaciones.filter((item) => item.publicacion_estado === 'finalizada')
    }

    return donaciones
  }, [donaciones, filtro])

  return (
    <section className="donations-page fade-in donations-page-figma">
      <header className="donations-header-figma">
        <h1 className="donations-main-title">Mis Donaciones</h1>
        <p className="donations-main-subtitle">
          Revisa tu historial de donaciones y el impacto que has generado
        </p>
      </header>

      <div className="stats-grid stats-grid-figma">
        <article className="stat-card stat-card-figma">
          <p className="stat-label stat-label-figma">Total de Aportes</p>
          <p className="stat-value stat-value-figma">{resumen.total}</p>
        </article>

        <article className="stat-card stat-card-figma">
          <p className="stat-label stat-label-figma">Campañas Activas</p>
          <p className="stat-value stat-value-figma">{resumen.activas}</p>
        </article>

        <article className="stat-card stat-card-figma">
          <p className="stat-label stat-label-figma">Campañas Finalizadas</p>
          <p className="stat-value stat-value-figma">{resumen.finalizadas}</p>
        </article>
      </div>

      {loading && <div className="loading-box">Cargando donaciones...</div>}
      {!loading && error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <section className="donations-panel-figma">
          <div className="donations-tabs-figma">
            <button
              type="button"
              className={`donations-tab-figma ${filtro === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas
            </button>

            <button
              type="button"
              className={`donations-tab-figma ${filtro === 'activas' ? 'active' : ''}`}
              onClick={() => setFiltro('activas')}
            >
              Activas
            </button>

            <button
              type="button"
              className={`donations-tab-figma ${filtro === 'finalizadas' ? 'active' : ''}`}
              onClick={() => setFiltro('finalizadas')}
            >
              Finalizadas
            </button>
          </div>

          {donacionesFiltradas.length === 0 ? (
            <div className="empty-box">No hay donaciones registradas para este donante.</div>
          ) : (
            <div className="donations-list-figma">
              {donacionesFiltradas.map((donacion) => {
                const estado = donacion.publicacion_estado || 'activa'
                const progreso = calcularProgreso(
                  donacion.cantidad_recibida,
                  donacion.cantidad_necesaria
                )

                return (
                  <article key={donacion.id_donacion} className="donation-row-figma">
                    <div className="donation-row-left-figma">
                      <div className="donation-row-top-figma">
                        <h3 className="donation-row-title-figma">
                          {donacion.publicacion_titulo || 'Publicacion sin titulo'}
                        </h3>

                        <span className={`status-badge donation-row-status-figma estado-${estado}`}>
                          {estado}
                        </span>
                      </div>

                      <div className="donation-row-meta-figma">
                        <span className="donation-row-date-figma">
                          <IconCalendar />
                          {formatearFecha(donacion.fecha_donacion)}
                        </span>

                        {donacion.categoria && (
                          <span className="donation-row-category-figma">
                            {donacion.categoria}
                          </span>
                        )}
                      </div>

                      <div className="donation-row-progress-figma">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progreso}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="donation-row-right-figma">
                      <span className="donation-row-progress-text-figma">{progreso}%</span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </section>
  )
}
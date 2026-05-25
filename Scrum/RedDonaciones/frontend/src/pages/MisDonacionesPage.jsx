import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerUsuarioSesion } from '../utils/session'
import { apiGet } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'

// Íconos definidos como SVG inline dentro del componente

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

function formatearCantidad(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-CO')
}

export default function MisDonacionesPage() {
  const navigate = useNavigate()
  const [donaciones, setDonaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todas')

  const cargarDonaciones = useCallback(() => {
    setLoading(true)
    setError('')

    const usuario = obtenerUsuarioSesion()
    if (!usuario?.id_usuario) {
      setError('Inicia sesion para ver tu historial de donaciones')
      setLoading(false)
      return
    }

    if (usuario.rol !== 'donante' && usuario.rol !== 'administrador') {
      setError('Solo los usuarios donantes o administradores pueden ver este historial')
      setLoading(false)
      return
    }

    apiGet(`/api/donaciones?id_donante=${usuario.id_usuario}`)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Respuesta invalida del servidor')
        setDonaciones(data)
      })
      .catch((err) => {
        setError(err.message || 'No fue posible obtener tus donaciones')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargarDonaciones() }, [cargarDonaciones])

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

      {loading && <Spinner message="Cargando donaciones..." />}
      {!loading && error && <ErrorView message={error} onRetry={cargarDonaciones} />}

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
            donaciones.length === 0 ? (
              <div className="empty-box">
                <p>Todavía no registraste ninguna donación.</p>
                <button className="campaign-button" style={{ marginTop: '12px' }} onClick={() => navigate('/home')}>
                  Explorar campañas
                </button>
              </div>
            ) : (
              <div className="empty-box">No hay donaciones en esta categoría.</div>
            )
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

                        <span className="donation-row-category-figma">
                          Tu aporte: {Number(donacion.cantidad_donada) || 0}
                        </span>

                        {donacion.categoria && (
                          <span className="donation-row-category-figma">
                            {donacion.categoria}
                          </span>
                        )}
                      </div>

                      <div className="donation-row-progress-card-figma">
                        <div className="donation-row-progress-head-figma">
                          <div>
                            <p className="donation-row-progress-label-figma">Progreso de la campaña</p>
                            <p className="donation-row-progress-amounts-figma">
                              {formatearCantidad(donacion.cantidad_recibida)} recibidos de{' '}
                              {formatearCantidad(donacion.cantidad_necesaria)}
                            </p>
                          </div>

                          <span className="donation-row-progress-text-figma">{progreso}%</span>
                        </div>

                        <div className="donation-row-progress-figma">
                          <div
                            className="progress-track donation-progress-track-figma"
                            aria-label={`Progreso de la campaña: ${progreso}%`}
                          >
                            <div className="progress-fill" style={{ width: `${progreso}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="donation-row-actions-figma">
                        <button
                          type="button"
                          className="campaign-button donation-row-button-figma"
                          onClick={() => navigate(`/donaciones/${donacion.id_donacion}`)}
                        >
                          Ver detalle
                        </button>
                      </div>
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

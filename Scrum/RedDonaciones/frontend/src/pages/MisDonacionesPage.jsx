import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerUsuarioSesion } from '../utils/session'
import { apiGet } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'
import { IconCalendar } from '../components/icons'
import './MisDonaciones.css'

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

function formatearCantidad(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-CO')
}

const ETIQUETAS_ESTADO_DONACION = {
  pendiente: 'Pendiente',
  recibida: 'Recibida',
  en_proceso: 'En proceso',
  entregada: 'Entregada',
  rechazada: 'Rechazada'
}

function formatearEstadoDonacion(estado) {
  return ETIQUETAS_ESTADO_DONACION[estado] || 'Pendiente'
}

export default function MisDonacionesPage() {
  const navigate = useNavigate()
  const [donaciones, setDonaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [reintento, setReintento] = useState(0)
  const [paginacion, setPaginacion] = useState({ page: 1, total: 0, total_pages: 0 })
  const [resumen, setResumen] = useState({ total: 0, activas: 0, finalizadas: 0 })

  const cargarDonaciones = useCallback(() => setReintento((valor) => valor + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    const usuario = obtenerUsuarioSesion()
    if (!usuario?.id_usuario) {
      setError('Inicia sesión para ver tu historial de donaciones')
      setLoading(false)
      return
    }

    if (usuario.rol !== 'donante' && usuario.rol !== 'administrador') {
      setError('Solo los usuarios donantes o administradores pueden ver este historial')
      setLoading(false)
      return
    }

    const parametros = new URLSearchParams({
      id_donante: usuario.id_usuario, page: pagina, per_page: 10
    })
    if (filtro !== 'todas') {
      parametros.set('estado_publicacion', filtro === 'activas' ? 'activa' : 'finalizada')
    }

    apiGet(`/api/donaciones?${parametros}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        if (!data || !Array.isArray(data.donaciones) || !data.resumen ||
            !Number.isInteger(data.page) || data.page < 1 ||
            !Number.isInteger(data.total) || data.total < 0 ||
            !Number.isInteger(data.total_pages) || data.total_pages < 0) {
          throw new Error('Respuesta inválida del servidor')
        }
        setDonaciones(data.donaciones)
        setResumen(data.resumen)
        setPaginacion({ page: data.page, total: data.total, total_pages: data.total_pages })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err.message || 'No fue posible obtener tus donaciones')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [pagina, filtro, reintento])

  function cambiarFiltro(nuevoFiltro) {
    setPagina(1)
    setFiltro(nuevoFiltro)
  }

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
              onClick={() => cambiarFiltro('todas')}
              aria-pressed={filtro === 'todas'}
            >
              Todas
            </button>

            <button
              type="button"
              className={`donations-tab-figma ${filtro === 'activas' ? 'active' : ''}`}
              onClick={() => cambiarFiltro('activas')}
              aria-pressed={filtro === 'activas'}
            >
              Activas
            </button>

            <button
              type="button"
              className={`donations-tab-figma ${filtro === 'finalizadas' ? 'active' : ''}`}
              onClick={() => cambiarFiltro('finalizadas')}
              aria-pressed={filtro === 'finalizadas'}
            >
              Finalizadas
            </button>
          </div>

          {donaciones.length === 0 ? (
            resumen.total === 0 ? (
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
              {donaciones.map((donacion) => {
                const estado = donacion.publicacion_estado || 'activa'
                const estadoDonacion = donacion.donacion_estado || 'pendiente'
                const progreso = calcularProgreso(
                  donacion.cantidad_recibida,
                  donacion.cantidad_necesaria
                )

                return (
                  <article key={donacion.id_donacion} className="donation-row-figma">
                    <div className="donation-row-left-figma">
                      <div className="donation-row-top-figma">
                        <h3 className="donation-row-title-figma">
                          {donacion.publicacion_titulo || 'Publicación sin título'}
                        </h3>

                        <span className={`status-badge donation-row-status-figma donacion-estado-${estadoDonacion}`}>
                          {formatearEstadoDonacion(estadoDonacion)}
                        </span>

                        <span className={`status-badge donation-row-status-figma estado-${estado}`}>
                          {estado}
                        </span>
                      </div>

                      <div className="donation-row-meta-figma">
                        <span className="donation-row-date-figma">
                          <IconCalendar className="donation-row-icon" />
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
          {paginacion.total > 0 && (
            <nav className="donations-pagination" aria-label="Paginación del historial de donaciones">
              <button
                type="button"
                className="campaign-button"
                disabled={paginacion.page <= 1}
                onClick={() => setPagina(paginacion.page - 1)}
              >
                Anterior
              </button>
              <p role="status">
                Página {paginacion.page} de {paginacion.total_pages} · {paginacion.total} donaciones
              </p>
              <button
                type="button"
                className="campaign-button"
                disabled={paginacion.page >= paginacion.total_pages}
                onClick={() => setPagina(paginacion.page + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </section>
      )}
    </section>
  )
}

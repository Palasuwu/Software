import React from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPatch } from '../utils/api'
import { IconBell } from './icons'


function formatearFecha(fecha) {
  if (!fecha) return ''

  return new Intl.DateTimeFormat('es-GT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha))
}


export default function NotificationCenter({ isExpanded }) {
  const navigate = useNavigate()
  const containerRef = React.useRef(null)
  const [abierto, setAbierto] = React.useState(false)
  const [notificaciones, setNotificaciones] = React.useState([])
  const [totalNoLeidas, setTotalNoLeidas] = React.useState(0)
  const [cargando, setCargando] = React.useState(true)
  const [error, setError] = React.useState('')

  const cargarNotificaciones = React.useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true)

    try {
      const data = await apiGet('/api/notificaciones?limite=20')
      setNotificaciones(data.notificaciones || [])
      setTotalNoLeidas(data.total_no_leidas || 0)
      setError('')
    } catch (err) {
      if (!silencioso) {
        setError(err.message || 'No se pudieron cargar las notificaciones')
      }
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  React.useEffect(() => {
    cargarNotificaciones()

    const intervalo = window.setInterval(() => {
      cargarNotificaciones({ silencioso: true })
    }, 15000)

    const actualizarAlVolver = () => {
      if (document.visibilityState === 'visible') {
        cargarNotificaciones({ silencioso: true })
      }
    }

    document.addEventListener('visibilitychange', actualizarAlVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', actualizarAlVolver)
    }
  }, [cargarNotificaciones])

  React.useEffect(() => {
    const cerrarAlHacerClickAfuera = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', cerrarAlHacerClickAfuera)
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickAfuera)
  }, [])

  const abrirNotificacion = async (notificacion) => {
    if (!notificacion.leida) {
      await apiPatch(`/api/notificaciones/${notificacion.id_notificacion}/leer`)
      setNotificaciones((actuales) => actuales.map((item) => (
        item.id_notificacion === notificacion.id_notificacion
          ? { ...item, leida: 1 }
          : item
      )))
      setTotalNoLeidas((total) => Math.max(0, total - 1))
    }

    setAbierto(false)
    if (notificacion.enlace) navigate(notificacion.enlace)
  }

  const marcarTodas = async () => {
    await apiPatch('/api/notificaciones/leer-todas')
    setNotificaciones((actuales) => actuales.map((item) => ({ ...item, leida: 1 })))
    setTotalNoLeidas(0)
  }

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        type="button"
        className="nb-item notification-trigger"
        aria-label={`Notificaciones${totalNoLeidas ? `, ${totalNoLeidas} sin leer` : ''}`}
        aria-expanded={abierto}
        onClick={() => {
          setAbierto((valor) => !valor)
          if (!abierto) cargarNotificaciones({ silencioso: true })
        }}
      >
        <span className="nb-icon notification-icon-wrap">
          <IconBell className="nav-icon" />
          {totalNoLeidas > 0 && (
            <span className="notification-badge">
              {totalNoLeidas > 9 ? '9+' : totalNoLeidas}
            </span>
          )}
        </span>
        {isExpanded && <span className="nb-label notification-label">Notificaciones</span>}
      </button>

      {abierto && (
        <div className="notification-panel">
          <div className="notification-header">
            <div>
              <strong>Notificaciones</strong>
              <span>{totalNoLeidas} sin leer</span>
            </div>
            {totalNoLeidas > 0 && (
              <button type="button" onClick={marcarTodas}>Marcar todas</button>
            )}
          </div>

          <div className="notification-list">
            {cargando && <p className="notification-state">Cargando...</p>}
            {!cargando && error && <p className="notification-state notification-error">{error}</p>}
            {!cargando && !error && notificaciones.length === 0 && (
              <p className="notification-state">Todavia no tienes notificaciones.</p>
            )}
            {!cargando && !error && notificaciones.map((notificacion) => (
              <button
                type="button"
                className={`notification-item${notificacion.leida ? '' : ' notification-item--unread'}`}
                key={notificacion.id_notificacion}
                onClick={() => abrirNotificacion(notificacion)}
              >
                <span className="notification-dot" />
                <span className="notification-content">
                  <strong>{notificacion.titulo}</strong>
                  <span>{notificacion.mensaje}</span>
                  <time>{formatearFecha(notificacion.fecha_creacion)}</time>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

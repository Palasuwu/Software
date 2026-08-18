// Pagina publica de detalle de organizacion. Sigue el mismo patron visual
// que DetailPage.jsx (hero, secciones con icono + titulo) adaptado a la
// informacion institucional que la organizacion carga en su perfil privado.
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'
import './Organizaciones.css'

function estadoLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    inactiva: 'Inactiva'
  }
  return labels[estado] || estado || 'Sin estado'
}

const ICONO_ORGANIZACION = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17" />
    <path d="M15 21V10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v11" />
    <path d="M3 21h18" />
    <path d="M9 7h1M9 11h1M9 15h1" />
  </svg>
)

const SECCIONES_INSTITUCIONALES = [
  {
    campo: 'quienes_somos',
    titulo: 'Quiénes somos',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
      </svg>
    )
  },
  {
    campo: 'que_hacemos',
    titulo: 'Qué hacemos',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  },
  {
    campo: 'como_trabajamos',
    titulo: 'Cómo trabajamos',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  },
  {
    campo: 'donde_trabajamos',
    titulo: 'Dónde trabajamos',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    )
  }
]

function OrgaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [organizacion, setOrganizacion] = React.useState(null)
  const [publicaciones, setPublicaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [logoRoto, setLogoRoto] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    setLogoRoto(false)

    apiGet(`/api/organizaciones/${id}`)
      .then((data) => {
        if (data.organizacion) {
          setOrganizacion(data.organizacion)
          setPublicaciones(Array.isArray(data.publicaciones) ? data.publicaciones : [])
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Error cargando detalles de la organización')
        setLoading(false)
      })
  }, [id])

  if (loading) return <Spinner message="Cargando detalles..." />
  if (error) return <ErrorView message={error} />
  if (!organizacion) return <div className="empty-box">Organización no encontrada</div>

  const mostrarLogo = Boolean(organizacion.url_logo) && !logoRoto
  const seccionesConContenido = SECCIONES_INSTITUCIONALES.filter(
    (seccion) => organizacion[seccion.campo] && organizacion[seccion.campo].trim()
  )

  return (
    <div className="fade-in detail-page">
      <button className="detail-back" onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver
      </button>

      {/* ── HEADER ── */}
      <div className="org-detail-header">
        <div className="org-detail-heading">
          <div className="org-detail-logo">
            {mostrarLogo
              ? (
                <img
                  src={organizacion.url_logo}
                  alt={`Logo de ${organizacion.nombre}`}
                  onError={() => setLogoRoto(true)}
                />
              )
              : ICONO_ORGANIZACION}
          </div>

          <div className="org-detail-heading-copy">
            <div className="org-detail-status">
              <span className={`org-status org-status-${organizacion.estado_verificacion}`}>
                {estadoLabel(organizacion.estado_verificacion)}
              </span>
            </div>
            <h1 className="org-detail-title">{organizacion.nombre}</h1>
          </div>
        </div>

        <p className="org-detail-desc">{organizacion.descripcion}</p>

        {/* Info de contacto */}
        <div className="org-detail-contact">
          <div className="org-detail-contact-item">
            <span className="org-detail-contact-label">Ubicación</span>
            <span className="org-detail-contact-value">{organizacion.direccion}</span>
          </div>
          <div className="org-detail-contact-item">
            <span className="org-detail-contact-label">Teléfono</span>
            <span className="org-detail-contact-value">{organizacion.telefono}</span>
          </div>
          <div className="org-detail-contact-item">
            <span className="org-detail-contact-label">Correo</span>
            <span className="org-detail-contact-value">{organizacion.correo}</span>
          </div>
        </div>
      </div>

      {/* ── INFORMACIÓN INSTITUCIONAL (solo si la organización ya la cargó) ── */}
      {seccionesConContenido.length > 0 && (
        <div className="org-detail-info-grid">
          {seccionesConContenido.map((seccion) => (
            <div className="org-detail-info-block" key={seccion.campo}>
              <div className="org-detail-info-title">
                {seccion.icono}
                {seccion.titulo}
              </div>
              <p>{organizacion[seccion.campo]}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── PUBLICACIONES DE LA ORGANIZACIÓN ── */}
      <div className="org-detail-section">
        <h2 className="section-title">
          Campañas de la organización
          {publicaciones.length > 0 && <span className="section-count">{publicaciones.length}</span>}
        </h2>

        {publicaciones.length === 0 ? (
          <div className="empty-box">Esta organización no tiene campañas activas.</div>
        ) : (
          <div className="campaign-grid">
            {publicaciones.map((pub) => {
              const progress = pub.cantidad_necesaria > 0
                ? Math.min(100, Math.round((pub.cantidad_recibida / pub.cantidad_necesaria) * 100))
                : 0

              return (
                <article className="campaign-card" key={pub.id_publicacion}>
                    <div className="campaign-body">
                        <h3 className="campaign-title">{pub.titulo}</h3>

                        <p className="campaign-description">
                        {pub.descripcion || 'Sin descripción disponible'}
                        </p>

                        <div className="campaign-stats-head">
                        <span>Progreso</span>
                        <strong>{progress}%</strong>
                        </div>

                        <div className="progress-track progress-track-home">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                        </div>

                        <div className="campaign-supporters">
                        <span>
                            {pub.cantidad_recibida || 0} / {pub.cantidad_necesaria || 0}
                        </span>
                        </div>

                        <button
                        className="campaign-button"
                        onClick={() => navigate(`/detalle/${pub.id_publicacion}`)}
                        >
                        Ver campaña
                        </button>
                    </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrgaDetailPage

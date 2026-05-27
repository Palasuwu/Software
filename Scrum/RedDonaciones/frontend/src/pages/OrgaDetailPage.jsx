import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'

function estadoLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    inactiva: 'Inactiva'
  }
  return labels[estado] || estado || 'Sin estado'
}

function OrgaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [organizacion, setOrganizacion] = React.useState(null)
  const [publicaciones, setPublicaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    setLoading(true)
    setError(null)

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
        <div className="org-detail-status">
          <span className={`org-status org-status-${organizacion.estado_verificacion}`}>
            {estadoLabel(organizacion.estado_verificacion)}
          </span>
        </div>
        <h1 className="org-detail-title">{organizacion.nombre}</h1>
        <p className="org-detail-desc">{organizacion.descripcion}</p>

        {/* Info de contacto */}
        <div className="org-detail-contact">
          <div className="contact-item">
            <span className="contact-label">Ubicación</span>
            <span className="contact-value">{organizacion.direccion}</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Teléfono</span>
            <span className="contact-value">{organizacion.telefono}</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Correo</span>
            <span className="contact-value">{organizacion.correo}</span>
          </div>
        </div>
      </div>

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

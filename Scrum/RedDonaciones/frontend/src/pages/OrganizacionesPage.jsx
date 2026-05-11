import React from 'react'
import { apiGet } from '../utils/api'

function estadoLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    inactiva: 'Inactiva'
  }

  return labels[estado] || estado || 'Sin estado'
}

function OrganizacionesPage() {
  const [organizaciones, setOrganizaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    setLoading(true)
    setError('')

    apiGet('/api/organizaciones')
      .then((data) => {
        setOrganizaciones(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setError(err.message || 'No se pudieron cargar las organizaciones')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in org-directory-page">
      <header className="org-admin-header">
        <p className="page-kicker">Directorio</p>
        <h1 className="page-title">Organizaciones</h1>
        <p className="page-subtitle">
          Consulta las organizaciones registradas y su estado de verificacion dentro de la red de donaciones.
        </p>
      </header>

      <section className="org-directory-grid">
        {loading && <div className="empty-box">Cargando organizaciones...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && organizaciones.length === 0 && (
          <div className="empty-box">No hay organizaciones registradas.</div>
        )}

        {!loading && !error && organizaciones.map((org) => (
          <article className="org-directory-card" key={org.id_organizacion}>
            <div className="org-admin-row-title">
              <h3>{org.nombre}</h3>
              <span className={`org-status org-status-${org.estado_verificacion}`}>
                {estadoLabel(org.estado_verificacion)}
              </span>
            </div>
            <p>{org.descripcion || 'Sin descripcion registrada.'}</p>
            <div className="org-admin-meta">
              <span>{org.direccion || 'Sin direccion'}</span>
              <span>{org.telefono || 'Sin telefono'}</span>
              <span>{org.correo || 'Sin correo'}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default OrganizacionesPage

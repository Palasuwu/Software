// Página donde se miran todas las organizaciones registradas y activas 

import React from 'react'
import { apiGet } from '../utils/api'
import { useNavigate } from 'react-router-dom'
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

function OrganizacionesPage() {
  const navigate = useNavigate()
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
        <h1 className="page-title">Organizaciones</h1>
        <p className="page-subtitle">
          Estas son las organizaciones que están dentro de nuestra red de donaciones
        </p>
      </header>

      <section className="org-directory-grid">
        {loading && <Spinner message="Cargando organizaciones..." />}
        {error && <ErrorView message={error} />}

        {!loading && !error && organizaciones.length === 0 && (
          <div className="empty-box">No hay organizaciones registradas</div>
        )}

        {!loading && !error && organizaciones.map((org) => (
          <article
            className="org-directory-card"
            key={org.id_organizacion}
            onClick={() => navigate(`/organizaciones/${org.id_organizacion}`)}
            style={{ cursor: 'pointer' }}
          >
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
              <span> {org.correo || 'Sin correo'}</span>
            </div>
            <button
              className="campaign-button"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/organizaciones/${org.id_organizacion}`)
              }}
            >
              Ver más
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}

export default OrganizacionesPage

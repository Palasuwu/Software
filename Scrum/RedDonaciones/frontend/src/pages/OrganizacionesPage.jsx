import React from 'react'

function OrganizacionesPage() {
  const [organizaciones, setOrganizaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/organizaciones')
      .then(async (res) => {
        const body = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(body?.error || 'Error al cargar organizaciones')
        }

        if (!Array.isArray(body)) {
          throw new Error('Respuesta inválida del servidor')
        }

        return body
      })
      .then((data) => {
        setOrganizaciones(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="fade-in">
      <h2 className="home-title">Organizaciones</h2>

      <section className="campaign-grid">
        {loading && <div className="empty-box">Cargando organizaciones...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && (
          organizaciones.length > 0
            ? organizaciones.map((org) => (
                <OrganizationCard key={org.id_organizacion} org={org} />
              ))
            : <div className="empty-box">No hay organizaciones</div>
        )}
      </section>
    </div>
  )
}

function OrganizationCard({ org }) {
  return (
    <article className="campaign-card">
      <div className="campaign-body">
        <h3 className="campaign-title">{org.nombre}</h3>

        <p className="campaign-org">
          Estado: <strong>{org.estado_verificacion}</strong>
        </p>
      </div>
    </article>
  )
}


export default OrganizacionesPage
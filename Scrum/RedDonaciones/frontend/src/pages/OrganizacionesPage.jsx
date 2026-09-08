// La plataforma opera con una unica organizacion principal: esta pagina solo
// redirige a su detalle (reutiliza OrgaDetailPage) en vez de listar varias.

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'

function OrganizacionesPage() {
  const navigate = useNavigate()
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    apiGet('/api/organizaciones/principal')
      .then((data) => {
        const id = data?.organizacion?.id_organizacion
        if (!id) {
          setError('No se pudo cargar la organización principal')
          return
        }
        navigate(`/organizaciones/${id}`, { replace: true })
      })
      .catch((err) => {
        setError(err.message || 'No se pudo cargar la organización principal')
      })
  }, [navigate])

  if (error) {
    return (
      <div className="fade-in org-directory-page">
        <ErrorView message={error} />
      </div>
    )
  }

  return (
    <div className="fade-in org-directory-page">
      <Spinner message="Cargando organización..." />
    </div>
  )
}

export default OrganizacionesPage

import React from 'react'
import { apiGet, apiPut, apiPost } from '../utils/api'
import ErrorView from '../components/ErrorView'
import './AdminPanel.css'

const CAMP_INITIAL_FORM = {
  titulo: '',
  descripcion: '',
  cantidad_necesaria: '',
  fecha_publicacion: '',
  fecha_limite: '',
  estado: 'activa',
  id_articulo: '',
  imagen_url: ''
}

function IconCampaigns() {
  return (
    <svg viewBox="0 0 24 24" className="admin-svg-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="admin-svg-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="admin-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="admin-button-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  try {
    return new Intl.DateTimeFormat('es-GT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function getProgress(publicacion) {
  const necesaria = Number(publicacion.cantidad_necesaria || 0)
  const recibida = Number(publicacion.cantidad_recibida || 0)

  if (necesaria <= 0) return 0

  return Math.min(100, Math.round((recibida / necesaria) * 100))
}

function SkeletonRows({ cols, rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="skeleton-row">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j}>
          <div className="skeleton-cell" />
        </td>
      ))}
    </tr>
  ))
}

export default function OrgaPanel() {
  const [activeTab, setActiveTab] = React.useState('campanas')

  const [publicaciones, setPublicaciones] = React.useState([])
  const [intermediarios, setIntermediarios] = React.useState([])

  const [loadingCampaigns, setLoadingCampaigns] = React.useState(true)
  const [loadingIntermediarios, setLoadingIntermediarios] = React.useState(true)

  const [campaignsError, setCampaignsError] = React.useState('')
  const [intermediariosError, setIntermediariosError] = React.useState('')

  const [savingCampaignId, setSavingCampaignId] = React.useState(null)
  const [successMessage, setSuccessMessage] = React.useState('')

  const [modal, setModal] = React.useState(null)
  const [campForm, setCampForm] = React.useState(CAMP_INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [modalError, setModalError] = React.useState('')
  const [articulos, setArticulos] = React.useState([])

  React.useEffect(() => {
    if (!successMessage) return

    const timeout = setTimeout(() => {
      setSuccessMessage('')
    }, 3500)

    return () => clearTimeout(timeout)
  }, [successMessage])

  const loadCampaigns = React.useCallback(async () => {
    setLoadingCampaigns(true)
    setCampaignsError('')

    try {
      const data = await apiGet('/api/intermediario/publicaciones')
      setPublicaciones(Array.isArray(data) ? data : [])
    } catch (error) {
      setCampaignsError(error.message || 'No se pudieron cargar las publicaciones')
    } finally {
      setLoadingCampaigns(false)
    }
  }, [])

  const loadIntermediarios = React.useCallback(async () => {
    setLoadingIntermediarios(true)
    setIntermediariosError('')

    try {
      const data = await apiGet('/api/intermediario/usuarios')
      setIntermediarios(Array.isArray(data) ? data : [])
    } catch (error) {
      setIntermediariosError(error.message || 'No se pudieron cargar los intermediarios')
    } finally {
      setLoadingIntermediarios(false)
    }
  }, [])

  const loadArticulos = React.useCallback(async () => {
    try {
      const data = await apiGet('/api/articulos')
      setArticulos(Array.isArray(data) ? data : [])
    } catch {
      // silencioso
    }
  }, [])

  React.useEffect(() => {
    loadCampaigns()
    loadArticulos()
  }, [loadCampaigns, loadArticulos])

  React.useEffect(() => {
    if (activeTab === 'intermediarios') {
      loadIntermediarios()
    }
  }, [activeTab, loadIntermediarios])

  const openCreateCampaign = () => {
    setCampForm(CAMP_INITIAL_FORM)
    setModalError('')
    setModal({ type: 'createCampaign' })
  }

  const openEditCampaign = (publicacion) => {
    setCampForm({
      titulo: publicacion.titulo || '',
      descripcion: publicacion.descripcion || '',
      cantidad_necesaria: publicacion.cantidad_necesaria || '',
      fecha_publicacion: publicacion.fecha_publicacion || '',
      fecha_limite: publicacion.fecha_limite || '',
      estado: publicacion.estado || 'activa',
      id_articulo: publicacion.id_articulo || '',
      imagen_url: publicacion.imagen_url || ''
    })

    setModalError('')
    setModal({
      type: 'editCampaign',
      publicacion
    })
  }

  const handleCampChange = (event) => {
    const { name, value } = event.target

    setCampForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const submitCampForm = async (event) => {
    event.preventDefault()

    setModalError('')
    setIsSubmitting(true)

    try {
      if (modal?.type === 'createCampaign') {
        await apiPost('/api/intermediario/publicaciones', {
          ...campForm,
          cantidad_necesaria: Number(campForm.cantidad_necesaria),
          id_articulo: Number(campForm.id_articulo)
        })

        setSuccessMessage('Publicación creada')
      } else {
        await apiPut(
          `/api/intermediario/publicaciones/${modal.publicacion.id_publicacion}`,
          {
            ...campForm,
            cantidad_necesaria: Number(campForm.cantidad_necesaria),
            id_articulo: Number(campForm.id_articulo)
          }
        )

        setSuccessMessage('Publicación actualizada')
      }

      await loadCampaigns()

      setModal(null)

    } catch (error) {
      setModalError(error.message || 'No se pudo guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeCampaignStatus = async (publicacion, nextStatus) => {
    setSavingCampaignId(publicacion.id_publicacion)

    try {
      await apiPut(
        `/api/intermediario/publicaciones/${publicacion.id_publicacion}/estado`,
        { estado: nextStatus }
      )

      setPublicaciones((previous) =>
        previous.map((item) =>
          item.id_publicacion === publicacion.id_publicacion
            ? { ...item, estado: nextStatus }
            : item
        )
      )

      setSuccessMessage('Estado actualizado correctamente')

    } catch (error) {
      setCampaignsError(error.message || 'No se pudo actualizar el estado')

    } finally {
      setSavingCampaignId(null)
    }
  }

  const renderCampaignsTable = () => {
    if (campaignsError) {
      return <ErrorView message={campaignsError} onRetry={loadCampaigns} />
    }

    if (!loadingCampaigns && publicaciones.length === 0) {
      return (
        <div className="empty-box">
          No hay publicaciones registradas.
        </div>
      )
    }

    return (
      <div className="admin-table-wrap">
        <table className="admin-table admin-table-campaigns">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Artículo</th>
              <th>Progreso</th>
              <th>Fechas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingCampaigns
              ? <SkeletonRows cols={6} rows={4} />
              : publicaciones.map((publicacion) => {
                const progress = getProgress(publicacion)
                const isSaving = savingCampaignId === publicacion.id_publicacion

                return (
                  <tr key={publicacion.id_publicacion}>
                    <td>
                      <div className="admin-table-primary">
                        {publicacion.titulo}
                      </div>

                      <div className="admin-table-muted">
                        {publicacion.descripcion}
                      </div>
                    </td>

                    <td>
                      {publicacion.articulo || 'Sin artículo'}
                    </td>

                    <td>
                      <div className="admin-progress-cell">
                        <span>{progress}%</span>

                        <div className="progress-track admin-progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        {formatDate(publicacion.fecha_publicacion)}
                      </div>

                      <div className="admin-table-muted">
                        Límite: {formatDate(publicacion.fecha_limite)}
                      </div>
                    </td>

                    <td>
                      <select
                        className="form-select admin-select-status"
                        value={publicacion.estado}
                        disabled={isSaving}
                        onChange={(e) =>
                          handleChangeCampaignStatus(
                            publicacion,
                            e.target.value
                          )
                        }
                      >
                        <option value="activa">Activa</option>
                        <option value="finalizada">Finalizada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </td>

                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-icon-button"
                          title="Editar publicación"
                          onClick={() => openEditCampaign(publicacion)}
                        >
                          <IconEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderIntermediariosTable = () => {
    if (intermediariosError) {
      return (
        <ErrorView
          message={intermediariosError}
          onRetry={loadIntermediarios}
        />
      )
    }

    if (!loadingIntermediarios && intermediarios.length === 0) {
      return (
        <div className="empty-box">
          No hay intermediarios registrados.
        </div>
      )
    }

    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Cargo</th>
            </tr>
          </thead>

          <tbody>
            {loadingIntermediarios
              ? <SkeletonRows cols={4} rows={4} />
              : intermediarios.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td>
                    <div className="admin-table-primary">
                      {usuario.nombre}
                    </div>
                  </td>

                  <td>{usuario.correo}</td>

                  <td>{usuario.telefono}</td>

                  <td>{usuario.cargo || 'Sin cargo'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="admin-page fade-in">
      <header className="admin-hero">
        <div>
          <p className="page-kicker">Organización</p>

          <h1 className="admin-title">
            Panel de Organización
          </h1>

          <p className="admin-subtitle">
            Gestiona publicaciones e intermediarios
            de tu organización.
          </p>
        </div>

        <div className="admin-hero-stat">
          <strong>{publicaciones.length}</strong>
          <span>Publicaciones</span>
        </div>

        <div className="admin-hero-stat">
          <strong>{intermediarios.length}</strong>
          <span>Intermediarios</span>
        </div>
      </header>

      {successMessage && (
        <div className="admin-toast">
          {successMessage}
        </div>
      )}

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button
            type="button"
            className={`admin-tab-button ${activeTab === 'campanas' ? 'active' : ''}`}
            onClick={() => setActiveTab('campanas')}
          >
            <IconCampaigns />
            <span>Publicaciones</span>
          </button>

          <button
            type="button"
            className={`admin-tab-button ${activeTab === 'intermediarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('intermediarios')}
          >
            <IconUsers />
            <span>Intermediarios</span>
          </button>
        </aside>

        <section className="admin-content-panel">
          {activeTab === 'campanas' ? (
            <>
              <div className="admin-section-head">
                <div>
                  <h2>Mis publicaciones</h2>

                  <p>
                    Administra las publicaciones de tu organización.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-primary-action"
                  onClick={openCreateCampaign}
                >
                  <IconPlus />
                  <span>Nueva Publicación</span>
                </button>
              </div>

              {renderCampaignsTable()}
            </>
          ) : (
            <>
              <div className="admin-section-head">
                <div>
                  <h2>Intermediarios</h2>

                  <p>
                    Visualiza intermediarios registrados en tu organización.
                  </p>
                </div>
              </div>

              {renderIntermediariosTable()}
            </>
          )}
        </section>
      </div>

      {modal && (
        <div className="admin-modal-backdrop">
          <section className="admin-modal">
            <header className="admin-modal-header">
              <h2>
                {modal.type === 'createCampaign'
                  ? 'Nueva publicación'
                  : 'Editar publicación'}
              </h2>
            </header>

            <div className="admin-modal-body">
              {modalError && (
                <div className="error-box">
                  {modalError}
                </div>
              )}

              <form onSubmit={submitCampForm}>
                <div className="form-grid">

                  <div className="form-field">
                    <label className="form-label">Título</label>

                    <input
                      className="form-input"
                      name="titulo"
                      value={campForm.titulo}
                      onChange={handleCampChange}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Descripción</label>

                    <textarea
                      className="form-textarea"
                      name="descripcion"
                      value={campForm.descripcion}
                      onChange={handleCampChange}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Cantidad necesaria</label>

                    <input
                      type="number"
                      className="form-input"
                      name="cantidad_necesaria"
                      value={campForm.cantidad_necesaria}
                      onChange={handleCampChange}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Artículo</label>

                    <select
                      className="form-select"
                      name="id_articulo"
                      value={campForm.id_articulo}
                      onChange={handleCampChange}
                    >
                      <option value="">Selecciona un artículo</option>

                      {articulos.map((articulo) => (
                        <option
                          key={articulo.id_articulo}
                          value={articulo.id_articulo}
                        >
                          {articulo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Fecha publicación
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      name="fecha_publicacion"
                      value={campForm.fecha_publicacion}
                      onChange={handleCampChange}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Fecha límite
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      name="fecha_limite"
                      value={campForm.fecha_limite}
                      onChange={handleCampChange}
                    />
                  </div>

                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn-confirmar"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
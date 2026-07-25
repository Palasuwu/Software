// Contenedor del panel de organizacion (intermediario): mantiene el estado
// y las llamadas a la API. La presentacion vive en pages/orga/ y pages/admin/
// (piezas compartidas con AdminPanel: SkeletonRows, adminHelpers, icons).
import React from 'react'
import { apiGet, apiPut, apiPost } from '../utils/api'
import { IconCampaigns, IconUsers, IconPlus } from '../components/icons'
import OrgaCampaignsTable from './orga/OrgaCampaignsTable'
import OrgaIntermediariosTable from './orga/OrgaIntermediariosTable'
import OrgaCampaignFormModal from './orga/OrgaCampaignFormModal'
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

  const closeModal = () => setModal(null)

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
            <IconCampaigns className="admin-svg-icon" />
            <span>Publicaciones</span>
          </button>

          <button
            type="button"
            className={`admin-tab-button ${activeTab === 'intermediarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('intermediarios')}
          >
            <IconUsers className="admin-svg-icon" />
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
                  <IconPlus className="admin-button-icon" />
                  <span>Nueva Publicación</span>
                </button>
              </div>

              <OrgaCampaignsTable
                publicaciones={publicaciones}
                loadingCampaigns={loadingCampaigns}
                campaignsError={campaignsError}
                savingCampaignId={savingCampaignId}
                onRetry={loadCampaigns}
                onEdit={openEditCampaign}
                onStatusChange={handleChangeCampaignStatus}
              />
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

              <OrgaIntermediariosTable
                intermediarios={intermediarios}
                loadingIntermediarios={loadingIntermediarios}
                intermediariosError={intermediariosError}
                onRetry={loadIntermediarios}
              />
            </>
          )}
        </section>
      </div>

      {modal && (
        <OrgaCampaignFormModal
          isCreate={modal.type === 'createCampaign'}
          campForm={campForm}
          articulos={articulos}
          onChange={handleCampChange}
          onSubmit={submitCampForm}
          onClose={closeModal}
          isSubmitting={isSubmitting}
          modalError={modalError}
        />
      )}
    </section>
  )
}

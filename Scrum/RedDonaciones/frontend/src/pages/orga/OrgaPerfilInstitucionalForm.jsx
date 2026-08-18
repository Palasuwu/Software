// Formulario del perfil institucional (quienes somos / que hacemos / como
// trabajamos / donde trabajamos) de la organizacion del intermediario.
// Autocontenido: carga y guarda su propio estado, igual que PerfilPage.
import React from 'react'
import { apiGet, apiPut, apiUpload } from '../../utils/api'
import Spinner from '../../components/Spinner'
import ErrorView from '../../components/ErrorView'
import { validateImageFile } from '../admin/adminForms'

const CAMPOS = [
    { name: 'quienes_somos', label: 'Quiénes somos' },
    { name: 'que_hacemos', label: 'Qué hacemos' },
    { name: 'como_trabajamos', label: 'Cómo trabajamos' },
    { name: 'donde_trabajamos', label: 'Dónde trabajamos' }
]

const FORM_VACIO = {
    quienes_somos: '',
    que_hacemos: '',
    como_trabajamos: '',
    donde_trabajamos: '',
    url_logo: '',
    imagen_portada: ''
}

export default function OrgaPerfilInstitucionalForm() {
    const [organizacion, setOrganizacion] = React.useState(null)
    const [form, setForm] = React.useState(FORM_VACIO)
    const [loading, setLoading] = React.useState(true)
    const [loadError, setLoadError] = React.useState('')
    const [isSaving, setIsSaving] = React.useState(false)
    const [saveError, setSaveError] = React.useState('')
    const [saveSuccess, setSaveSuccess] = React.useState('')
    const [logoPreview, setLogoPreview] = React.useState(null)
    const [portadaPreview, setPortadaPreview] = React.useState(null)
    const [uploadingLogo, setUploadingLogo] = React.useState(false)
    const [uploadingPortada, setUploadingPortada] = React.useState(false)

    const cargarPerfil = React.useCallback(() => {
        setLoading(true)
        setLoadError('')

        apiGet('/api/intermediario/organizacion')
            .then((data) => {
                setOrganizacion(data)
                setForm({
                    quienes_somos: data.quienes_somos || '',
                    que_hacemos: data.que_hacemos || '',
                    como_trabajamos: data.como_trabajamos || '',
                    donde_trabajamos: data.donde_trabajamos || '',
                    url_logo: data.url_logo || '',
                    imagen_portada: data.imagen_portada || ''
                })
                setLogoPreview(data.url_logo || null)
                setPortadaPreview(data.imagen_portada || null)
            })
            .catch((error) => {
                setLoadError(error.message || 'No se pudo cargar el perfil institucional')
            })
            .finally(() => setLoading(false))
    }, [])

    React.useEffect(() => {
        cargarPerfil()
    }, [cargarPerfil])

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((previous) => ({ ...previous, [name]: value }))
        setSaveSuccess('')
    }

    const handleLogoChange = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const validationError = validateImageFile(file)
        if (validationError) {
            setSaveError(validationError)
            return
        }

        setUploadingLogo(true)
        setSaveError('')
        try {
            const { url } = await apiUpload(file)
            setForm((previous) => ({ ...previous, url_logo: url }))
            setLogoPreview(url)
        } catch (error) {
            setSaveError(error.message || 'No se pudo subir el logo')
        } finally {
            setUploadingLogo(false)
        }
    }

    const handlePortadaChange = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const validationError = validateImageFile(file)
        if (validationError) {
            setSaveError(validationError)
            return
        }

        setUploadingPortada(true)
        setSaveError('')
        try {
            const { url } = await apiUpload(file)
            setForm((previous) => ({ ...previous, imagen_portada: url }))
            setPortadaPreview(url)
        } catch (error) {
            setSaveError(error.message || 'No se pudo subir la portada')
        } finally {
            setUploadingPortada(false)
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        setIsSaving(true)
        setSaveError('')
        setSaveSuccess('')

        try {
            await apiPut('/api/intermediario/organizacion', form)
            setSaveSuccess('Perfil institucional actualizado')
        } catch (error) {
            setSaveError(error.message || 'No se pudo guardar el perfil institucional')
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return <Spinner message="Cargando perfil institucional..." />
    }

    if (loadError) {
        return <ErrorView message={loadError} onRetry={cargarPerfil} />
    }

    return (
        <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <p className="admin-table-muted">
                Esta información se muestra en el perfil público de{' '}
                <strong>{organizacion?.nombre}</strong>.
            </p>

            {CAMPOS.map(({ name, label }) => (
                <div className="form-field" key={name}>
                    <label className="form-label" htmlFor={`perfil-${name}`}>{label}</label>
                    <textarea
                        id={`perfil-${name}`}
                        className="form-textarea"
                        name={name}
                        rows={4}
                        value={form[name]}
                        onChange={handleChange}
                    />
                </div>
            ))}

            <div className="form-field">
                <label className="form-label">Logo (opcional)</label>
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="form-input form-file-input"
                />
                {uploadingLogo && <span className="form-error-text form-uploading-text">Subiendo logo...</span>}
                {logoPreview && !uploadingLogo && (
                    <img src={logoPreview} alt="Vista previa del logo" style={{ marginTop: '8px', maxHeight: '80px', borderRadius: '999px', objectFit: 'cover' }} />
                )}
            </div>

            <div className="form-field">
                <label className="form-label">Portada (opcional)</label>
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePortadaChange}
                    disabled={uploadingPortada}
                    className="form-input form-file-input"
                />
                {uploadingPortada && <span className="form-error-text form-uploading-text">Subiendo portada...</span>}
                {portadaPreview && !uploadingPortada && (
                    <img src={portadaPreview} alt="Vista previa de la portada" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                )}
            </div>

            {saveError && <div className="form-error-text">{saveError}</div>}
            {saveSuccess && <div className="admin-toast">{saveSuccess}</div>}

            <div className="profile-edit-actions">
                <button type="submit" className="admin-primary-action" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    )
}

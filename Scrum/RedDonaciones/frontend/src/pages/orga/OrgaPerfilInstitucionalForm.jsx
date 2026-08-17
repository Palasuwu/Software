// Formulario del perfil institucional (quienes somos / que hacemos / como
// trabajamos / donde trabajamos) de la organizacion del intermediario.
// Autocontenido: carga y guarda su propio estado, igual que PerfilPage.
import React from 'react'
import { apiGet, apiPut } from '../../utils/api'
import Spinner from '../../components/Spinner'
import ErrorView from '../../components/ErrorView'

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
    donde_trabajamos: ''
}

export default function OrgaPerfilInstitucionalForm() {
    const [organizacion, setOrganizacion] = React.useState(null)
    const [form, setForm] = React.useState(FORM_VACIO)
    const [loading, setLoading] = React.useState(true)
    const [loadError, setLoadError] = React.useState('')
    const [isSaving, setIsSaving] = React.useState(false)
    const [saveError, setSaveError] = React.useState('')
    const [saveSuccess, setSaveSuccess] = React.useState('')

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
                    donde_trabajamos: data.donde_trabajamos || ''
                })
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

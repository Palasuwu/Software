import React from 'react'
import { apiGet, apiUploadProfilePhoto } from '../utils/api'
import { IconUser } from '../components/icons'
import { validateImageFile } from './admin/adminForms'

export default function PerfilFoto({ idUsuario }) {
    const inputId = React.useId()
    const [foto, setFoto] = React.useState(null)
    const [archivo, setArchivo] = React.useState(null)
    const [preview, setPreview] = React.useState(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState('')
    const [success, setSuccess] = React.useState('')
    const savingRef = React.useRef(false)
    const inputRef = React.useRef(null)
    const mountedRef = React.useRef(false)

    React.useEffect(() => {
        mountedRef.current = true
        const controller = new AbortController()
        apiGet(`/api/usuarios/${idUsuario}/foto`, { signal: controller.signal })
            .then(body => { if (!controller.signal.aborted) setFoto(body?.foto_url || null) })
            .catch(err => { if (!controller.signal.aborted) setError(err.message || 'No se pudo cargar la foto') })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) })
        return () => {
            mountedRef.current = false
            controller.abort()
        }
    }, [idUsuario])

    React.useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview)
    }, [preview])

    const seleccionar = event => {
        const file = event.target.files?.[0]
        if (!file || savingRef.current) return
        setSuccess('')
        const invalid = validateImageFile(file)
        if (invalid) {
            setError(invalid)
            event.target.value = ''
            return
        }
        setError('')
        setArchivo(file)
        setPreview(URL.createObjectURL(file))
    }

    const cancelar = () => {
        if (savingRef.current) return
        setArchivo(null)
        setPreview(null)
        setError('')
        if (inputRef.current) inputRef.current.value = ''
    }

    const guardar = async () => {
        if (!archivo || savingRef.current) return
        savingRef.current = true
        setSaving(true)
        setError('')
        try {
            const body = await apiUploadProfilePhoto(idUsuario, archivo)
            if (!body?.foto_url) throw new Error('No se pudo guardar la foto')
            if (!mountedRef.current) return
            setFoto(body.foto_url)
            setArchivo(null)
            setPreview(null)
            if (inputRef.current) inputRef.current.value = ''
            setSuccess('Foto de perfil actualizada')
        } catch (err) {
            if (mountedRef.current) setError(err.message || 'No se pudo guardar la foto')
        } finally {
            savingRef.current = false
            if (mountedRef.current) setSaving(false)
        }
    }

    return (
        <div className="profile-photo">
            <div className="profile-avatar-figma">
                {preview || foto
                    ? <img src={preview || foto} alt={preview ? 'Vista previa de la foto de perfil' : 'Foto de perfil'} />
                    : <IconUser className="nav-icon" />}
            </div>
            <label className="form-label" htmlFor={inputId}>Cambiar foto de perfil</label>
            <input ref={inputRef} id={inputId} type="file" className="form-file-input"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={seleccionar} disabled={saving || loading} aria-describedby={`${inputId}-help`} />
            <small id={`${inputId}-help`}>JPG, PNG, GIF o WEBP. Máximo 5 MB.</small>
            {loading && <span role="status">Cargando foto...</span>}
            {archivo && <div className="profile-photo-actions">
                <button type="button" className="profile-edit-button" onClick={guardar} disabled={saving}>
                    {saving ? 'Guardando foto...' : 'Guardar foto'}
                </button>
                <button type="button" className="profile-cancel-button" onClick={cancelar} disabled={saving}>Cancelar foto</button>
            </div>}
            {error && <p className="form-error-text" role="alert">{error}</p>}
            {success && <p role="status">{success}</p>}
        </div>
    )
}

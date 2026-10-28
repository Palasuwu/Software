import React from 'react'
import { apiFetch } from '../utils/api'
import { obtenerTokenSesion, suscribirSesion } from '../utils/session'

// Solo las rutas locales de uploads reciben el Bearer. Las URLs externas,
// assets estáticos y previews blob/data conservan su circuito de <img>.
export function esUploadLocal(src) {
    if (typeof src !== 'string' || !/^\/(?:api\/)?uploads\//.test(src)) return false
    try {
        const url = new URL(src, window.location.origin)
        return url.origin === window.location.origin && /^\/(?:api\/)?uploads\//.test(url.pathname)
    } catch {
        return false
    }
}

export function useLiberarPreview(src) {
    const token = React.useSyncExternalStore(suscribirSesion, obtenerTokenSesion, () => null)
    React.useEffect(() => () => {
        if (src?.startsWith('blob:')) URL.revokeObjectURL(src)
    }, [src, token])
    return token
}

export default function ImagenInstitucional({ src, onError, ...props }) {
    const token = React.useSyncExternalStore(suscribirSesion, obtenerTokenSesion, () => null)
    const local = esUploadLocal(src)
    const preview = React.useMemo(() => ({ sesion: token, invalidada: false }), [src])
    const esPreview = typeof src === 'string' && src.startsWith('blob:')
    const previewVisible = !esPreview || (!preview.invalidada && preview.sesion === token)
    React.useEffect(() => {
        if (esPreview && preview.sesion !== token) preview.invalidada = true
    }, [esPreview, preview, token])
    const clave = React.useMemo(() => ({ src, token }), [src, token])
    const [imagen, setImagen] = React.useState(null)
    const ref = React.useRef(null)
    const actual = imagen?.clave === clave ? imagen : null

    React.useEffect(() => {
        if (!local) return undefined
        const controller = new AbortController()
        let objectUrl
        apiFetch(src.startsWith('/uploads/') ? '/api' + src : src, {
            signal: controller.signal, cache: 'no-store', redirect: 'error'
        }).then(response => {
            if (!response.ok) throw new Error('No se pudo cargar la imagen')
            return response.blob()
        }).then(blob => {
            if (controller.signal.aborted) return
            objectUrl = URL.createObjectURL(blob)
            setImagen({ clave, url: objectUrl })
        }).catch(() => {
            if (!controller.signal.aborted) setImagen({ clave, error: true })
        })
        return () => {
            controller.abort()
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [src, token, local, clave])

    React.useEffect(() => {
        if (local && actual?.error) ref.current?.dispatchEvent(new Event('error'))
    }, [local, actual?.error])

    // No reutilizar el blob de otro origen o sesión mientras se descarga.
    return <img {...props} ref={ref} src={local ? actual?.url : (previewVisible ? src : undefined)} onError={onError} />
}

import { useEffect } from 'react'

// Cierra un modal con la tecla Escape mientras esté montado.
export default function useCerrarConEscape(onClose, activo = true) {
    useEffect(() => {
        if (!activo || typeof onClose !== 'function') return undefined
        const alPresionar = (event) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', alPresionar)
        return () => document.removeEventListener('keydown', alPresionar)
    }, [onClose, activo])
}

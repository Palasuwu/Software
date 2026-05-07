export const USER_STORAGE_KEY = 'usuario_actual'

export function obtenerUsuarioSesion() {
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

export function guardarUsuarioSesion(usuario) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario))
}

export function limpiarUsuarioSesion() {
    localStorage.removeItem(USER_STORAGE_KEY)
}

export function obtenerHeadersSesion() {
    const usuario = obtenerUsuarioSesion()
    if (!usuario) return {}

    return {
        'X-User-Id': String(usuario.id_usuario || ''),
        'X-User-Role': usuario.rol || ''
    }
}

export function apiFetch(url, options = {}) {
    const headers = {
        ...obtenerHeadersSesion(),
        ...(options.headers || {})
    }

    return fetch(url, {
        ...options,
        headers
    })
}

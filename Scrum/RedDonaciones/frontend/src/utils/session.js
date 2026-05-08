export const USER_STORAGE_KEY = 'usuario_actual'
export const TOKEN_STORAGE_KEY = 'token'

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

export function obtenerTokenSesion() {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function guardarTokenSesion(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function limpiarTokenSesion() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function obtenerHeadersSesion() {
    const usuario = obtenerUsuarioSesion()
    const token = obtenerTokenSesion()
    const headers = {}

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    if (!usuario) return headers

    headers['X-User-Id'] = String(usuario.id_usuario || '')
    headers['X-User-Role'] = usuario.rol || ''

    return headers
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

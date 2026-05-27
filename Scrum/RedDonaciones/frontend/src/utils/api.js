import { limpiarTokenSesion, limpiarUsuarioSesion, obtenerHeadersSesion } from './session'

export class ApiError extends Error {
    constructor(message, response, body = null) {
        super(message)
        this.name = 'ApiError'
        this.status = response?.status
        this.body = body
    }
}

export function isAuthError(error) {
    return error?.status === 401 || error?.status === 403
}

function dispatchAuthEvent(response, body) {
    if (response.status === 401) {
        limpiarUsuarioSesion()
        limpiarTokenSesion()
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status: response.status, body } }))
        return
    }

    if (response.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: { status: response.status, body } }))
    }
}

export async function apiFetch(input, init = {}) {
    const headers = new Headers(obtenerHeadersSesion())
    const initHeaders = new Headers(init.headers || {})

    initHeaders.forEach((value, key) => {
        headers.set(key, value)
    })

    return fetch(input, {
        ...init,
        headers
    })
}

export const fetchWithAuth = apiFetch

export async function parseApiResponse(response) {
    const body = await response.json().catch(() => null)

    if (!response.ok) {
        dispatchAuthEvent(response, body)
        throw new ApiError(
            body?.error || body?.message || 'No se pudo completar la solicitud',
            response,
            body
        )
    }

    return body
}

function buildJsonInit(method, data, init = {}) {
    const headers = new Headers(init.headers || {})
    headers.set('Content-Type', 'application/json')

    return {
        ...init,
        method,
        headers,
        body: JSON.stringify(data)
    }
}

export async function apiGet(url, init = {}) {
    const response = await apiFetch(url, {
        ...init,
        method: 'GET'
    })

    return parseApiResponse(response)
}

export async function apiPost(url, data, init = {}) {
    const response = await apiFetch(url, buildJsonInit('POST', data, init))
    return parseApiResponse(response)
}

export async function apiPut(url, data, init = {}) {
    const response = await apiFetch(url, buildJsonInit('PUT', data, init))
    return parseApiResponse(response)
}

export async function apiDelete(url, init = {}) {
    const response = await apiFetch(url, {
        ...init,
        method: 'DELETE'
    })

    return parseApiResponse(response)
}

export async function apiUpload(file) {
    const formData = new FormData()
    formData.append('file', file)

    // No ponemos Content-Type: el browser lo fija automáticamente con el boundary correcto
    const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData
    })

    return parseApiResponse(response)
}

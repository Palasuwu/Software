import { obtenerTokenSesion } from './session'

export async function fetchWithAuth(input, init = {}) {
    const token = obtenerTokenSesion()
    const headers = new Headers(init.headers || {})

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    return fetch(input, {
        ...init,
        headers
    })
}

async function parseApiResponse(response) {
    const body = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error(body?.error || body?.message || 'No se pudo completar la solicitud')
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
    const response = await fetchWithAuth(url, {
        ...init,
        method: 'GET'
    })

    return parseApiResponse(response)
}

export async function apiPublicGet(url, init = {}) {
    const response = await fetch(url, {
        ...init,
        method: 'GET'
    })

    return parseApiResponse(response)
}

export async function apiPublicPost(url, data, init = {}) {
    const response = await fetch(url, buildJsonInit('POST', data, init))
    return parseApiResponse(response)
}

export async function apiPost(url, data, init = {}) {
    const response = await fetchWithAuth(url, buildJsonInit('POST', data, init))
    return parseApiResponse(response)
}

export async function apiPut(url, data, init = {}) {
    const response = await fetchWithAuth(url, buildJsonInit('PUT', data, init))
    return parseApiResponse(response)
}

export async function apiDelete(url, init = {}) {
    const response = await fetchWithAuth(url, {
        ...init,
        method: 'DELETE'
    })

    return parseApiResponse(response)
}

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
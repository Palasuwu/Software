import { afterEach, expect, it, vi } from 'vitest'
import { apiUploadProfilePhoto } from '../utils/api'

vi.mock('../utils/session', () => ({
    obtenerHeadersSesion: () => ({ Authorization: 'Bearer prueba' }),
    limpiarTokenSesion: vi.fn(), limpiarUsuarioSesion: vi.fn()
}))
afterEach(() => vi.unstubAllGlobals())

it('envía la foto como multipart autenticado y deja el boundary a cargo del navegador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ foto_url: 'data:image/jpeg;base64,eA==' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const archivo = new File(['foto'], 'foto.png', { type: 'image/png' })
    await expect(apiUploadProfilePhoto(7, archivo)).resolves.toHaveProperty('foto_url')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/usuarios/7/foto')
    expect(init.method).toBe('PUT')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('file').name).toBe('foto.png')
    expect(init.headers.get('Authorization')).toBe('Bearer prueba')
    expect(init.headers.has('Content-Type')).toBe(false)
})

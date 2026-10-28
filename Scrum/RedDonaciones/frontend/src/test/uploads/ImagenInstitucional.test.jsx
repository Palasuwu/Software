import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ImagenInstitucional from '../../components/ImagenInstitucional'
import OrgaPerfilInstitucionalForm from '../../pages/orga/OrgaPerfilInstitucionalForm'
import { guardarTokenSesion } from '../../utils/session'

const respuesta = () => new Response(new Blob(['imagen'], { type: 'image/jpeg' }))

beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta()))
    vi.stubGlobal('URL', class extends URL {})
    URL.createObjectURL = vi.fn().mockReturnValue('blob:descargada')
    URL.revokeObjectURL = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })

it.each(['/api/uploads/a.jpg', '/uploads/a.jpg'])('envía Bearer solo al GET local %s', async src => {
    guardarTokenSesion('sesion-a')
    render(<ImagenInstitucional src={src} alt="Institución" />)
    await waitFor(() => expect(screen.getByAltText('Institución')).toHaveAttribute('src', 'blob:descargada'))
    expect(fetch).toHaveBeenCalledWith('/api/uploads/a.jpg', expect.objectContaining({
        cache: 'no-store', redirect: 'error', headers: expect.any(Headers)
    }))
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer sesion-a')
})

it.each(['https://externo.test/api/uploads/a.jpg', '//externo.test/uploads/a.jpg', '/liga-juvenil.svg', 'blob:preview', 'data:image/png;base64,YQ=='])('no descarga con token el origen %s', src => {
    guardarTokenSesion('secreto')
    render(<ImagenInstitucional src={src} alt="Imagen" />)
    expect(screen.getByAltText('Imagen')).toHaveAttribute('src', src)
    expect(fetch).not.toHaveBeenCalled()
})

it('oculta la sesión anterior inmediatamente y revoca sus blobs', async () => {
    guardarTokenSesion('sesion-a')
    const { unmount } = render(<ImagenInstitucional src="/api/uploads/a.jpg" alt="Imagen" />)
    await waitFor(() => expect(screen.getByAltText('Imagen')).toHaveAttribute('src', 'blob:descargada'))
    let completar
    fetch.mockImplementationOnce(() => new Promise(resolve => { completar = resolve }))
    act(() => guardarTokenSesion('sesion-b'))
    expect(screen.getByAltText('Imagen')).not.toHaveAttribute('src')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:descargada')
    URL.createObjectURL.mockReturnValueOnce('blob:sesion-b')
    await act(async () => completar(respuesta()))
    expect(screen.getByAltText('Imagen')).toHaveAttribute('src', 'blob:sesion-b')
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sesion-b')
})

it('revoca al cambiar imagen y descarta respuestas tardías', async () => {
    let completar
    fetch.mockImplementationOnce(() => new Promise(resolve => { completar = resolve }))
    const { rerender, unmount } = render(<ImagenInstitucional src="/api/uploads/a.jpg" alt="Imagen" />)
    rerender(<ImagenInstitucional src="/api/uploads/b.jpg" alt="Imagen" />)
    await waitFor(() => expect(screen.getByAltText('Imagen')).toHaveAttribute('src', 'blob:descargada'))
    await act(async () => completar(respuesta()))
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    rerender(<ImagenInstitucional src="https://externo.test/a.jpg" alt="Imagen" />)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:descargada')
    unmount()
})

it('no muestra bytes anteriores ante una denegación y comunica el error', async () => {
    fetch.mockResolvedValueOnce(new Response('', { status: 404 }))
    const error = vi.fn()
    render(<ImagenInstitucional src="/api/uploads/a.jpg" alt="Imagen" onError={error} />)
    await waitFor(() => expect(error).toHaveBeenCalledTimes(1))
    expect(screen.getByAltText('Imagen')).not.toHaveAttribute('src')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
})

it('conserva la preview local recién subida hasta guardar la asociación', async () => {
    let guardada = false
    fetch.mockImplementation(async (url, init) => {
        if (url === '/api/intermediario/organizacion') return new Response(JSON.stringify({
            direccion: '', departamento: 'Guatemala', municipio: 'Guatemala', zona: '1'
        }))
        if (url === '/api/upload') return new Response(JSON.stringify({ url: '/api/uploads/nueva.jpg' }))
        if (init?.method === 'PUT') { guardada = true; return new Response(JSON.stringify({ message: 'ok' })) }
        if (guardada && url === '/api/uploads/nueva.jpg') return respuesta()
        throw new Error('La preview no debe descargar un archivo huérfano')
    })
    URL.createObjectURL.mockReturnValue('blob:preview-local')
    render(<OrgaPerfilInstitucionalForm />)
    const label = await screen.findByText('Logo (opcional)')
    const input = label.parentElement.querySelector('input[type=file]')
    fireEvent.change(input, { target: { files: [new File(['imagen'], 'logo.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.getByAltText('Vista previa del logo')).toHaveAttribute('src', 'blob:preview-local'))
    expect(fetch.mock.calls.map(([url]) => url)).not.toContain('/api/uploads/nueva.jpg')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(fetch.mock.calls.some(([, init]) => init?.method === 'PUT' && JSON.parse(init.body).url_logo === '/api/uploads/nueva.jpg')).toBe(true))
})

it('no vuelve a mostrar una preview de la sesión anterior al regresar a ella', () => {
    guardarTokenSesion('a')
    render(<ImagenInstitucional src="blob:archivo-local" alt="Preview" />)
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'blob:archivo-local')
    act(() => guardarTokenSesion('b'))
    expect(screen.getByAltText('Preview')).not.toHaveAttribute('src')
    act(() => guardarTokenSesion('a'))
    expect(screen.getByAltText('Preview')).not.toHaveAttribute('src')
})

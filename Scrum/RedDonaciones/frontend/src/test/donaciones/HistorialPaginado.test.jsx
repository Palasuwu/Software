import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MisDonacionesPage from '../../pages/MisDonacionesPage'
import { apiGet } from '../../utils/api'
import { obtenerUsuarioSesion } from '../../utils/session'

vi.mock('../../utils/api', () => ({ apiGet: vi.fn() }))
vi.mock('../../utils/session', () => ({ obtenerUsuarioSesion: vi.fn() }))

function respuesta(page = 1, total = 61) {
    return {
        donaciones: [{
            id_donacion: page,
            publicacion_titulo: `Aporte de página ${page}`,
            publicacion_estado: 'activa', donacion_estado: 'pendiente'
        }],
        page, per_page: 10, total, total_pages: Math.ceil(total / 10),
        resumen: { total: 61, activas: 42, finalizadas: 19 }
    }
}

function abrirHistorial() {
    return render(<MemoryRouter><MisDonacionesPage /></MemoryRouter>)
}

describe('Paginación del historial', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        obtenerUsuarioSesion.mockReturnValue({ id_usuario: 7, rol: 'donante' })
        apiGet.mockResolvedValue(respuesta())
    })

    it('consulta diez registros y usa los contadores de todo el historial', async () => {
        abrirHistorial()
        expect(await screen.findByText('Aporte de página 1')).toBeInTheDocument()
        expect(apiGet).toHaveBeenCalledWith(
            '/api/donaciones?id_donante=7&page=1&per_page=10',
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
        expect(screen.getByText('61')).toBeInTheDocument()
        expect(screen.getByText('42')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    })

    it('avanza, retrocede y bloquea el avance en la última página', async () => {
        apiGet.mockResolvedValueOnce(respuesta(1, 11))
            .mockResolvedValueOnce(respuesta(2, 11))
            .mockResolvedValueOnce(respuesta(1, 11))
        abrirHistorial()
        await screen.findByText('Aporte de página 1')
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        await screen.findByText('Aporte de página 2')
        expect(screen.queryByText('Aporte de página 1')).not.toBeInTheDocument()
        expect(apiGet.mock.calls[1][0]).toContain('page=2')
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
        await screen.findByText('Aporte de página 1')
        expect(apiGet.mock.calls[2][0]).toContain('page=1')
    })

    it('reinicia la página y filtra en el servidor sin perder los totales', async () => {
        apiGet.mockResolvedValueOnce(respuesta()).mockResolvedValueOnce(respuesta(2))
            .mockResolvedValueOnce(respuesta(1, 19))
        abrirHistorial()
        await screen.findByText('Aporte de página 1')
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        await screen.findByText('Aporte de página 2')
        fireEvent.click(screen.getByRole('button', { name: 'Finalizadas' }))
        await screen.findByText('Página 1 de 2 · 19 donaciones')
        expect(apiGet.mock.calls[2][0]).toBe(
            '/api/donaciones?id_donante=7&page=1&per_page=10&estado_publicacion=finalizada'
        )
        expect(screen.getByText('61')).toBeInTheDocument()
    })

    it('permite reintentar la misma página después de un error', async () => {
        apiGet.mockResolvedValueOnce(respuesta()).mockRejectedValueOnce(new Error('Sin conexión'))
            .mockResolvedValueOnce(respuesta(2))
        abrirHistorial()
        await screen.findByText('Aporte de página 1')
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        await screen.findByText('Sin conexión')
        fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
        await screen.findByText('Aporte de página 2')
        expect(apiGet.mock.calls[2][0]).toContain('page=2')
    })

    it('muestra un historial vacío sin controles de página', async () => {
        apiGet.mockResolvedValue({
            ...respuesta(1, 0), donaciones: [], resumen: { total: 0, activas: 0, finalizadas: 0 }
        })
        abrirHistorial()
        expect(await screen.findByText('Todavía no registraste ninguna donación.')).toBeInTheDocument()
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('distingue una categoría vacía de un historial sin aportes', async () => {
        apiGet.mockResolvedValueOnce(respuesta())
            .mockResolvedValueOnce({ ...respuesta(1, 0), donaciones: [] })
        abrirHistorial()
        await screen.findByText('Aporte de página 1')
        fireEvent.click(screen.getByRole('button', { name: 'Finalizadas' }))
        expect(await screen.findByText('No hay donaciones en esta categoría.')).toBeInTheDocument()
    })

    it('descarta una respuesta anterior que termina después de un reintento', async () => {
        let resolverAnterior
        apiGet.mockImplementationOnce(() => new Promise((resolver) => { resolverAnterior = resolver }))
            .mockResolvedValueOnce(respuesta())
        const vista = abrirHistorial()
        const signal = apiGet.mock.calls[0][1].signal
        vista.unmount()
        abrirHistorial()
        await screen.findByText('Aporte de página 1')
        await act(async () => resolverAnterior(respuesta(6)))
        expect(signal.aborted).toBe(true)
        expect(screen.queryByText('Aporte de página 6')).not.toBeInTheDocument()
    })

    it('muestra error si el servidor devuelve una respuesta sin paginación', async () => {
        apiGet.mockResolvedValue([])
        abrirHistorial()
        expect(await screen.findByText('Respuesta inválida del servidor')).toBeInTheDocument()
    })

    it('no consulta donaciones sin sesión', async () => {
        obtenerUsuarioSesion.mockReturnValue(null)
        abrirHistorial()
        await waitFor(() => expect(screen.getByText('Inicia sesion para ver tu historial de donaciones')).toBeInTheDocument())
        expect(apiGet).not.toHaveBeenCalled()
    })
})

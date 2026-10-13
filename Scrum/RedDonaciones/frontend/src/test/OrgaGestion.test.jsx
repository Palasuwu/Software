import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import OrgaPanel from '../pages/OrgaPanel'
import { apiGet, apiPut } from '../utils/api'

vi.mock('../utils/api', () => ({ apiGet: vi.fn(), apiPut: vi.fn(), apiPost: vi.fn(), apiUpload: vi.fn() }))
afterEach(cleanup)
beforeEach(() => {
    vi.resetAllMocks()
    apiGet.mockImplementation(async (url) => {
        if (url === '/api/intermediario/publicaciones') return [{ id_publicacion: 7, titulo: 'Alimentos', estado: 'activa' }]
        if (url === '/api/intermediario/donaciones') return [{ id_donacion: 9, publicacion_titulo: 'Alimentos', estado: 'pendiente' }]
        return []
    })
    apiPut.mockResolvedValue({ message: 'Actualizado' })
})

it('cancelar el cambio de estado no envía una petición ni altera la publicación', async () => {
    render(<OrgaPanel />)
    const estado = await screen.findByLabelText('Estado de Alimentos')
    fireEvent.change(estado, { target: { value: 'cancelada' } })
    expect(screen.getByRole('dialog')).toHaveTextContent('cancelada')
    expect(apiPut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(estado).toHaveValue('activa')
    expect(apiPut).not.toHaveBeenCalled()
})

it('mantiene el diálogo ante un error y permite confirmar nuevamente', async () => {
    render(<OrgaPanel />)
    fireEvent.change(await screen.findByLabelText('Estado de Alimentos'), { target: { value: 'finalizada' } })
    apiPut.mockRejectedValueOnce(new Error('No hay conexión'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión')
    expect(screen.getByLabelText('Estado de Alimentos')).toHaveValue('activa')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Estado de Alimentos')).toHaveValue('finalizada')
})

it('bloquea una segunda confirmación mientras guarda el estado', async () => {
    let terminar
    apiPut.mockImplementation(() => new Promise(resolve => { terminar = resolve }))
    render(<OrgaPanel />)
    fireEvent.change(await screen.findByLabelText('Estado de Alimentos'), { target: { value: 'finalizada' } })
    const confirmar = screen.getByRole('button', { name: 'Confirmar' })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(apiPut).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Confirmando...' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    terminar({})
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('confirma las donaciones seleccionadas y bloquea la selección durante la petición', async () => {
    let terminar
    apiPut.mockImplementation(() => new Promise(resolve => { terminar = resolve }))
    render(<OrgaPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Donaciones' }))
    fireEvent.click(await screen.findByLabelText('Seleccionar donación #9'))
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a seleccionadas' }))
    expect(apiPut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(apiPut).toHaveBeenCalledWith('/api/intermediario/donaciones/estado', { ids_donacion: [9], estado: 'recibida' })
    expect(screen.getByLabelText('Seleccionar donación #9')).toBeDisabled()
    terminar({ omitidas: [] })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

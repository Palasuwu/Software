import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PerfilFoto from '../pages/PerfilFoto'
import { apiGet, apiUploadProfilePhoto } from '../utils/api'

vi.mock('../utils/api', () => ({ apiGet: vi.fn(), apiUploadProfilePhoto: vi.fn() }))
const foto = 'data:image/jpeg;base64,dGVzdA=='
const nueva = new File(['foto'], 'foto.png', { type: 'image/png' })
beforeEach(() => {
    vi.resetAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:foto-nueva')
    URL.revokeObjectURL = vi.fn()
    apiGet.mockResolvedValue({ foto_url: foto })
    apiUploadProfilePhoto.mockResolvedValue({ foto_url: foto })
})
afterEach(cleanup)

it('carga la foto guardada sin depender del rol del usuario', async () => {
    render(<PerfilFoto idUsuario={7} />)
    expect(await screen.findByAltText('Foto de perfil')).toHaveAttribute('src', foto)
    expect(apiGet).toHaveBeenCalledWith('/api/usuarios/7/foto', expect.objectContaining({ signal: expect.any(AbortSignal) }))
})

it('previsualiza y permite cancelar sin subir ni perder la foto anterior', async () => {
    render(<PerfilFoto idUsuario={7} />)
    const input = screen.getByLabelText('Cambiar foto de perfil')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { files: [nueva] } })
    expect(screen.getByAltText('Vista previa de la foto de perfil')).toHaveAttribute('src', 'blob:foto-nueva')
    expect(apiUploadProfilePhoto).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar foto' }))
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', foto)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-nueva')
})

it('rechaza formato o tamaño inválido antes de subir', async () => {
    render(<PerfilFoto idUsuario={7} />)
    const input = screen.getByLabelText('Cambiar foto de perfil')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.svg', { type: 'image/svg+xml' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Formato no permitido')
    const grande = new File(['x'], 'grande.png', { type: 'image/png' })
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 })
    fireEvent.change(input, { target: { files: [grande] } })
    expect(screen.getByRole('alert')).toHaveTextContent('El máximo es 5 MB')
    expect(apiUploadProfilePhoto).not.toHaveBeenCalled()
})

it('bloquea doble envío y muestra la foto guardada al completar la petición', async () => {
    let terminar
    apiUploadProfilePhoto.mockImplementation(() => new Promise(resolve => { terminar = resolve }))
    render(<PerfilFoto idUsuario={7} />)
    const input = screen.getByLabelText('Cambiar foto de perfil')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { files: [nueva] } })
    const guardar = screen.getByRole('button', { name: 'Guardar foto' })
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    expect(apiUploadProfilePhoto).toHaveBeenCalledTimes(1)
    expect(apiUploadProfilePhoto).toHaveBeenCalledWith(7, nueva)
    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar foto' })).toBeDisabled()
    terminar({ foto_url: foto })
    expect(await screen.findByText('Foto de perfil actualizada')).toBeInTheDocument()
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', foto)
})

it('conserva el archivo para reintentar cuando falla el guardado', async () => {
    apiUploadProfilePhoto.mockRejectedValueOnce(new Error('No hay conexión'))
    render(<PerfilFoto idUsuario={7} />)
    const input = screen.getByLabelText('Cambiar foto de perfil')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { files: [nueva] } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar foto' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión')
    expect(screen.getByAltText('Vista previa de la foto de perfil')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar foto' }))
    expect(await screen.findByText('Foto de perfil actualizada')).toBeInTheDocument()
})

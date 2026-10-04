import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPage from '../pages/DetailPage'
import { apiGet, apiPost } from '../utils/api'
import { obtenerUsuarioSesion } from '../utils/session'

vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}))

vi.mock('../utils/session', () => ({
  obtenerUsuarioSesion: vi.fn()
}))

const publicacion = [{
  id_publicacion: 12,
  titulo: 'Campaña de alimentos',
  descripcion: 'Apoyo para familias',
  categoria: 'Alimentos',
  organizacion: 'Hogar La Esperanza',
  estado: 'activa',
  cantidad_necesaria: 100,
  cantidad_recibida: 25,
  articulo: 'Arroz',
  descripcion_detalle: 'Bolsas',
  direccion: 'Zona 1'
}]

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/detalle/12']}>
      <Routes>
        <Route path="/detalle/:id" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Compromiso de entrega en donaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiGet.mockResolvedValue(publicacion)
    apiPost.mockResolvedValue({ message: 'ok' })
    obtenerUsuarioSesion.mockReturnValue({
      id_usuario: 4,
      nombre: 'Donante Demo',
      telefono: '55550000',
      rol: 'donante'
    })
  })

  it('exige confirmar el compromiso antes de registrar la donación', async () => {
    const { container } = renderDetailPage()

    await screen.findByText('Campaña de alimentos')
    fireEvent.change(container.querySelector('input[name="fecha"]'), {
      target: { value: '2026-08-20' }
    })
    fireEvent.change(container.querySelector('select[name="hora"]'), {
      target: { value: '10:00' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    expect(await screen.findByText('Confirma tu compromiso de entrega para continuar')).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', {
      name: /Confirmo mi compromiso de entrega/
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1))
  })

  it('aplica clase visual activa cuando se selecciona el compromiso de entrega', async () => {
    const { container } = renderDetailPage()

    await screen.findByText('Campaña de alimentos')
    const checkbox = screen.getByRole('checkbox', {
      name: /Confirmo mi compromiso de entrega/
    })
    const commitmentLabel = container.querySelector('.dp-commitment')

    expect(commitmentLabel).not.toHaveClass('dp-commitment--checked')

    fireEvent.click(checkbox)
    expect(commitmentLabel).toHaveClass('dp-commitment--checked')

    fireEvent.click(checkbox)
    expect(commitmentLabel).not.toHaveClass('dp-commitment--checked')
  })

  it('rechaza el registro si el usuario autenticado no tiene rol donante', async () => {
    obtenerUsuarioSesion.mockReturnValue({
      id_usuario: 8,
      nombre: 'Intermediario Demo',
      rol: 'intermediario'
    })

    const { container } = renderDetailPage()
    await screen.findByText('Campaña de alimentos')

    fireEvent.click(screen.getByRole('checkbox', {
      name: /Confirmo mi compromiso de entrega/
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    expect(await screen.findByText('Solo los usuarios con rol donante pueden registrar donaciones')).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })
})

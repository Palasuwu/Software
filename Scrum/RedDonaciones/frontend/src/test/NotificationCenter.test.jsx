import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationCenter from '../components/NotificationCenter'
import { apiGet, apiPatch } from '../utils/api'


vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn()
}))


describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiGet.mockResolvedValue({
      total_no_leidas: 1,
      notificaciones: [{
        id_notificacion: 10,
        titulo: 'Donacion registrada',
        mensaje: 'Tu aporte fue registrado.',
        enlace: null,
        leida: 0,
        fecha_creacion: '2026-07-26T10:00:00'
      }]
    })
    apiPatch.mockResolvedValue({ message: 'ok' })
  })

  it('muestra el contador y permite marcar una notificacion como leida', async () => {
    render(
      <MemoryRouter>
        <NotificationCenter isExpanded />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Notificaciones, 1 sin leer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Notificaciones, 1 sin leer'))
    fireEvent.click(await screen.findByText('Donacion registrada'))

    await waitFor(() => {
      expect(apiPatch).toHaveBeenCalledWith('/api/notificaciones/10/leer')
    })
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument()
  })
})

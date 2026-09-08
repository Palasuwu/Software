import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DonationHistoryDetailPage from '../pages/DonationHistoryDetailPage'
import { apiGet } from '../utils/api'
import { obtenerUsuarioSesion } from '../utils/session'

vi.mock('../utils/api', () => ({ apiGet: vi.fn() }))
vi.mock('../utils/session', () => ({ obtenerUsuarioSesion: vi.fn() }))

const detalle = {
  id_donacion: 9,
  id_donante: 21,
  id_publicacion: 3,
  donacion_estado: 'recibida',
  publicacion_estado: 'activa',
  publicacion_titulo: 'Campaña de alimentos',
  organizacion_nombre: 'Manos Unidas',
  cantidad_donada: 4,
  cantidad_recibida: 20,
  cantidad_necesaria: 50,
  articulos: []
}

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/donaciones/9']}>
      <Routes>
        <Route path="/donaciones/:idDonacion" element={<DonationHistoryDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DonationHistoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obtenerUsuarioSesion.mockReturnValue({ id_usuario: 21, rol: 'donante' })
  })

  it('muestra la confirmacion cuando la organizacion recibe la donacion', async () => {
    apiGet.mockResolvedValue(detalle)
    renderDetalle()

    await waitFor(() => {
      expect(screen.getByText('Recepción confirmada')).toBeInTheDocument()
    })
    expect(screen.getByText('Manos Unidas confirmó que recibió tu donación.')).toBeInTheDocument()
  })

  it('no muestra la confirmacion mientras la donacion sigue pendiente', async () => {
    apiGet.mockResolvedValue({ ...detalle, donacion_estado: 'pendiente' })
    renderDetalle()

    await screen.findByText('Detalle de Donacion #9')
    expect(screen.queryByText('Recepción confirmada')).not.toBeInTheDocument()
  })
})

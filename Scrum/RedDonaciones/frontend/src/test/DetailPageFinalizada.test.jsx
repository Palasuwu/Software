import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPage from '../pages/DetailPage'
import { apiGet } from '../utils/api'

vi.mock('../utils/api', () => ({ apiGet: vi.fn(), apiPost: vi.fn() }))
vi.mock('../utils/session', () => ({ obtenerUsuarioSesion: vi.fn(() => null) }))

const finalizada = [{
  id_publicacion: 10,
  titulo: 'Útiles para aprender',
  descripcion: 'Entrega de útiles',
  estado: 'finalizada',
  cantidad_necesaria: 40,
  cantidad_recibida: 40,
  organizacion: 'Liga Juvenil',
  categoria: 'Educación',
  articulo: 'Cuadernos',
  descripcion_detalle: 'Cuadernos entregados',
  resultado_resumen: 'Los útiles fueron entregados a estudiantes de la comunidad.',
  resultado_personas_beneficiadas: 35,
  resultado_fecha_publicacion: '2026-09-08'
}]

describe('Detalle de campaña finalizada', () => {
  beforeEach(() => apiGet.mockResolvedValue(finalizada))

  it('muestra resultados y oculta el formulario de donación', async () => {
    render(
      <MemoryRouter initialEntries={['/detalle/10']}>
        <Routes><Route path="/detalle/:id" element={<DetailPage />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('El impacto que logramos juntos')).toBeInTheDocument()
    expect(screen.getByText('35 personas beneficiadas')).toBeInTheDocument()
    expect(screen.queryByText('Agendar entrega')).not.toBeInTheDocument()
  })
})

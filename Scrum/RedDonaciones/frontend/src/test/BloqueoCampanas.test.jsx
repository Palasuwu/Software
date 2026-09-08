import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPage from '../pages/DetailPage'
import HomePage from '../pages/HomePage'
import { apiGet, apiPost } from '../utils/api'
import { obtenerUsuarioSesion } from '../utils/session'

vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}))

vi.mock('../utils/session', () => ({
  obtenerUsuarioSesion: vi.fn()
}))

function renderDetailPage(id = 1) {
  return render(
    <MemoryRouter initialEntries={[`/detalle/${id}`]}>
      <Routes>
        <Route path="/detalle/:id" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Bloqueo de donaciones en campañas finalizadas y vencidas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obtenerUsuarioSesion.mockReturnValue({
      id_usuario: 10,
      nombre: 'Donante Prueba',
      telefono: '55551234',
      rol: 'donante'
    })
  })

  // 1. Campaña Finalizada: muestra aviso y bloquea formulario de donación
  it('en DetailPage con campaña finalizada, muestra mensaje de bloqueo y no renderiza el formulario', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 1,
      titulo: 'Campaña Escolar Concluida',
      descripcion: 'Recolección de útiles',
      estado: 'finalizada',
      cantidad_necesaria: 50,
      cantidad_recibida: 50,
      fecha_limite: '2030-12-31',
      organizacion: 'Liga Juvenil',
      categoria: 'Educación',
      articulo: 'Cuadernos',
      descripcion_detalle: 'Cuadernos de líneas'
    }])

    renderDetailPage(1)

    // Verifica que se muestre el aviso de campaña finalizada
    expect(await screen.findByRole('heading', { name: 'Campaña finalizada' })).toBeInTheDocument()
    expect(screen.getByText(/Esta campaña ha finalizado y ya no acepta donaciones/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver otras campañas' })).toBeInTheDocument()

    // Verifica que el formulario de agendar entrega esté completamente oculto
    expect(screen.queryByText('Agendar entrega')).not.toBeInTheDocument()
    expect(screen.queryByText('Confirmar entrega')).not.toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  // 2. Campaña con fecha límite vencida: muestra aviso de cancelada y bloquea formulario
  it('en DetailPage con campaña con fecha límite vencida, muestra aviso de vencimiento y no renderiza formulario', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 2,
      titulo: 'Campaña Pasada',
      descripcion: 'Campaña cuya fecha límite ya venció',
      estado: 'activa',
      fecha_limite: '2020-01-01', // Pasado
      cantidad_necesaria: 100,
      cantidad_recibida: 20,
      organizacion: 'Fundación Ayuda',
      categoria: 'Ropa',
      articulo: 'Suéteres',
      descripcion_detalle: 'Talla M'
    }])

    renderDetailPage(2)

    // Verifica el título y mensaje de bloqueo por fecha límite expirada
    expect(await screen.findByRole('heading', { name: 'Campaña cancelada' })).toBeInTheDocument()
    expect(screen.getByText('Ha pasado la fecha límite de la campaña y ya no acepta donaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver otras causas' })).toBeInTheDocument()

    // Verifica que no se permite donar
    expect(screen.queryByText('Agendar entrega')).not.toBeInTheDocument()
    expect(screen.queryByText('Confirmar entrega')).not.toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  // 3. Campaña cancelada: muestra aviso de cancelada y bloquea formulario
  it('en DetailPage con campaña cancelada, muestra mensaje de cancelación y oculta el formulario', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 3,
      titulo: 'Campaña Suspendida',
      descripcion: 'Campaña que fue cancelada por el intermediario',
      estado: 'cancelada',
      fecha_limite: '2030-12-31',
      cantidad_necesaria: 80,
      cantidad_recibida: 10,
      organizacion: 'Hogar Esperanza',
      categoria: 'Alimentos',
      articulo: 'Arroz',
      descripcion_detalle: 'Bolsas'
    }])

    renderDetailPage(3)

    expect(await screen.findByRole('heading', { name: 'Campaña cancelada' })).toBeInTheDocument()
    expect(screen.getByText('Esta campaña está cancelada y no acepta donaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver otras causas' })).toBeInTheDocument()
    expect(screen.queryByText('Agendar entrega')).not.toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  // 4. Campaña activa y vigente: renderiza formulario y permite registrar la donación
  it('en DetailPage con campaña activa y vigente, renderiza formulario y permite donar exitosamente', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 4,
      titulo: 'Campaña Vigente Activa',
      descripcion: 'Campaña en curso',
      estado: 'activa',
      fecha_limite: '2030-12-31',
      cantidad_necesaria: 100,
      cantidad_recibida: 10,
      organizacion: 'Hogar Esperanza',
      categoria: 'Alimentos',
      articulo: 'Frijol',
      descripcion_detalle: 'Bolsas de 5lb'
    }])
    apiPost.mockResolvedValue({ message: 'Donación registrada exitosamente' })

    const { container } = renderDetailPage(4)

    // Formulario debe estar visible
    expect(await screen.findByRole('heading', { name: 'Agendar entrega' })).toBeInTheDocument()
    expect(screen.queryByText(/Esta campaña ha finalizado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ha pasado la fecha límite/i)).not.toBeInTheDocument()

    // Llenar campos requeridos
    fireEvent.change(container.querySelector('input[name="fecha"]'), {
      target: { value: '2026-09-20' }
    })
    fireEvent.change(container.querySelector('select[name="hora"]'), {
      target: { value: '11:00' }
    })

    // Marcar compromiso de entrega
    fireEvent.click(screen.getByRole('checkbox', {
      name: /Confirmo mi compromiso de entrega/
    }))

    // Enviar formulario
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/donaciones',
        expect.objectContaining({
          id_publicacion: 4,
          cantidad_donada: 1,
          hora_preferida: '11:00',
          fecha_donacion: '2026-09-20'
        })
      )
    })
  })

  // 5. HomePage: Oculta campañas canceladas y vencidas, y muestra badge en finalizadas
  it('en HomePage oculta campañas canceladas y vencidas, pero muestra activas y finalizadas con badge', async () => {
    apiGet.mockResolvedValue([
      {
        id_publicacion: 10,
        titulo: 'Campaña Activa en Home',
        descripcion: 'Campaña normal',
        estado: 'activa',
        fecha_limite: '2030-12-31',
        cantidad_necesaria: 100,
        cantidad_recibida: 30,
        categoria: 'Educación',
        organizacion: 'Org A'
      },
      {
        id_publicacion: 20,
        titulo: 'Campaña Finalizada en Home',
        descripcion: 'Meta lograda',
        estado: 'finalizada',
        fecha_limite: '2030-12-31',
        cantidad_necesaria: 50,
        cantidad_recibida: 50,
        categoria: 'Salud',
        organizacion: 'Org B'
      },
      {
        id_publicacion: 30,
        titulo: 'Campaña Cancelada en Home',
        descripcion: 'Cancelada',
        estado: 'cancelada',
        fecha_limite: '2030-12-31',
        cantidad_necesaria: 80,
        cantidad_recibida: 10,
        categoria: 'Alimentos',
        organizacion: 'Org C'
      },
      {
        id_publicacion: 40,
        titulo: 'Campaña Vencida en Home',
        descripcion: 'Expiró',
        estado: 'activa',
        fecha_limite: '2020-01-01',
        cantidad_necesaria: 100,
        cantidad_recibida: 5,
        categoria: 'Ropa',
        organizacion: 'Org D'
      }
    ])

    const { container } = render(
      <MemoryRouter>
        <HomePage isAuthenticated={true} />
      </MemoryRouter>
    )

    // La activa y la finalizada deben mostrarse
    expect(await screen.findByText('Campaña Activa en Home')).toBeInTheDocument()
    expect(screen.getByText('Campaña Finalizada en Home')).toBeInTheDocument()

    // La campaña finalizada debe tener su badge visible en la tarjeta
    const badgeFinalizada = container.querySelector('.campaign-badge-finalizada')
    expect(badgeFinalizada).toBeInTheDocument()
    expect(badgeFinalizada).toHaveTextContent('Finalizada')

    // Las campañas canceladas y vencidas deben haber sido filtradas
    expect(screen.queryByText('Campaña Cancelada en Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Campaña Vencida en Home')).not.toBeInTheDocument()
  })
})

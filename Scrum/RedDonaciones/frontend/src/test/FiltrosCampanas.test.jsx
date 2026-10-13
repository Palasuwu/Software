import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrgaPanel from '../pages/OrgaPanel'
import HomePage from '../pages/HomePage'
import CampaignFiltersBar from '../pages/admin/CampaignFiltersBar'
import { FILTROS_CAMPANA_VACIOS, contarCampanasPorEstado, filtrarCampanas } from '../pages/admin/campaignFilters'
import { apiGet } from '../utils/api'

vi.mock('../utils/api', () => ({ apiGet: vi.fn(), apiPut: vi.fn(), apiPost: vi.fn(), apiUpload: vi.fn() }))

const CAMPANAS = [
  { id_publicacion: 1, titulo: 'Útiles para la escuela', categoria: 'Educación', articulo: 'Cuadernos', estado: 'activa' },
  { id_publicacion: 2, titulo: 'Abrigos de invierno', categoria: 'Ropa', articulo: 'Chumpas', estado: 'finalizada' },
  { id_publicacion: 3, titulo: 'Víveres para familias', categoria: 'Alimentos', articulo: 'Arroz', estado: 'cancelada' },
  { id_publicacion: 4, titulo: 'Zapatos escolares', categoria: 'Ropa', articulo: 'Zapatos', estado: 'activa' }
]

const titulos = (lista) => lista.map((c) => c.id_publicacion)

describe('filtrarCampanas', () => {
  it('sin filtros devuelve todas', () => {
    expect(filtrarCampanas(CAMPANAS, FILTROS_CAMPANA_VACIOS)).toHaveLength(4)
  })

  it('busca sin importar tildes ni mayúsculas', () => {
    expect(titulos(filtrarCampanas(CAMPANAS, { texto: 'VIVERES', estado: '' }))).toEqual([3])
    expect(titulos(filtrarCampanas(CAMPANAS, { texto: 'educacion', estado: '' }))).toEqual([1])
  })

  it('busca también por artículo', () => {
    expect(titulos(filtrarCampanas(CAMPANAS, { texto: 'chumpas', estado: '' }))).toEqual([2])
  })

  it('combina texto y estado', () => {
    expect(titulos(filtrarCampanas(CAMPANAS, { texto: 'ropa', estado: 'activa' }))).toEqual([4])
    expect(titulos(filtrarCampanas(CAMPANAS, { texto: '', estado: 'cancelada' }))).toEqual([3])
  })

  it('cuenta las campañas de cada estado real', () => {
    expect(contarCampanasPorEstado(CAMPANAS)).toEqual({ activa: 2, finalizada: 1, cancelada: 1 })
  })
})

describe('CampaignFiltersBar', () => {
  function renderBarra(filtros, visibles) {
    const props = { onChange: vi.fn(), onClear: vi.fn() }
    render(<CampaignFiltersBar publicaciones={CAMPANAS} visibles={visibles} filtros={filtros} {...props} />)
    return props
  }

  it('solo ofrece los estados que existen, con su cantidad', () => {
    renderBarra(FILTROS_CAMPANA_VACIOS, 4)
    const opciones = within(screen.getByLabelText('Filtrar por estado')).getAllByRole('option').map((o) => o.textContent)
    expect(opciones).toEqual(['Todos los estados (4)', 'Activa (2)', 'Finalizada (1)', 'Cancelada (1)'])
  })

  it('sin filtros no muestra el resumen ni el botón de limpiar', () => {
    renderBarra(FILTROS_CAMPANA_VACIOS, 4)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('con filtros dice cuántas se ven y permite limpiarlos', () => {
    const { onClear } = renderBarra({ texto: '', estado: 'activa' }, 2)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 2 de 4 campañas')
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('avisa cuando los filtros ocultan todo', () => {
    renderBarra({ texto: 'no existe', estado: '' }, 0)
    expect(screen.getByText('Ninguna campaña coincide con los filtros. Hay 4 en total.')).toBeInTheDocument()
  })

  it('al escribir conserva el otro filtro', () => {
    const { onChange } = renderBarra({ texto: '', estado: 'activa' }, 2)
    fireEvent.change(screen.getByLabelText('Buscar campaña'), { target: { value: 'zap' } })
    expect(onChange).toHaveBeenCalledWith({ texto: 'zap', estado: 'activa' })
  })
})

describe('filtros en el panel de organización', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    apiGet.mockImplementation(async (url) => (url === '/api/intermediario/publicaciones' ? CAMPANAS : []))
  })

  it('filtra la tabla y vuelve a mostrar todo al limpiar', async () => {
    render(<OrgaPanel />)
    await screen.findByText('Útiles para la escuela')

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'activa' } })
    expect(screen.getByText('Zapatos escolares')).toBeInTheDocument()
    expect(screen.queryByText('Abrigos de invierno')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar campaña'), { target: { value: 'nada parecido' } })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No hay publicaciones registradas.')).not.toBeInTheDocument()
    expect(screen.getByText(/Ninguna campaña coincide/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getAllByRole('row')).toHaveLength(CAMPANAS.length + 1)
  })

  it('sin campañas no muestra filtros', async () => {
    apiGet.mockResolvedValue([])
    render(<OrgaPanel />)
    expect(await screen.findByText('No hay publicaciones registradas.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filtrar por estado')).not.toBeInTheDocument()
  })
})

describe('filtros del inicio', () => {
  const PUBLICAS = [
    { id_publicacion: 1, titulo: 'Útiles', descripcion: 'x', estado: 'activa', categoria: 'Educación', organizacion: 'Liga Juvenil', fecha_publicacion: '2099-01-01', cantidad_necesaria: 10, cantidad_recibida: 5 },
    { id_publicacion: 2, titulo: 'Abrigos', descripcion: 'x', estado: 'finalizada', categoria: 'Ropa', organizacion: 'Liga Juvenil', cantidad_necesaria: 10, cantidad_recibida: 10 }
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    apiGet.mockResolvedValue(PUBLICAS)
  })

  const renderHome = () => render(<MemoryRouter><HomePage isAuthenticated={false} /></MemoryRouter>)

  it('ya no ofrece filtros de organización ni de campañas próximas', async () => {
    renderHome()
    await screen.findAllByText('Útiles')
    expect(screen.queryByRole('button', { name: 'Organización' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finalizada' })).toBeInTheDocument()
  })

  it('las etiquetas de progreso coinciden con lo que filtran', async () => {
    renderHome()
    await screen.findAllByText('Útiles')
    fireEvent.click(screen.getByRole('button', { name: /Progreso/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'De 50% a 99%' }))
    expect(screen.getByText('Mostrando 1 de 2 campañas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Meta alcanzada (100%)' }))
    expect(screen.getByText('Mostrando 1 de 2 campañas')).toBeInTheDocument()
  })

  it('si la categoría elegida desaparece al recargar vuelve a Todas', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderHome()
    await screen.findAllByText('Útiles')
    fireEvent.click(screen.getByRole('button', { name: 'Ropa' }))
    expect(screen.getByText('Mostrando 1 de 2 campañas')).toBeInTheDocument()

    apiGet.mockResolvedValue([PUBLICAS[0]])
    await vi.advanceTimersByTimeAsync(8000)
    await waitFor(() => expect(screen.getByText('1 campañas disponibles')).toBeInTheDocument())
    expect(screen.queryByText('No hay publicaciones para los filtros seleccionados.')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})

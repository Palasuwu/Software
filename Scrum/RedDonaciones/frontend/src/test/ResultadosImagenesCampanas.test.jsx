import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPage from '../pages/DetailPage'
import OrgaCampaignResultModal from '../pages/orga/OrgaCampaignResultModal'
import { apiGet, apiPost } from '../utils/api'
import { obtenerUsuarioSesion } from '../utils/session'

vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}))

vi.mock('../utils/session', () => ({
  obtenerUsuarioSesion: vi.fn()
}))

function renderDetailPage(id = 10) {
  return render(
    <MemoryRouter initialEntries={[`/detalle/${id}`]}>
      <Routes>
        <Route path="/detalle/:id" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Resultados e imágenes de campañas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obtenerUsuarioSesion.mockReturnValue(null)
  })

  // 1. Campaña finalizada con resultados e imagen publicados
  it('en DetailPage con campaña finalizada, muestra la sección de impacto con resumen, beneficiarios e imagen', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 10,
      titulo: 'Útiles Escolares 2026',
      descripcion: 'Recolección de útiles',
      estado: 'finalizada',
      cantidad_necesaria: 100,
      cantidad_recibida: 100,
      imagen_url: 'https://ejemplo.com/portada_utiles.jpg',
      organizacion: 'Liga Juvenil',
      categoria: 'Educación',
      articulo: 'Cuadernos',
      descripcion_detalle: 'Cuadernos de líneas',
      resultado_resumen: 'Se entregaron 100 paquetes escolares completos a niños de escasos recursos.',
      resultado_personas_beneficiadas: 85,
      resultado_imagen_url: 'https://ejemplo.com/foto_entrega_resultados.jpg',
      resultado_fecha_publicacion: '2026-09-08'
    }])

    renderDetailPage(10)

    // Sección de resultados presente
    expect(await screen.findByRole('heading', { name: 'El impacto que logramos juntos' })).toBeInTheDocument()
    expect(screen.getByText('Se entregaron 100 paquetes escolares completos a niños de escasos recursos.')).toBeInTheDocument()
    expect(screen.getByText('85 personas beneficiadas')).toBeInTheDocument()
    expect(screen.getByText('Resultados publicados el 2026-09-08')).toBeInTheDocument()

    // Imagen de resultados correctamente vinculada
    const imgResultado = screen.getByAltText('Resultados de Útiles Escolares 2026')
    expect(imgResultado).toBeInTheDocument()
    expect(imgResultado).toHaveAttribute('src', 'https://ejemplo.com/foto_entrega_resultados.jpg')
  })

  // 2. Campaña finalizada pero sin resultados publicados aún
  it('en DetailPage con campaña finalizada sin resultados, muestra mensaje de preparación y no renderiza imagen de resultados', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 11,
      titulo: 'Juguetes Navideños',
      descripcion: 'Campaña navideña',
      estado: 'finalizada',
      cantidad_necesaria: 50,
      cantidad_recibida: 50,
      organizacion: 'Hogar Esperanza',
      categoria: 'Juguetes',
      articulo: 'Pelotas',
      descripcion_detalle: 'Pelotas de fútbol',
      resultado_resumen: null,
      resultado_personas_beneficiadas: null,
      resultado_imagen_url: null,
      resultado_fecha_publicacion: null
    }])

    renderDetailPage(11)

    expect(await screen.findByRole('heading', { name: 'El impacto que logramos juntos' })).toBeInTheDocument()
    expect(screen.getByText('La organización está preparando el informe de resultados de esta campaña.')).toBeInTheDocument()
    expect(screen.queryByAltText(/Resultados de/i)).not.toBeInTheDocument()
  })

  // 3. Campaña activa NO muestra sección de resultados
  it('en DetailPage con campaña activa, no muestra la sección de resultados ni de impacto', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 12,
      titulo: 'Campaña de Alimentos',
      descripcion: 'Apoyo alimentario',
      estado: 'activa',
      cantidad_necesaria: 100,
      cantidad_recibida: 20,
      fecha_limite: '2030-12-31',
      organizacion: 'Comedor Central',
      categoria: 'Alimentos',
      articulo: 'Arroz',
      descripcion_detalle: 'Bolsas'
    }])

    renderDetailPage(12)

    await screen.findByText('Campaña de Alimentos')
    expect(screen.queryByText('El impacto que logramos juntos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Resultados de la campaña')).not.toBeInTheDocument()
  })

  // 4. Imagen de portada de la campaña en DetailPage
  it('en DetailPage renderiza la imagen de portada de la campaña o imagen por defecto', async () => {
    apiGet.mockResolvedValue([{
      id_publicacion: 13,
      titulo: 'Campaña con Foto',
      descripcion: 'Descripción',
      estado: 'activa',
      cantidad_necesaria: 50,
      cantidad_recibida: 10,
      imagen_url: 'https://ejemplo.com/foto_portada.jpg',
      organizacion: 'Org',
      categoria: 'Salud',
      articulo: 'Medicinas',
      descripcion_detalle: 'Kits'
    }])

    const { container } = renderDetailPage(13)

    await screen.findByText('Campaña con Foto')
    const heroImg = container.querySelector('.dp-cover-image')
    expect(heroImg).toBeInTheDocument()
    expect(heroImg).toHaveAttribute('src', 'https://ejemplo.com/foto_portada.jpg')
    expect(heroImg).toHaveAttribute('alt', 'Campaña con Foto')
  })

  // 5. Modal de resultados para la organización: campos, validaciones y envío
  it('en OrgaCampaignResultModal renderiza los campos de resumen, personas beneficiadas y URL de imagen', () => {
    const handleClose = vi.fn()
    const handleChange = vi.fn()
    const handleSubmit = vi.fn((e) => e.preventDefault())

    const pub = { titulo: 'Útiles Escolares 2026' }
    const form = {
      resumen: 'Se logró la entrega completa',
      personas_beneficiadas: '40',
      imagen_url: 'https://ejemplo.com/foto.jpg'
    }

    const { container, rerender } = render(
      <OrgaCampaignResultModal
        publicacion={pub}
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={handleClose}
        saving={false}
        error={null}
      />
    )

    // Validar visualización de encabezado y publicación
    expect(screen.getByRole('heading', { name: 'Publicar resultados' })).toBeInTheDocument()
    expect(screen.getByText('Útiles Escolares 2026')).toBeInTheDocument()

    // Validar campos de formulario
    const resumenInput = screen.getByPlaceholderText(/Cuenta qué se logró con la campaña/i)
    expect(resumenInput).toHaveValue('Se logró la entrega completa')
    expect(resumenInput).toHaveAttribute('maxLength', '1000')
    expect(resumenInput).toBeRequired()

    const personasInput = container.querySelector('input[name="personas_beneficiadas"]')
    expect(personasInput).toBeInTheDocument()
    expect(personasInput).toHaveValue(40)
    expect(personasInput).toHaveAttribute('type', 'number')

    const imagenInput = screen.getByPlaceholderText('https://...')
    expect(imagenInput).toHaveValue('https://ejemplo.com/foto.jpg')

    // Probar interacción de cambio y envío
    fireEvent.change(resumenInput, { target: { name: 'resumen', value: 'Nuevo resumen' } })
    expect(handleChange).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Publicar resultados' }))
    expect(handleSubmit).toHaveBeenCalled()

    // Probar estado de guardado/carga
    rerender(
      <OrgaCampaignResultModal
        publicacion={pub}
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={handleClose}
        saving={true}
        error={null}
      />
    )
    const btnGuardando = screen.getByRole('button', { name: 'Publicando...' })
    expect(btnGuardando).toBeDisabled()
  })
})

import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPage from '../../pages/DetailPage'
import OrgaDetailPage from '../../pages/OrgaDetailPage'
import { apiGet } from '../../utils/api'

vi.mock('../../utils/api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn()
}))

vi.mock('../../utils/session', () => ({
    obtenerUsuarioSesion: vi.fn(() => null)
}))

const organizacion = {
    id_organizacion: 3,
    nombre: 'Hogar La Esperanza',
    descripcion: 'Apoyo a familias',
    direccion: '18 avenida 11-95',
    departamento: 'Guatemala',
    municipio: 'Guatemala',
    zona: '15',
    latitud: 14.6,
    longitud: -90.5,
    estado_verificacion: 'verificada'
}

function campana(datos) {
    return [{
        id_publicacion: 12,
        titulo: 'Campaña de alimentos',
        descripcion: 'Apoyo para familias',
        categoria: 'Alimentos',
        organizacion: organizacion.nombre,
        estado: 'activa',
        cantidad_necesaria: 100,
        cantidad_recibida: 25,
        articulo: 'Arroz',
        descripcion_detalle: 'Bolsas',
        direccion: organizacion.direccion,
        ...datos
    }]
}

function coordenadasDelMarcador() {
    const maps = new URL(screen.getByRole('link', { name: 'Ver en Google Maps' }).getAttribute('href'))
    const waze = new URL(screen.getByRole('link', { name: 'Cómo llegar con Waze' }).getAttribute('href'))
    return { maps: maps.searchParams.get('query'), waze: waze.searchParams.get('ll') }
}

function renderRuta(ruta, patron, pagina) {
    return render(
        <MemoryRouter initialEntries={[ruta]}>
            <Routes>
                <Route path={patron} element={pagina} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

afterEach(cleanup)

describe('Marcador en el detalle de campaña', () => {
    it('apunta a las coordenadas propias que devuelve el backend', async () => {
        apiGet.mockResolvedValue(campana({
            departamento: 'Guatemala',
            municipio: 'Mixco',
            zona: '4',
            direccion_detalle: '5 avenida 10-20',
            latitud: 14.6345679,
            longitud: -90.5069123,
            ubicacion_heredada: false
        }))

        renderRuta('/detalle/12', '/detalle/:id', <DetailPage />)

        const bloque = await screen.findByRole('region', { name: 'Dónde entregar' })
        expect(apiGet).toHaveBeenCalledWith('/api/publicaciones/12')
        expect(coordenadasDelMarcador()).toEqual({ maps: '14.6345679,-90.5069123', waze: '14.6345679,-90.5069123' })
        expect(within(bloque).getByText('5 avenida 10-20, Zona 4, Mixco, Guatemala')).toBeInTheDocument()
        expect(screen.queryByText('Esta campaña usa la ubicación de la organización.')).not.toBeInTheDocument()
    })

    it('usa las coordenadas de la organización cuando la ubicación es heredada', async () => {
        apiGet.mockResolvedValue(campana({
            departamento: organizacion.departamento,
            municipio: organizacion.municipio,
            zona: organizacion.zona,
            direccion_detalle: organizacion.direccion,
            latitud: organizacion.latitud,
            longitud: organizacion.longitud,
            ubicacion_heredada: true
        }))

        renderRuta('/detalle/12', '/detalle/:id', <DetailPage />)

        await screen.findByRole('region', { name: 'Dónde entregar' })
        expect(coordenadasDelMarcador()).toEqual({ maps: '14.6,-90.5', waze: '14.6,-90.5' })
        expect(screen.getByText('Esta campaña usa la ubicación de la organización.')).toBeInTheDocument()
    })

    it('busca por la dirección si la campaña no tiene coordenadas', async () => {
        apiGet.mockResolvedValue(campana({
            departamento: 'Guatemala',
            municipio: 'Mixco',
            zona: '4',
            direccion_detalle: '5 avenida 10-20',
            latitud: null,
            longitud: null,
            ubicacion_heredada: false
        }))

        renderRuta('/detalle/12', '/detalle/:id', <DetailPage />)

        await screen.findByRole('region', { name: 'Dónde entregar' })
        expect(coordenadasDelMarcador().maps).toBe('Hogar La Esperanza, 5 avenida 10-20, Zona 4, Mixco, Guatemala')
        expect(screen.getByText(/Sin coordenadas registradas/)).toBeInTheDocument()
    })
})

describe('Marcador en el detalle de organización', () => {
    it('apunta a las coordenadas guardadas de la organización', async () => {
        apiGet.mockResolvedValue({ organizacion, publicaciones: [] })

        renderRuta('/organizaciones/3', '/organizaciones/:id', <OrgaDetailPage />)

        expect(await screen.findByRole('region', { name: 'Cómo llegar' })).toBeInTheDocument()
        expect(apiGet).toHaveBeenCalledWith('/api/organizaciones/3')
        expect(coordenadasDelMarcador()).toEqual({ maps: '14.6,-90.5', waze: '14.6,-90.5' })
        expect(screen.getByText('14.60000, -90.50000')).toBeInTheDocument()
    })

    it('no muestra el bloque si la organización no tiene ubicación', async () => {
        apiGet.mockResolvedValue({
            organizacion: { ...organizacion, direccion: '', departamento: '', municipio: '', zona: '', latitud: null, longitud: null },
            publicaciones: []
        })

        renderRuta('/organizaciones/3', '/organizaciones/:id', <OrgaDetailPage />)

        expect(await screen.findByText('Hogar La Esperanza')).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Cómo llegar' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Ver en Google Maps' })).not.toBeInTheDocument()
    })
})

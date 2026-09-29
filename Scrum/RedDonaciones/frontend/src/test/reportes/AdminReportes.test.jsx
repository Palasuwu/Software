import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReportes from '../../pages/admin/AdminReportes'
import { apiGet } from '../../utils/api'
import { descargarCsv } from '../../utils/csv'

vi.mock('../../utils/api', () => ({ apiGet: vi.fn() }))

vi.mock('../../utils/csv', async (importOriginal) => ({
    ...(await importOriginal()),
    descargarCsv: vi.fn()
}))

const RESUMEN = {
    por_estado: [
        { estado: 'pendiente', total: 1, total_donado: 5 },
        { estado: 'recibida', total: 1, total_donado: 2 },
        { estado: 'en_proceso', total: 1, total_donado: 4 },
        { estado: 'entregada', total: 2, total_donado: 13 },
        { estado: 'rechazada', total: 1, total_donado: 7 }
    ],
    donantes_unicos: 3,
    por_campana: [
        { id_publicacion: 11, titulo: 'Abrigos, invierno', total_donaciones: 6, total_donado: 31 },
        { id_publicacion: 12, titulo: 'Útiles escolares', total_donaciones: 0, total_donado: 0 }
    ]
}

const DONACIONES = Array.from({ length: 45 }, (_, i) => ({
    id_donacion: 100 + i,
    fecha_donacion: '2019-01-15',
    estado: i % 2 ? 'entregada' : 'en_proceso',
    cantidad_donada: i + 1,
    donante_nombre: `Donante ${i + 1}`,
    id_publicacion: 11,
    campana_titulo: 'Abrigos, invierno'
}))

let resumen
let donaciones

function parametros(url) {
    return Object.fromEntries(new URL(url, 'http://localhost').searchParams)
}

function llamadas(ruta) {
    return apiGet.mock.calls.map(([url]) => url).filter((url) => url.startsWith(ruta))
}

function paginaDetalle(url) {
    const { page = '1', page_size = '20' } = parametros(url)
    const inicio = (Number(page) - 1) * Number(page_size)
    return {
        items: donaciones.slice(inicio, inicio + Number(page_size)),
        total: donaciones.length,
        page: Number(page),
        page_size: Number(page_size),
        total_paginas: Math.ceil(donaciones.length / Number(page_size))
    }
}

async function renderReportes() {
    render(<AdminReportes />)
    await screen.findByText('Donaciones por estado')
}

function kpi(etiqueta) {
    const label = screen.getAllByText(etiqueta).find((el) => el.classList.contains('rep-kpi-label'))
    return label.previousSibling.textContent
}

beforeEach(() => {
    vi.clearAllMocks()
    resumen = RESUMEN
    donaciones = DONACIONES
    apiGet.mockImplementation(async (url) => (url.startsWith('/api/reportes/resumen') ? resumen : paginaDetalle(url)))
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
})

describe('Vista de reportes', () => {
    it('carga el resumen y la primera página del detalle sin filtros', async () => {
        await renderReportes()

        expect(llamadas('/api/reportes/resumen')).toEqual(['/api/reportes/resumen'])
        expect(llamadas('/api/reportes/detalle')).toEqual(['/api/reportes/detalle?page=1&page_size=20'])
    })

    it('calcula los indicadores a partir de los datos del backend', async () => {
        await renderReportes()

        expect(kpi('Donaciones')).toBe('6')
        expect(kpi('Artículos donados')).toBe('31')
        expect(kpi('Donantes únicos')).toBe('3')
        expect(screen.getByText('45 registro(s)')).toBeInTheDocument()
    })

    it('muestra las tablas por estado y por campaña con etiquetas legibles', async () => {
        await renderReportes()

        const porEstado = screen.getByText('Donaciones por estado').closest('section')
        expect(within(porEstado).getByText('En proceso').closest('tr')).toHaveTextContent('En proceso14')
        const porCampana = screen.getByText('Donaciones por campaña').closest('section')
        expect(within(porCampana).getByText('Útiles escolares').closest('tr')).toHaveTextContent('Útiles escolares00')
    })

    it('aplica los filtros: fechas al resumen y todos los filtros al detalle', async () => {
        await renderReportes()
        apiGet.mockClear()

        fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2019-01-01' } })
        fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2019-01-31' } })
        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'entregada' } })
        fireEvent.change(screen.getByLabelText('Campaña'), { target: { value: '11' } })
        expect(apiGet).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        await waitFor(() => expect(llamadas('/api/reportes/detalle')).toHaveLength(1))
        expect(parametros(llamadas('/api/reportes/resumen')[0])).toEqual({ fecha_inicio: '2019-01-01', fecha_fin: '2019-01-31' })
        expect(parametros(llamadas('/api/reportes/detalle')[0])).toEqual({
            fecha_inicio: '2019-01-01',
            fecha_fin: '2019-01-31',
            estado: 'entregada',
            id_publicacion: '11',
            page: '1',
            page_size: '20'
        })
    })

    it('limpiar quita los filtros y vuelve a consultar sin ellos', async () => {
        await renderReportes()
        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'pendiente' } })
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
        await waitFor(() => expect(llamadas('/api/reportes/detalle')).toHaveLength(2))

        fireEvent.click(await screen.findByRole('button', { name: 'Limpiar' }))

        await waitFor(() => expect(llamadas('/api/reportes/detalle')).toHaveLength(3))
        expect(llamadas('/api/reportes/detalle').at(-1)).toBe('/api/reportes/detalle?page=1&page_size=20')
        expect(screen.getByLabelText('Estado')).toHaveValue('')
    })

    it('ofrece las campañas del resumen en el filtro', async () => {
        await renderReportes()

        const opciones = within(screen.getByLabelText('Campaña')).getAllByRole('option').map((opcion) => opcion.textContent)
        expect(opciones).toEqual(['Todas', 'Abrigos, invierno', 'Útiles escolares'])
    })
})

describe('Paginación del detalle', () => {
    it('avanza y retrocede entre páginas y bloquea los extremos', async () => {
        await renderReportes()

        expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
        expect(screen.getAllByRole('row')).toHaveLength(1 + 5 + 1 + 2 + 1 + 20)

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument()
        expect(parametros(llamadas('/api/reportes/detalle').at(-1)).page).toBe('2')

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument()
        expect(screen.getByText('Donante 41')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
        expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument()
    })

    it('al aplicar filtros vuelve a la primera página', async () => {
        await renderReportes()
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        await screen.findByText('Página 2 de 3')

        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
        expect(parametros(llamadas('/api/reportes/detalle').at(-1)).page).toBe('1')
    })

    it('no muestra la paginación cuando todo cabe en una página', async () => {
        donaciones = DONACIONES.slice(0, 20)

        await renderReportes()

        expect(screen.queryByText(/Página \d+ de/)).not.toBeInTheDocument()
    })
})

describe('Resultados vacíos y errores', () => {
    it('muestra mensajes de vacío sin romper los indicadores', async () => {
        resumen = {
            por_estado: RESUMEN.por_estado.map((fila) => ({ ...fila, total: 0, total_donado: 0 })),
            donantes_unicos: 0,
            por_campana: []
        }
        donaciones = []

        await renderReportes()

        expect(kpi('Donaciones')).toBe('0')
        expect(kpi('Artículos donados')).toBe('0')
        expect(kpi('Donantes únicos')).toBe('0')
        expect(screen.getByText('Sin campañas en el rango seleccionado.')).toBeInTheDocument()
        expect(screen.getByText('No hay donaciones que coincidan con los filtros.')).toBeInTheDocument()
        expect(screen.getByText('0 registro(s)')).toBeInTheDocument()
    })

    it('muestra el error del backend y permite reintentar', async () => {
        apiGet.mockRejectedValueOnce(new Error('fecha_fin no puede ser anterior a fecha_inicio'))

        render(<AdminReportes />)

        expect(await screen.findByText('fecha_fin no puede ser anterior a fecha_inicio')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
        expect(await screen.findByText('Donaciones por estado')).toBeInTheDocument()
    })
})

describe('Exportación a CSV', () => {
    it('exporta todas las páginas del detalle con los filtros aplicados', async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-09-29T12:00:00Z'))
        donaciones = Array.from({ length: 230 }, (_, i) => ({ ...DONACIONES[0], id_donacion: i + 1, donante_nombre: `Donante ${i + 1}` }))
        await renderReportes()
        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'en_proceso' } })
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
        await screen.findByText('Página 1 de 12')
        apiGet.mockClear()

        const detalle = screen.getByText('Detalle de donaciones').closest('section')
        fireEvent.click(within(detalle).getByRole('button', { name: 'Exportar CSV' }))

        await waitFor(() => expect(descargarCsv).toHaveBeenCalledTimes(1))
        const paginas = llamadas('/api/reportes/detalle').map(parametros)
        expect(paginas).toEqual([1, 2, 3].map((page) => ({ estado: 'en_proceso', page: String(page), page_size: '100' })))

        const [nombre, contenido] = descargarCsv.mock.calls[0]
        const lineas = contenido.split('\r\n')
        expect(nombre).toBe('reporte-donaciones-2026-09-29.csv')
        expect(lineas).toHaveLength(231)
        expect(lineas[0]).toBe('ID donación,Fecha,Donante,Campaña,Cantidad,Estado')
        expect(lineas[1]).toBe('1,2019-01-15,Donante 1,"Abrigos, invierno",1,En proceso')
        expect(lineas[230]).toContain('Donante 230')
        expect(await screen.findByText('230 donación(es) exportada(s)')).toBeInTheDocument()
    })

    it('exporta el resumen por campaña', async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-09-29T12:00:00Z'))
        await renderReportes()

        const porCampana = screen.getByText('Donaciones por campaña').closest('section')
        fireEvent.click(within(porCampana).getByRole('button', { name: 'Exportar CSV' }))

        expect(descargarCsv).toHaveBeenCalledWith(
            'reporte-campanas-2026-09-29.csv',
            'Campaña,Donaciones,Total donado\r\n"Abrigos, invierno",6,31\r\nÚtiles escolares,0,0'
        )
        expect(await screen.findByText('2 campaña(s) exportada(s)')).toBeInTheDocument()
    })

    it('no descarga nada si no hay datos que exportar', async () => {
        resumen = { ...RESUMEN, por_campana: [] }
        donaciones = []
        await renderReportes()

        fireEvent.click(within(screen.getByText('Detalle de donaciones').closest('section')).getByRole('button', { name: 'Exportar CSV' }))
        expect(await screen.findByText('No hay donaciones que coincidan con los filtros')).toBeInTheDocument()

        fireEvent.click(within(screen.getByText('Donaciones por campaña').closest('section')).getByRole('button', { name: 'Exportar CSV' }))
        expect(await screen.findByText('No hay campañas que exportar')).toBeInTheDocument()
        expect(descargarCsv).not.toHaveBeenCalled()
    })

    it('avisa si falla la exportación y no descarga un archivo incompleto', async () => {
        await renderReportes()
        apiGet.mockRejectedValueOnce(new Error('No se pudo obtener el detalle de reportes'))

        fireEvent.click(within(screen.getByText('Detalle de donaciones').closest('section')).getByRole('button', { name: 'Exportar CSV' }))

        expect(await screen.findByText('No se pudo obtener el detalle de reportes')).toBeInTheDocument()
        expect(descargarCsv).not.toHaveBeenCalled()
    })
})

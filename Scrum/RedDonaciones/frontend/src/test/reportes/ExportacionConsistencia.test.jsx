// Exportación del detalle con muchas páginas, caracteres raros y datos que cambian a mitad.
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReportes from '../../pages/admin/AdminReportes'
import { apiGet } from '../../utils/api'
import { construirCsv, descargarCsv } from '../../utils/csv'

vi.mock('../../utils/api', () => ({ apiGet: vi.fn() }))

vi.mock('../../utils/csv', async (importOriginal) => ({
    ...(await importOriginal()),
    descargarCsv: vi.fn()
}))

const RESUMEN = { por_estado: [], donantes_unicos: 0, por_campana: [] }

function donacion(id, extra = {}) {
    return {
        id_donacion: id,
        fecha_donacion: '2026-10-01',
        estado: 'pendiente',
        cantidad_donada: 1,
        donante_nombre: `Donante ${id}`,
        id_publicacion: 1,
        campana_titulo: 'Campaña',
        ...extra
    }
}

let donaciones
// Se llama después de responder cada página, para simular cambios entre una y otra.
let despuesDePagina

function paginaDetalle(url) {
    const params = new URL(url, 'http://localhost').searchParams
    const page = Number(params.get('page') || 1)
    const size = Number(params.get('page_size') || 20)
    const respuesta = {
        items: donaciones.slice((page - 1) * size, page * size),
        total: donaciones.length,
        page,
        page_size: size,
        total_paginas: Math.ceil(donaciones.length / size)
    }
    if (size === 100) despuesDePagina(page)
    return respuesta
}

async function exportar() {
    render(<AdminReportes />)
    await screen.findByText('Donaciones por estado')
    const detalle = screen.getByText('Detalle de donaciones').closest('section')
    fireEvent.click(within(detalle).getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() => expect(within(detalle).getByRole('button', { name: 'Exportar CSV' })).not.toBeDisabled())
}

function lineasDescargadas() {
    expect(descargarCsv).toHaveBeenCalledTimes(1)
    return descargarCsv.mock.calls[0][1].split('\r\n')
}

beforeEach(() => {
    vi.clearAllMocks()
    donaciones = []
    despuesDePagina = () => {}
    apiGet.mockImplementation(async (url) => (url.startsWith('/api/reportes/resumen') ? RESUMEN : paginaDetalle(url)))
})

afterEach(() => {
    cleanup()
})

describe('Exportación del detalle: volumen', () => {
    it('exporta 5000 donaciones (500 usuarios × 10) en 50 páginas sin perder ni repetir filas', async () => {
        donaciones = Array.from({ length: 5000 }, (_, i) => donacion(5000 - i))

        await exportar()

        const lineas = lineasDescargadas()
        const ids = lineas.slice(1).map((linea) => linea.split(',')[0])
        expect(lineas).toHaveLength(5001)
        expect(new Set(ids).size).toBe(5000)
        expect(apiGet.mock.calls.filter(([url]) => url.includes('page_size=100'))).toHaveLength(50)
        expect(screen.getByText('5000 donación(es) exportada(s)')).toBeInTheDocument()
    })

    it('si falla la última página no descarga un archivo parcial', async () => {
        donaciones = Array.from({ length: 250 }, (_, i) => donacion(i + 1))
        apiGet.mockImplementation(async (url) => {
            if (url.startsWith('/api/reportes/resumen')) return RESUMEN
            if (url.includes('page=3&page_size=100')) throw new Error('No se pudo obtener el detalle de reportes')
            return paginaDetalle(url)
        })

        await exportar()

        expect(descargarCsv).not.toHaveBeenCalled()
        expect(screen.getByText('No se pudo obtener el detalle de reportes')).toBeInTheDocument()
        expect(screen.queryByText(/exportada\(s\)/)).not.toBeInTheDocument()
    })
})

describe('Exportación del detalle: caracteres', () => {
    it('conserva tildes, comillas, comas, saltos de línea y emojis en una sola celda', async () => {
        const nombres = ['José Ñandú', 'Ana "La Flaca"', 'Coma, punto; y coma', 'Línea uno\nLínea dos', 'Víveres 😀']
        donaciones = nombres.map((nombre, i) => donacion(i + 1, { donante_nombre: nombre }))

        await exportar()

        const contenido = descargarCsv.mock.calls[0][1]
        expect(contenido).toContain('José Ñandú')
        expect(contenido).toContain('"Ana ""La Flaca"""')
        expect(contenido).toContain('"Coma, punto; y coma"')
        expect(contenido).toContain('"Línea uno\nLínea dos"')
        expect(contenido).toContain('Víveres 😀')
        // El salto de línea va entre comillas: el archivo sigue teniendo una fila por donación.
        expect(contenido.split('\r\n')).toHaveLength(6)
    })

    it('un nombre que empieza con =, + o @ no se exporta como fórmula', () => {
        const csv = construirCsv(
            [{ nombre: '=HYPERLINK("http://x","clic")' }, { nombre: '+50212345678' }, { nombre: '@SUMA(1)' }],
            [{ clave: 'nombre', titulo: 'Nombre' }]
        )
        const celdas = csv.split('\r\n').slice(1)

        for (const celda of celdas) {
            expect(celda.replace(/^"/, '')).not.toMatch(/^[=+@-]/)
        }
    })
})

describe('Exportación del detalle: datos que cambian a mitad', () => {
    it('si entra una donación a mitad avisa y no descarga un archivo incompleto', async () => {
        donaciones = Array.from({ length: 250 }, (_, i) => donacion(250 - i))
        despuesDePagina = (page) => {
            if (page === 1) donaciones = [donacion(999), ...donaciones]
        }

        await exportar()

        expect(descargarCsv).not.toHaveBeenCalled()
        expect(screen.getByText('Los datos cambiaron mientras se exportaba. Vuelve a intentarlo.')).toBeInTheDocument()
        expect(screen.queryByText(/exportada\(s\)/)).not.toBeInTheDocument()
    })

    it('si una entra y otra se borra a mitad, el total no cambia pero detecta la fila repetida', async () => {
        donaciones = Array.from({ length: 250 }, (_, i) => donacion(250 - i))
        despuesDePagina = (page) => {
            if (page === 1) donaciones = [donacion(999), ...donaciones.slice(0, -1)]
        }

        await exportar()

        expect(descargarCsv).not.toHaveBeenCalled()
        expect(screen.getByText('Los datos cambiaron mientras se exportaba. Vuelve a intentarlo.')).toBeInTheDocument()
    })

    it('si una donación cambia de estado sin filtro, el archivo sigue completo', async () => {
        donaciones = Array.from({ length: 250 }, (_, i) => donacion(250 - i))
        despuesDePagina = (page) => {
            if (page === 1) donaciones = donaciones.map((d) => (d.id_donacion === 10 ? { ...d, estado: 'entregada' } : d))
        }

        await exportar()

        const lineas = lineasDescargadas()
        expect(lineas).toHaveLength(251)
        expect(lineas.find((linea) => linea.startsWith('10,'))).toContain('Entregada')
    })
})

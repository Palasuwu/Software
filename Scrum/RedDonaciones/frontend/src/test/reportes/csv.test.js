import { afterEach, describe, expect, it, vi } from 'vitest'
import { construirCsv, descargarCsv, sufijoFechaArchivo } from '../../utils/csv'

const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'cantidad', titulo: 'Cantidad' }
]

function leerBytes(blob) {
    return new Promise((resolve) => {
        const lector = new FileReader()
        lector.onload = () => resolve(new Uint8Array(lector.result))
        lector.readAsArrayBuffer(blob)
    })
}

const { createObjectURL, revokeObjectURL } = URL

afterEach(() => {
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    vi.restoreAllMocks()
    vi.useRealTimers()
})

describe('Construcción del CSV', () => {
    it('pone el encabezado y una fila por registro separadas por CRLF', () => {
        const csv = construirCsv([
            { id: 1, nombre: 'Ana', cantidad: 5 },
            { id: 2, nombre: 'Beto', cantidad: 0 }
        ], columnas)

        expect(csv).toBe('ID,Nombre,Cantidad\r\n1,Ana,5\r\n2,Beto,0')
    })

    it('sin registros deja solo el encabezado', () => {
        expect(construirCsv([], columnas)).toBe('ID,Nombre,Cantidad')
    })

    it.each([
        ['Pérez, Ana', '"Pérez, Ana"'],
        ['Ana "la jefa"', '"Ana ""la jefa"""'],
        ['Línea 1\nLínea 2', '"Línea 1\nLínea 2"'],
        ['Uno;Dos', '"Uno;Dos"'],
        ['Niñez y educación', 'Niñez y educación']
    ])('escapa %j', (nombre, esperado) => {
        const csv = construirCsv([{ id: 1, nombre, cantidad: 1 }], columnas)

        expect(csv.split('\r\n')[1]).toBe(`1,${esperado},1`)
    })

    it('deja vacíos los valores nulos o ausentes', () => {
        expect(construirCsv([{ id: 1, nombre: null }], columnas)).toBe('ID,Nombre,Cantidad\r\n1,,')
    })

    it('aplica el formato de cada columna con el valor y la fila', () => {
        const formato = vi.fn((valor, fila) => `${valor}-${fila.id}`)

        const csv = construirCsv([{ id: 7, nombre: 'Ana' }], [{ clave: 'nombre', titulo: 'Nombre', formato }])

        expect(csv).toBe('Nombre\r\nAna-7')
        expect(formato).toHaveBeenCalledWith('Ana', { id: 7, nombre: 'Ana' })
    })
})

describe('Descarga del CSV', () => {
    it('descarga un archivo con BOM para que Excel respete las tildes', async () => {
        vi.useFakeTimers()
        let archivo
        URL.createObjectURL = vi.fn((blob) => { archivo = blob; return 'blob:reporte' })
        URL.revokeObjectURL = vi.fn()
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
            expect(this.download).toBe('reporte.csv')
            expect(this.getAttribute('href')).toBe('blob:reporte')
        })

        descargarCsv('reporte.csv', 'Campaña\r\nÚtiles')

        expect(click).toHaveBeenCalledTimes(1)
        expect(document.querySelector('a[download]')).toBeNull()
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
        vi.runAllTimers()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte')
        vi.useRealTimers()

        expect(archivo.type).toBe('text/csv;charset=utf-8;')
        const bytes = await leerBytes(archivo)
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
        expect(new TextDecoder().decode(bytes.slice(3))).toBe('Campaña\r\nÚtiles')
    })

    it('usa la fecha en formato AAAA-MM-DD para el nombre del archivo', () => {
        expect(sufijoFechaArchivo(new Date('2026-09-29T15:30:00Z'))).toBe('2026-09-29')
        expect(sufijoFechaArchivo(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05')
    })
})

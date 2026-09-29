import { describe, expect, it } from 'vitest'
import { formatearDireccion, hayUbicacion, tieneCoordenadas, urlGoogleMaps, urlWaze } from '../../utils/mapas'

const direccion = {
    direccion_detalle: '5 avenida 10-20',
    zona: '4',
    municipio: 'Mixco',
    departamento: 'Guatemala'
}

describe('Coordenadas para el marcador', () => {
    it.each([
        [{ latitud: 14.64, longitud: -90.56 }],
        [{ latitud: '14.64', longitud: '-90.56' }],
        [{ latitud: 0, longitud: 0 }],
        [{ latitud: 90, longitud: -180 }]
    ])('reconoce coordenadas válidas %o', (ubicacion) => {
        expect(tieneCoordenadas(ubicacion)).toBe(true)
    })

    it.each([
        [{}],
        [{ latitud: null, longitud: null }],
        [{ latitud: '', longitud: '' }],
        [{ latitud: 14.64 }],
        [{ latitud: 91, longitud: -90.56 }],
        [{ latitud: 14.64, longitud: -180.1 }],
        [{ latitud: 'abc', longitud: -90.56 }],
        [{ latitud: 'Infinity', longitud: -90.56 }]
    ])('descarta coordenadas incompletas o inválidas %o', (ubicacion) => {
        expect(tieneCoordenadas(ubicacion)).toBe(false)
    })
})

describe('Dirección en texto', () => {
    it('ordena de lo más específico a lo más general', () => {
        expect(formatearDireccion(direccion)).toBe('5 avenida 10-20, Zona 4, Mixco, Guatemala')
    })

    it('usa la dirección de la organización cuando no hay dirección detallada', () => {
        expect(formatearDireccion({ direccion: '18 avenida 11-95', municipio: 'Guatemala' })).toBe('18 avenida 11-95, Guatemala')
    })

    it('omite partes vacías y no repite valores', () => {
        expect(formatearDireccion({ zona: '  ', municipio: 'Guatemala', departamento: 'Guatemala' })).toBe('Guatemala')
        expect(formatearDireccion({})).toBe('')
    })
})

describe('Enlaces de Google Maps y Waze', () => {
    it('apuntan al punto exacto cuando hay coordenadas', () => {
        const ubicacion = { ...direccion, latitud: '14.6345679', longitud: '-90.5069123' }

        expect(urlGoogleMaps(ubicacion, 'Centro de acopio')).toBe('https://www.google.com/maps/search/?api=1&query=14.6345679,-90.5069123')
        expect(urlWaze(ubicacion, 'Centro de acopio')).toBe('https://www.waze.com/ul?ll=14.6345679%2C-90.5069123&navigate=yes')
    })

    it('buscan por nombre y dirección cuando no hay coordenadas', () => {
        const maps = new URL(urlGoogleMaps(direccion, 'Hogar La Esperanza'))
        const waze = new URL(urlWaze(direccion, 'Hogar La Esperanza'))

        expect(maps.searchParams.get('query')).toBe('Hogar La Esperanza, 5 avenida 10-20, Zona 4, Mixco, Guatemala')
        expect(waze.searchParams.get('q')).toBe('Hogar La Esperanza, 5 avenida 10-20, Zona 4, Mixco, Guatemala')
    })

    it('codifican tildes y caracteres especiales en la búsqueda', () => {
        const url = urlGoogleMaps({ direccion_detalle: 'Calzada Roosevelt #22-43', municipio: 'Mixco' }, 'Asociación Niñez')

        expect(url).not.toContain(' ')
        expect(url).not.toContain('#')
        expect(new URL(url).searchParams.get('query')).toBe('Asociación Niñez, Calzada Roosevelt #22-43, Mixco')
    })

    it('no generan enlace si no hay ubicación', () => {
        expect(urlGoogleMaps({})).toBeNull()
        expect(urlWaze({})).toBeNull()
        expect(hayUbicacion({})).toBe(false)
        expect(hayUbicacion({ latitud: 14.6, longitud: -90.5 })).toBe(true)
        expect(hayUbicacion({ municipio: 'Mixco' })).toBe(true)
    })
})

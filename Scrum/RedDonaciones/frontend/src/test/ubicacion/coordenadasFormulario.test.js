import { describe, expect, it } from 'vitest'
import { buildCampaignLocationPayload, buildCoordinatesPayload, campaignLocationForm, validateCampaignLocation, validateCoordinates } from '../../utils/ubicacion'

const propia = {
    ubicacion_modo: 'propia',
    departamento: 'Guatemala',
    municipio: 'Mixco',
    zona: '4',
    direccion_detalle: '5 avenida 10-20',
    latitud: '14.64',
    longitud: '-90.56'
}

describe('Validación de coordenadas en formularios', () => {
    it.each([
        ['', ''],
        ['0', '0'],
        ['90', '180'],
        ['-90', '-180'],
        [' 14.64 ', ' -90.56 ']
    ])('acepta latitud %s y longitud %s', (latitud, longitud) => {
        expect(validateCoordinates({ latitud, longitud })).toEqual({})
    })

    it.each([
        ['90.1', '0', 'latitud'],
        ['0', '-180.1', 'longitud'],
        ['Infinity', '0', 'latitud'],
        ['abc', '0', 'latitud'],
        ['0x10', '0', 'latitud'],
        ['1e1', '0', 'latitud'],
        ['14,64', '-90.56', 'latitud'],
        ['14.64', '', 'longitud'],
        ['', '-90.56', 'latitud']
    ])('rechaza latitud %s y longitud %s', (latitud, longitud, campo) => {
        expect(validateCoordinates({ latitud, longitud })).toHaveProperty(campo)
    })

    it('envía números o null al backend', () => {
        expect(buildCoordinatesPayload({ latitud: '14.64', longitud: '-90.56' })).toEqual({ latitud: 14.64, longitud: -90.56 })
        expect(buildCoordinatesPayload({ latitud: '0', longitud: '0' })).toEqual({ latitud: 0, longitud: 0 })
        expect(buildCoordinatesPayload({ latitud: ' ', longitud: '' })).toEqual({ latitud: null, longitud: null })
    })
})

describe('Ubicación propia o heredada de la campaña', () => {
    it('envía la ubicación propia completa', () => {
        expect(buildCampaignLocationPayload(propia)).toEqual({
            departamento: 'Guatemala',
            municipio: 'Mixco',
            zona: '4',
            direccion_detalle: '5 avenida 10-20',
            latitud: 14.64,
            longitud: -90.56
        })
    })

    it.each([
        ['zona', '123'],
        ['zona', 'A'],
        ['direccion_detalle', 'corta'],
        ['municipio', '  ']
    ])('rechaza %s con valor %s', (campo, valor) => {
        expect(validateCampaignLocation({ ...propia, [campo]: valor })).toHaveProperty(campo)
    })

    it.each(['departamento', 'municipio', 'direccion_detalle'])('bloquea %s cuando supera el límite del servidor', (campo) => {
        const limite = campo === 'direccion_detalle' ? 300 : 200
        expect(validateCampaignLocation({ ...propia, [campo]: 'a'.repeat(limite + 1) })).toHaveProperty(campo)
    })

    it('carga una campaña heredada en modo organización aunque el servidor ya resolvió la dirección', () => {
        const form = campaignLocationForm({ ...propia, ubicacion_heredada: 1 })

        expect(form).toEqual({ ubicacion_modo: 'organizacion', departamento: '', municipio: '', zona: '', direccion_detalle: '', latitud: '', longitud: '' })
    })

    it('carga una campaña con ubicación propia con sus coordenadas', () => {
        const form = campaignLocationForm({ ...propia, latitud: 14.64, longitud: -90.56, ubicacion_heredada: 0 })

        expect(form).toMatchObject({ ubicacion_modo: 'propia', municipio: 'Mixco', latitud: 14.64, longitud: -90.56 })
    })

    it('sin el indicador del servidor decide por el departamento', () => {
        expect(campaignLocationForm({ departamento: null }).ubicacion_modo).toBe('organizacion')
        expect(campaignLocationForm({ departamento: 'Guatemala' }).ubicacion_modo).toBe('propia')
    })
})

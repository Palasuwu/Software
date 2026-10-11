import React from 'react'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AddressFields from '../../components/AddressFields'
import CampaignLocationFields from '../../components/CampaignLocationFields'
import { buildCampaignLocationPayload, campaignLocationForm, validateCampaignLocation } from '../../utils/ubicacion'
import { formatearDireccion, urlGoogleMaps } from '../../utils/mapas'
import municipios from '../../utils/municipiosGuatemala.json'

afterEach(cleanup)
function Form({ initial = {}, campaign = false, disabled = false }) {
    const [form, setForm] = React.useState(initial)
    const onChange = ({ target: { name, value } }) => setForm(previous => ({ ...previous, [name]: value }))
    return campaign
        ? <CampaignLocationFields form={form} onChange={onChange} disabled={disabled} />
        : <AddressFields form={form} onChange={onChange} disabled={disabled} />
}

describe('Selección de ubicación', () => {
    it('incluye el catálogo completo sin lagos ni territorios externos', () => {
        expect(Object.keys(municipios)).toHaveLength(22)
        expect(Object.values(municipios).flat()).toHaveLength(340)
        expect(municipios.Guatemala).toContain('Villa Nueva')
        expect(municipios.Sololá).toContain('Panajachel')
        expect(Object.values(municipios).flat().some(nombre => nombre.startsWith('Lago'))).toBe(false)
    })
    it('guía el departamento antes del municipio y limpia los campos dependientes', () => {
        render(<Form />)
        expect(screen.getByLabelText('Municipio')).toBeDisabled()
        fireEvent.change(screen.getByLabelText('Departamento'), { target: { value: 'Guatemala' } })
        const municipio = screen.getByLabelText('Municipio')
        expect(municipio).toBeEnabled()
        expect(within(municipio).getByRole('option', { name: 'Mixco' })).toBeInTheDocument()
        expect(within(municipio).queryByRole('option', { name: 'Panajachel' })).toBeNull()
        fireEvent.change(municipio, { target: { value: 'Mixco' } })
        fireEvent.change(screen.getByLabelText('Zona (opcional)'), { target: { value: '4' } })
        fireEvent.change(municipio, { target: { value: 'Villa Nueva' } })
        expect(screen.getByLabelText('Zona (opcional)')).toHaveValue('')
        fireEvent.change(screen.getByLabelText('Departamento'), { target: { value: 'Sololá' } })
        expect(municipio).toHaveValue('')
        expect(within(municipio).queryByRole('option', { name: 'Mixco' })).toBeNull()
        expect(within(municipio).getByRole('option', { name: 'Panajachel' })).toBeInTheDocument()
    })
    it('conserva nombres antiguos y direcciones al editar sin cambios', () => {
        render(<Form initial={{ departamento: 'Guatemala', municipio: 'Ciudad de Guatemala', zona: '15', direccion: '18 avenida 11-95' }} />)
        expect(screen.getByLabelText('Municipio')).toHaveValue('Ciudad de Guatemala')
        expect(screen.getByLabelText('Zona (opcional)')).toHaveValue('15')
        expect(screen.getByLabelText('Dirección')).toHaveValue('18 avenida 11-95')
    })
    it('permite editar ubicaciones antiguas fuera del catálogo', () => {
        render(<Form initial={{ departamento: 'San Salvador', municipio: 'San Salvador' }} />)
        expect(screen.getByLabelText('Departamento')).toHaveValue('San Salvador')
        expect(screen.getByLabelText('Municipio')).toHaveValue('San Salvador')
        fireEvent.change(screen.getByLabelText('Municipio'), { target: { value: 'Otro municipio' } })
        expect(screen.getByLabelText('Municipio')).toHaveValue('Otro municipio')
    })
    it('respeta el estado deshabilitado durante el guardado', () => {
        render(<Form initial={{ departamento: 'Guatemala', municipio: 'Mixco' }} disabled />)
        for (const label of ['Departamento', 'Municipio', 'Zona (opcional)', 'Dirección']) {
            expect(screen.getByLabelText(label)).toBeDisabled()
        }
    })
    it('mantiene el modo heredado y permite pasar a ubicación propia', () => {
        render(<Form initial={{ ubicacion_modo: 'organizacion' }} campaign />)
        expect(screen.queryByLabelText('Departamento')).toBeNull()
        fireEvent.change(screen.getByLabelText('Ubicación de la campaña'), { target: { value: 'propia' } })
        expect(screen.getByLabelText('Departamento')).toBeInTheDocument()
        expect(screen.getByLabelText('Dirección detallada')).toBeInTheDocument()
    })
    it('guarda y recupera ubicación sin zona conservando mapas y coordenadas', () => {
        const form = { ubicacion_modo: 'propia', departamento: 'Sololá', municipio: 'Panajachel', zona: '', direccion_detalle: 'Centro de acopio principal', latitud: '14.74', longitud: '-91.15' }
        expect(validateCampaignLocation(form)).toEqual({})
        const payload = buildCampaignLocationPayload(form)
        expect(campaignLocationForm({ ...payload, ubicacion_heredada: 0 })).toMatchObject({ zona: '', municipio: 'Panajachel', latitud: 14.74 })
        expect(formatearDireccion(payload)).toBe('Centro de acopio principal, Panajachel, Sololá')
        expect(urlGoogleMaps(payload)).toContain('14.74,-91.15')
        expect(urlGoogleMaps({ ...payload, latitud: null, longitud: null })).toContain('Panajachel')
    })
})

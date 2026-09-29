// Verifica la edición y el guardado de coordenadas en los formularios de organización.
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrgaPerfilInstitucionalForm from '../pages/orga/OrgaPerfilInstitucionalForm'
import AdminPanel from '../pages/AdminPanel'
import { buildOrgPayload, validateOrgForm } from '../pages/admin/adminForms'
import { apiGet, apiPut } from '../utils/api'

vi.mock('../utils/api', () => ({
    apiGet: vi.fn(), apiPut: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn(), apiUpload: vi.fn()
}))

const organizacion = {
    id_organizacion: 1, nombre: 'Organización de prueba', descripcion: 'Apoyo a familias de Guatemala',
    direccion: '18 avenida 11-95', departamento: 'Guatemala', municipio: 'Guatemala', zona: '15',
    telefono: '22223333', correo: 'pruebas@example.com', estado_verificacion: 'verificada',
    latitud: 14.603, longitud: -90.489, url_logo: '', imagen_portada: ''
}

afterEach(cleanup)
beforeEach(() => {
    vi.resetAllMocks()
    apiGet.mockImplementation(async (url) => {
        if (url === '/api/intermediario/organizacion') return organizacion
        if (url === '/api/organizaciones/principal') return { organizacion }
        if (url === '/api/organizaciones?vista=admin') return [organizacion]
        return []
    })
    apiPut.mockResolvedValue({ message: 'ok' })
})

describe('Ubicación de organización', () => {
    it('permite contacto pendiente y sigue rechazando datos incorrectos', () => {
        const pendiente = { ...organizacion, direccion: '', zona: '', telefono: '', correo: '', latitud: '', longitud: '' }
        expect(validateOrgForm(pendiente)).toEqual({})
        expect(validateOrgForm({ ...pendiente, correo: 'incorrecto', telefono: 'abc', zona: 'xx', direccion: 'abc' })).toMatchObject({
            correo: expect.any(String), telefono: expect.any(String), zona: expect.any(String), direccion: expect.any(String)
        })
    })
    it('conserva el cero y convierte campos vacíos a null en el payload administrativo', () => {
        expect(buildOrgPayload({ ...organizacion, latitud: '0', longitud: '0' })).toMatchObject({ latitud: 0, longitud: 0 })
        expect(buildOrgPayload({ ...organizacion, latitud: '', longitud: '' })).toMatchObject({ latitud: null, longitud: null })
    })

    it.each([
        ['14.6', '', 'longitud'], ['', '-90.5', 'latitud'],
        ['91', '-90.5', 'latitud'], ['14.6', '-181', 'longitud'], ['abc', '-90.5', 'latitud']
    ])('rechaza el par inválido %s / %s', (latitud, longitud, field) => {
        expect(validateOrgForm({ ...organizacion, latitud, longitud })[field]).toBeTruthy()
    })

    it('carga y guarda coordenadas desde el perfil institucional', async () => {
        render(<OrgaPerfilInstitucionalForm />)
        const lat = await screen.findByLabelText('Latitud')
        expect(lat).toHaveValue(14.603)
        fireEvent.change(lat, { target: { value: '14.64' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
        await waitFor(() => expect(apiPut).toHaveBeenCalledWith('/api/intermediario/organizacion', expect.objectContaining({ latitud: 14.64, longitud: -90.489 })))
        expect(await screen.findByText('Perfil institucional actualizado')).toBeInTheDocument()
    })

    it('permite quitar ambas coordenadas y bloquea el guardado de una sola', async () => {
        render(<OrgaPerfilInstitucionalForm />)
        const lat = await screen.findByLabelText('Latitud')
        fireEvent.change(lat, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa la latitud')
        expect(apiPut).not.toHaveBeenCalled()
        fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
        await waitFor(() => expect(apiPut).toHaveBeenCalledWith('/api/intermediario/organizacion', expect.objectContaining({ latitud: null, longitud: null })))
    })

    it('guarda las coordenadas de la organización desde el panel de administrador', async () => {
        render(<AdminPanel />)
        fireEvent.click(await screen.findByRole('button', { name: 'Organización' }))
        await screen.findByText(organizacion.nombre)
        fireEvent.click(screen.getByRole('button', { name: /editar/i }))
        expect(await screen.findByLabelText('Latitud')).toHaveValue(14.603)
        fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '-90.51' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
        await waitFor(() => expect(apiPut).toHaveBeenCalledWith('/api/organizaciones/1', expect.objectContaining({ latitud: 14.603, longitud: -90.51 })))
    })
})

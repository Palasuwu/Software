// Verifica ubicación propia, herencia y persistencia en los dos paneles de campañas.
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrgaPanel from '../pages/OrgaPanel'
import AdminPanel from '../pages/AdminPanel'
import { apiGet, apiPost, apiPut } from '../utils/api'
import { buildCampaignLocationPayload, campaignLocationForm, validateCampaignLocation } from '../utils/ubicacion'

vi.mock('../utils/api', () => ({
    apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(), apiUpload: vi.fn()
}))

const propia = { ubicacion_modo: 'propia', departamento: 'Guatemala', municipio: 'Mixco', zona: '4', direccion_detalle: '5 avenida 10-20', latitud: '14.64', longitud: '-90.56' }
const org = { id_organizacion: 1, nombre: 'Organización de prueba', direccion: '18 avenida 11-95', departamento: 'Guatemala', municipio: 'Guatemala', zona: '15', latitud: 14.6, longitud: -90.5 }
let publicaciones

beforeEach(() => {
    vi.resetAllMocks()
    publicaciones = [{ ...propia, id_publicacion: 7, titulo: 'Campaña de prueba', descripcion: 'Recolección de alimentos', cantidad_necesaria: 10, cantidad_recibida: 0, id_articulo: 1, fecha_publicacion: '2026-09-28', fecha_limite: '2026-10-30', estado: 'activa', ubicacion_heredada: 0 }]
    apiGet.mockImplementation(async (url) => {
        if (url.includes('/publicaciones')) return publicaciones
        if (url === '/api/intermediario/organizacion') return org
        if (url === '/api/organizaciones/principal') return { organizacion: org }
        if (url === '/api/organizaciones?vista=admin') return [org]
        if (url === '/api/articulos') return [{ id_articulo: 1, nombre: 'Alimentos' }]
        if (url === '/api/usuarios') return [{ id_usuario: 2, nombre: 'Intermediario de prueba', rol: 'intermediario', activo: 1 }]
        return []
    })
    apiPost.mockResolvedValue({ message: 'ok' })
    apiPut.mockResolvedValue({ message: 'ok' })
})
afterEach(cleanup)

function llenarCampo(container, name, value) {
    fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { value } })
}

describe('Ubicación de campañas', () => {
    it('envía null al heredar aunque queden valores propios en el formulario', () => {
        expect(buildCampaignLocationPayload({ ...propia, ubicacion_modo: 'organizacion' })).toEqual({ departamento: null, municipio: null, zona: null, direccion_detalle: null, latitud: null, longitud: null })
        expect(validateCampaignLocation({ ...propia, ubicacion_modo: 'organizacion', latitud: '999' })).toEqual({})
    })

    it('carga la herencia sin convertir los valores resueltos por el servidor en una ubicación propia', () => {
        expect(campaignLocationForm({ ...propia, ubicacion_heredada: true })).toMatchObject({ ubicacion_modo: 'organizacion', latitud: '', departamento: '' })
        expect(campaignLocationForm({ ...propia, ubicacion_heredada: false, latitud: 0, longitud: 0 })).toMatchObject({ ubicacion_modo: 'propia', latitud: 0, longitud: 0 })
    })

    it('exige la dirección completa cuando se elige una ubicación propia', () => {
        expect(validateCampaignLocation({ ubicacion_modo: 'propia' })).toHaveProperty('direccion_detalle')
        expect(validateCampaignLocation({ ...propia, latitud: '91' })).toHaveProperty('latitud')
        expect(validateCampaignLocation(propia)).toEqual({})
    })

    it('edita coordenadas propias y después permite volver a heredar', async () => {
        render(<OrgaPanel />)
        fireEvent.click(await screen.findByTitle('Editar publicación'))
        expect(screen.getByLabelText('Ubicación de la campaña')).toHaveValue('propia')
        expect(screen.getByLabelText('Longitud')).toHaveValue(-90.56)
        fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '14.65' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
        await waitFor(() => expect(apiPut).toHaveBeenCalledWith('/api/intermediario/publicaciones/7', expect.objectContaining({ latitud: 14.65, longitud: -90.56 })))
        await waitFor(() => expect(screen.queryByLabelText('Ubicación de la campaña')).not.toBeInTheDocument())
        fireEvent.click(await screen.findByTitle('Editar publicación'))
        fireEvent.change(screen.getByLabelText('Ubicación de la campaña'), { target: { value: 'organizacion' } })
        expect(screen.queryByLabelText('Latitud')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
        await waitFor(() => expect(apiPut).toHaveBeenLastCalledWith('/api/intermediario/publicaciones/7', expect.objectContaining({ departamento: null, direccion_detalle: null, latitud: null, longitud: null })))
    })

    it('bloquea datos incompletos en el panel de intermediario y conserva los campos para corregirlos', async () => {
        render(<OrgaPanel />)
        fireEvent.click(await screen.findByTitle('Editar publicación'))
        fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa la longitud')
        expect(apiPut).not.toHaveBeenCalled()
        expect(screen.getByLabelText('Latitud')).toHaveValue(14.64)
    })

    it.each(['organizacion', 'propia'])('crea una campaña como administrador con ubicación %s', async (modo) => {
        const { container } = render(<AdminPanel />)
        await screen.findByText('Intermediario de prueba')
        fireEvent.click(screen.getByRole('button', { name: 'Campañas' }))
        fireEvent.click(screen.getByRole('button', { name: /Nueva Campaña/i }))
        await screen.findByRole('option', { name: 'Alimentos' })
        llenarCampo(container, 'titulo', 'Alimentos para familias')
        llenarCampo(container, 'descripcion', 'Recolección de alimentos para familias')
        llenarCampo(container, 'cantidad_necesaria', '10')
        llenarCampo(container, 'fecha_publicacion', '2026-09-28')
        llenarCampo(container, 'fecha_limite', '2026-10-30')
        llenarCampo(container, 'id_intermediario', '2')
        llenarCampo(container, 'id_articulo', '1')
        if (modo === 'propia') {
            fireEvent.change(screen.getByLabelText('Ubicación de la campaña'), { target: { value: modo } })
            Object.entries(propia).filter(([key]) => key !== 'ubicacion_modo').forEach(([name, value]) => llenarCampo(container, name, value))
        }
        fireEvent.click(screen.getByRole('button', { name: 'Crear campaña' }))
        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/api/publicaciones', expect.objectContaining(buildCampaignLocationPayload({ ...propia, ubicacion_modo: modo }))))
    })

    it('crea como intermediario con herencia por defecto', async () => {
        const { container } = render(<OrgaPanel />)
        await screen.findByText('Campaña de prueba')
        fireEvent.click(screen.getByRole('button', { name: 'Nueva Publicación' }))
        expect(screen.getByLabelText('Ubicación de la campaña')).toHaveValue('organizacion')
        llenarCampo(container, 'titulo', 'Nueva campaña')
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/api/intermediario/publicaciones', expect.objectContaining({ departamento: null, latitud: null, longitud: null })))
    })
})

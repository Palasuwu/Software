import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from '../../pages/AuthPage'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()) })
const abrir = () => render(<MemoryRouter><AuthPage defaultMode="register" /></MemoryRouter>)
function completar() {
    for (const [label, value] of [
        ['Nombre completo', 'Ana Perez'], ['Teléfono', '22223333'],
        ['Correo electrónico', 'ANA@example.com'], ['Contraseña', 'clave1234'],
        ['Confirmar contraseña', 'clave1234'], ['Departamento', 'Guatemala'],
        ['Municipio', 'Mixco'], ['Zona', '4'], ['Dirección', '5 avenida 10-20'],
    ]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
}

describe('Registro público con alta administrativa de intermediarios', () => {
    it('explica la verificación administrativa y no ofrece roles privilegiados', () => {
        abrir()
        expect(screen.getByRole('heading', { name: 'Crear cuenta de donante' })).toBeInTheDocument()
        expect(screen.getByText(/Contacta al administrador/)).toBeInTheDocument()
        expect(screen.queryByLabelText('Tipo de cuenta')).toBeNull()
        expect(screen.queryByLabelText('Cargo')).toBeNull()
        expect(screen.queryByLabelText('Organización')).toBeNull()
        expect(fetch).not.toHaveBeenCalled()
    })
    it('mantiene validaciones y no envía datos incompletos', () => {
        abrir()
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta', exact: true }))
        expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
        expect(fetch).not.toHaveBeenCalled()
    })
    it('envía exclusivamente un donante y conserva el inicio de sesión tras registrarse', async () => {
        fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Usuario creado' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'token-test', usuario: { id_usuario: 9, rol: 'donante' } }) })
        abrir(); completar()
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta', exact: true }))
        await waitFor(() => expect(localStorage.getItem('token')).toBe('token-test'))
        const [url, init] = fetch.mock.calls[0]
        expect(url).toBe('/api/usuarios')
        expect(JSON.parse(init.body)).toEqual({ nombre: 'Ana Perez', telefono: '22223333', correo: 'ana@example.com', password: 'clave1234', rol: 'donante', departamento: 'Guatemala', municipio: 'Mixco', zona: '4', direccion_detalle: '5 avenida 10-20' })
        expect(fetch.mock.calls[1][0]).toBe('/api/login')
        expect(screen.getByText('¡¡¡Cuenta creada! Redirigiendo...')).toBeInTheDocument()
    })
    it('muestra rechazo del registro y no inicia sesión ni crea estados pendientes ficticios', async () => {
        fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'El correo ya está registrado' }) })
        abrir(); completar()
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta', exact: true }))
        expect(await screen.findByText('El correo ya está registrado')).toBeInTheDocument()
        expect(fetch).toHaveBeenCalledTimes(1)
        expect(localStorage.getItem('token')).toBeNull()
    })
})

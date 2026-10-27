import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OlvidePasswordPage, RestablecerPasswordPage } from '../../pages/PasswordResetPage'

function ResultadoLogin() {
    const location = useLocation()
    return <p>{location.state?.flash || 'Inicio de sesión'}</p>
}

function abrir(ruta = '/olvide-password') {
    return render(
        <MemoryRouter initialEntries={[ruta]}>
            <Routes>
                <Route path="/olvide-password" element={<OlvidePasswordPage />} />
                <Route path="/restablecer" element={<RestablecerPasswordPage />} />
                <Route path="/login" element={<ResultadoLogin />} />
            </Routes>
        </MemoryRouter>
    )
}

function responder(body, ok = true) {
    return { ok, json: async () => body }
}

function completar(password = 'ClaveNueva123', confirmacion = password) {
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: password } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmacion } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Solicitud de recuperación', () => {
    it.each([['', 'El correo es obligatorio'], ['sin-arroba', 'Ingresa un correo válido']])(
        'valida el correo %s antes de llamar al servidor', (correo, error) => {
            abrir()
            fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: correo } })
            fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
            expect(screen.getByText(error)).toBeInTheDocument()
            expect(fetch).not.toHaveBeenCalled()
        }
    )

    it('normaliza el correo, muestra la respuesta genérica y el vencimiento', async () => {
        fetch.mockResolvedValue(responder({ message: 'Si el correo está registrado, recibirás un enlace.' }))
        abrir()
        fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: ' ANA@EXAMPLE.TEST ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
        expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument()
        expect(screen.getByText(/El enlace vence en 30 minutos/)).toBeInTheDocument()
        expect(screen.getByText(/Si el correo está registrado/)).toBeInTheDocument()
        const [url, init] = fetch.mock.calls[0]
        expect(url).toBe('/api/password/olvide')
        expect(init.method).toBe('POST')
        expect(JSON.parse(init.body)).toEqual({ correo: 'ana@example.test' })
        fireEvent.click(screen.getByRole('link', { name: 'Volver al inicio de sesión' }))
        expect(await screen.findByText('Inicio de sesión')).toBeInTheDocument()
    })

    it('bloquea el botón mientras envía y permite reintentar después de un fallo', async () => {
        let terminar
        fetch.mockImplementationOnce(() => new Promise(resolve => { terminar = resolve }))
            .mockResolvedValueOnce(responder({ message: 'Solicitud recibida' }))
        abrir()
        fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.test' } })
        fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
        expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
        await act(async () => terminar(responder({ error: 'El envío de correo no está disponible' }, false)))
        expect(await screen.findByText('El envío de correo no está disponible')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
        expect(await screen.findByText('Solicitud recibida')).toBeInTheDocument()
        expect(fetch).toHaveBeenCalledTimes(2)
    })
})

describe('Restablecimiento de contraseña', () => {
    it('un enlace sin token permite solicitar uno nuevo y no muestra el formulario', () => {
        abrir('/restablecer')
        expect(screen.getByRole('heading', { name: 'Enlace incompleto' })).toBeInTheDocument()
        expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
        expect(fetch).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('link', { name: 'Solicitar uno nuevo' }))
        expect(screen.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
    })

    it.each([
        ['', '', 'La contraseña es obligatoria'],
        ['corta', 'corta', 'Mínimo 8 caracteres'],
        ['sololetross', 'sololetross', 'Incluye letras y números'],
        ['ClaveNueva123', '', 'Confirma tu contraseña'],
        ['ClaveNueva123', 'OtraClave123', 'Las contraseñas no coinciden']
    ])('valida antes de enviar (%s)', (password, confirmacion, mensaje) => {
        abrir('/restablecer?token=token-de-prueba')
        completar(password, confirmacion)
        expect(screen.getByText(mensaje)).toBeInTheDocument()
        expect(fetch).not.toHaveBeenCalled()
    })

    it('envía token y contraseña, bloquea el guardado y vuelve al login con confirmación', async () => {
        let terminar
        fetch.mockImplementation(() => new Promise(resolve => { terminar = resolve }))
        abrir('/restablecer?token=token-de-prueba')
        completar()
        expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
        const [url, init] = fetch.mock.calls[0]
        expect(url).toBe('/api/password/restablecer')
        expect(JSON.parse(init.body)).toEqual({ token: 'token-de-prueba', password: 'ClaveNueva123' })
        await act(async () => terminar(responder({ message: 'Contraseña actualizada. Ya puedes iniciar sesión' })))
        expect(await screen.findByText('Contraseña actualizada. Ya puedes iniciar sesión')).toBeInTheDocument()
        expect(localStorage.length).toBe(0)
    })

    it.each(['El enlace venció. Solicita uno nuevo', 'Este enlace ya se usó. Solicita uno nuevo'])(
        'muestra el rechazo del enlace y permite solicitar otro: %s', async error => {
            fetch.mockResolvedValue(responder({ error }, false))
            abrir('/restablecer?token=token-de-prueba')
            completar()
            expect(await screen.findByText(error)).toBeInTheDocument()
            fireEvent.click(screen.getByRole('link', { name: /Solicita uno nuevo/ }))
            expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
        }
    )

    it('maneja una respuesta no JSON sin perder la posibilidad de reintentar', async () => {
        fetch.mockResolvedValue({ ok: false, json: async () => { throw new Error('No es JSON') } })
        abrir('/restablecer?token=token-de-prueba')
        completar()
        expect(await screen.findByText('No se pudo restablecer la contraseña')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled()
    })
})

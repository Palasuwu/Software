// Boton "Continuar con Google" de la pantalla de ingreso.
//
// Verifica la identidad con Firebase y entrega el ID token al backend, que
// responde con el JWT propio de la app. Si el correo todavia no existe en la
// base, el backend pide completar el alta y este componente avisa al padre
// para que muestre el registro prellenado: la tabla donante exige telefono y
// direccion, que Google no entrega.
import React from 'react'
import { guardarTokenSesion, guardarUsuarioSesion } from '../utils/session'
import { googleDisponible, iniciarConGoogle } from '../utils/firebaseAuth'
import './BotonGoogle.css'

function LogoGoogle() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
            <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.750H4.3v5.7C7.9 40.6 15.4 46 24 46z" />
            <path fill="#FBBC05" d="M11.6 27.45c-.45-1.3-.7-2.7-.7-4.15s.25-2.85.7-4.15V13.45H4.3A22 22 0 0 0 2 23.3c0 3.55.85 6.9 2.3 9.85l7.3-5.7z" />
            <path fill="#EA4335" d="M24 10.2c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 3.6 30 1.6 24 1.6 15.4 1.6 7.9 7 4.3 13.45l7.3 5.7C13.3 14.1 18.2 10.2 24 10.2z" />
        </svg>
    )
}

export default function BotonGoogle({ onAuthSuccess, onRequiereRegistro, texto = 'Continuar con Google' }) {
    const [cargando, setCargando] = React.useState(false)
    const [error, setError] = React.useState('')

    // Sin configuracion de Firebase el boton no se dibuja: es preferible a
    // ofrecer un camino que siempre fallaria.
    if (!googleDisponible()) return null

    const entrar = async () => {
        setError('')
        setCargando(true)

        try {
            const idToken = await iniciarConGoogle()
            if (!idToken) return // la persona cerro el popup

            const respuesta = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken })
            })
            const cuerpo = await respuesta.json().catch(() => null)

            if (!respuesta.ok) {
                throw new Error(cuerpo?.error || 'No se pudo iniciar sesión con Google')
            }

            if (cuerpo?.requiere_registro) {
                onRequiereRegistro?.({
                    idToken,
                    correo: cuerpo.correo,
                    nombre: cuerpo.nombre
                })
                return
            }

            if (!cuerpo?.token || !cuerpo?.usuario) {
                throw new Error('No se recibió la sesión del servidor')
            }

            guardarTokenSesion(cuerpo.token)
            guardarUsuarioSesion(cuerpo.usuario)
            onAuthSuccess?.(cuerpo.usuario)
        } catch (e) {
            setError(e.message || 'No se pudo iniciar sesión con Google')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="bg-google-bloque">
            <div className="bg-google-separador"><span>o</span></div>

            <button type="button" className="bg-google" onClick={entrar} disabled={cargando}>
                <LogoGoogle />
                <span>{cargando ? 'Conectando…' : texto}</span>
            </button>

            {error && <p className="auth-error-text bg-google-error" role="alert">{error}</p>}
        </div>
    )
}

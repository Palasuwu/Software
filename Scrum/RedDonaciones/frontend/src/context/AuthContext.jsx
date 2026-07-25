// Estado de sesion global: quien esta logueado, aviso de auth y login/logout.
// Reemplaza el patron anterior de releer localStorage en cada cambio de ruta
// desde AppShell. Debe montarse dentro de <Router> porque escucha
// auth:unauthorized y necesita useNavigate() para redirigir.
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    obtenerTokenSesion,
    obtenerUsuarioSesion,
    limpiarUsuarioSesion,
    limpiarTokenSesion
} from '../utils/session'

const AuthContext = React.createContext(null)

export function AuthProvider({ children }) {
    const location = useLocation()
    const navigate = useNavigate()
    const [usuarioSesion, setUsuarioSesion] = React.useState(() => obtenerUsuarioSesion())
    const [authNotice, setAuthNotice] = React.useState('')

    React.useEffect(() => {
        setUsuarioSesion(obtenerUsuarioSesion())
    }, [location.pathname])

    React.useEffect(() => {
        setAuthNotice(location.state?.flash || '')
    }, [location.state])

    React.useEffect(() => {
        const handleUnauthorized = () => {
            setUsuarioSesion(null)
            setAuthNotice('Tu sesión expiró. Inicia sesión nuevamente.')
            navigate('/login', { replace: true, state: { from: location.pathname } })
        }

        const handleForbidden = () => {
            setAuthNotice('No tienes permisos para realizar esta accion.')
        }

        window.addEventListener('auth:unauthorized', handleUnauthorized)
        window.addEventListener('auth:forbidden', handleForbidden)

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized)
            window.removeEventListener('auth:forbidden', handleForbidden)
        }
    }, [location.pathname, navigate])

    const login = (usuario) => {
        setUsuarioSesion(usuario)
    }

    const logout = () => {
        limpiarUsuarioSesion()
        limpiarTokenSesion()
        setUsuarioSesion(null)
        navigate('/login', { replace: true })
    }

    const isAuthenticated = Boolean(usuarioSesion?.id_usuario && obtenerTokenSesion())

    const value = {
        usuarioSesion,
        isAuthenticated,
        authNotice,
        login,
        logout
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = React.useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>')
    }
    return context
}

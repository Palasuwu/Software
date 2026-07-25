// Guarda de ruta: exige sesion (y opcionalmente un rol) antes de renderizar children.
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { obtenerTokenSesion } from '../utils/session'

export default function ProtectedRoute({ usuarioSesion, requiredRole, children }) {
    const location = useLocation()

    if (!usuarioSesion || !obtenerTokenSesion()) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (requiredRole && !allowedRoles.includes(usuarioSesion.rol)) {
        return <Navigate to="/home" replace state={{ flash: 'No tienes permisos para acceder a esa seccion' }} />
    }

    return children
}

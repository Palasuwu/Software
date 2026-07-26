// Navegacion inferior, visible solo en mobile (ver .bottom-nav en App.css).
import React from 'react'
import { NavLink } from 'react-router-dom'
import { IconHome, IconUsers, IconDonation, IconUser, IconAdmin, IconRegister } from './icons'

export default function BottomNav({ isAuthenticated, usuarioSesion, onLogout }) {
    const isAdmin = usuarioSesion?.rol === 'administrador'
    const isIntermediario = usuarioSesion?.rol === 'intermediario'

    return (
        <nav className="bottom-nav">
            <NavLink to="/home" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <IconHome className="nav-icon" />
                <span>Inicio</span>
            </NavLink>

            <NavLink to="/organizaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <IconUsers className="meta-icon" />
                <span>Organizaciones</span>
            </NavLink>

            {isAuthenticated ? (
                <>
                    <NavLink to="/donaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <IconDonation className="nav-icon" />
                        <span>Historial</span>
                    </NavLink>
                    <NavLink to="/perfil" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <IconUser className="nav-icon" />
                        <span>Perfil</span>
                    </NavLink>
                    {isAdmin && (
                        <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <IconAdmin className="nav-icon" />
                            <span>Admin</span>
                        </NavLink>
                    )}

                    {isIntermediario && (
                        <NavLink to="/intermediario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <IconUsers className="meta-icon" />
                            <span>Mi Org</span>
                        </NavLink>
                    )}
                    <button type="button" className="nav-item nav-item-button" onClick={onLogout}>
                        <IconRegister className="nav-icon" />
                        <span>Salir</span>
                    </button>
                </>
            ) : (
                <>
                    <NavLink to="/login" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <IconUser className="nav-icon" />
                        <span>Login</span>
                    </NavLink>
                </>
            )}
        </nav>
    )
}

// Chrome visual de la app autenticada: header + NavBar, banner de
// aviso, contenido de <AppRoutes/> y BottomNav movil. El estado de sesion
// vive en AuthContext; este componente solo lo consume y lo reparte hacia
// NavBar/BottomNav/AppRoutes via props (mismas firmas que antes).
import React from 'react'
import { Link } from 'react-router-dom'
import NavBar from './components/NavBar'
import BottomNav from './components/BottomNav'
import AppRoutes from './AppRoutes'
import logoMark from './assets/LogoOwnerMark.svg'
import { useAuth } from './context/AuthContext'

export default function AppShell() {
    const { usuarioSesion, isAuthenticated, authNotice, login, logout } = useAuth()

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="header-inner">
                    <Link to="/" className="brand-block" aria-label="Liga Juvenil Donaciones — ir al inicio">
                        <div className="brand-mark">
                            <img src={logoMark} alt="" aria-hidden="true" />
                        </div>
                        <h1 className="header-title">
                            Liga Juvenil
                            <span className="header-title-sub">Donaciones</span>
                        </h1>
                    </Link>

                    <NavBar
                        isAuthenticated={isAuthenticated}
                        usuarioSesion={usuarioSesion}
                        onLogout={logout}
                    />
                </div>
            </header>

            <main className="main-content">
                {authNotice && (
                    <div className="error-box" role="alert">
                        {authNotice}
                    </div>
                )}

                <AppRoutes
                    usuarioSesion={usuarioSesion}
                    isAuthenticated={isAuthenticated}
                    onAuthSuccess={login}
                />
            </main>

            <BottomNav isAuthenticated={isAuthenticated} usuarioSesion={usuarioSesion} onLogout={logout} />
        </div>
    )
}

// Chrome visual de la app autenticada: header animado + NavBar, banner de
// aviso, contenido de <AppRoutes/> y BottomNav movil. El estado de sesion
// vive en AuthContext; este componente solo lo consume y lo reparte hacia
// NavBar/BottomNav/AppRoutes via props (mismas firmas que antes).
import React from 'react'
import { motion } from 'framer-motion'
import NavBar from './components/NavBar'
import BottomNav from './components/BottomNav'
import AppRoutes from './AppRoutes'
import { IconBrand } from './components/icons'
import { useAuth } from './context/AuthContext'

export default function AppShell() {
    const [navExpanded, setNavExpanded] = React.useState(false)
    const { usuarioSesion, isAuthenticated, authNotice, login, logout } = useAuth()

    return (
        <div className="app-shell">
            <header
                className="app-header"
                onMouseEnter={() => setNavExpanded(true)}
                onMouseLeave={() => setNavExpanded(false)}
            >
                <motion.div
                    className="header-inner"
                    initial={{ paddingTop: 6, paddingBottom: 6 }}
                    animate={navExpanded
                        ? { paddingTop: 15, paddingBottom: 15 }
                        : { paddingTop: 6, paddingBottom: 6 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
                >
                    <div className="brand-block">
                        <div className="brand-mark">
                            <IconBrand className="brand-icon" />
                        </div>
                        <motion.h1
                            className="header-title"
                            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                            animate={navExpanded
                                ? { opacity: 1, width: 'auto', marginLeft: 14 }
                                : { opacity: 0, width: 0, marginLeft: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
                            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                        >
                            Red de Donaciones
                        </motion.h1>
                    </div>

                    <NavBar
                        isAuthenticated={isAuthenticated}
                        usuarioSesion={usuarioSesion}
                        onLogout={logout}
                        isExpanded={navExpanded}
                    />
                </motion.div>
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

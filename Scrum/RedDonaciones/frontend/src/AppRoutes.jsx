// Arbol de rutas de la aplicacion autenticada (todo lo que no es /, que sirve LandingPage).
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import AuthPage from './pages/AuthPage'
import PerfilPage from './pages/PerfilPage'
import MisDonacionesPage from './pages/MisDonacionesPage'
import DonationHistoryDetailPage from './pages/DonationHistoryDetailPage'
import OrganizacionesPage from './pages/OrganizacionesPage'
import OrgaDetailPage from './pages/OrgaDetailPage'
import AdminPanel from './pages/AdminPanel'
import OrgaPanel from './pages/OrgaPanel'
import ProtectedRoute from './components/ProtectedRoute'

export default function AppRoutes({ usuarioSesion, isAuthenticated, onAuthSuccess }) {
    return (
        <Routes>
            <Route path="/home" element={<HomePage isAuthenticated={isAuthenticated} />} />
            <Route path="/detalle/:id" element={<DetailPage />} />
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/perfil" replace /> : <AuthPage onAuthSuccess={onAuthSuccess} defaultMode="login" />}
            />
            <Route
                path="/signup"
                element={isAuthenticated ? <Navigate to="/perfil" replace /> : <AuthPage onAuthSuccess={onAuthSuccess} defaultMode="register" />}
            />

            <Route
                path="/perfil"
                element={(
                    <ProtectedRoute usuarioSesion={usuarioSesion}>
                        <PerfilPage usuarioSesion={usuarioSesion} onProfileUpdated={onAuthSuccess} />
                    </ProtectedRoute>
                )}
            />

            <Route
                path="/donaciones"
                element={(
                    <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole={['donante', 'administrador']}>
                        <MisDonacionesPage />
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/donaciones/:idDonacion"
                element={(
                    <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole={['donante', 'administrador']}>
                        <DonationHistoryDetailPage />
                    </ProtectedRoute>
                )}
            />

            <Route
                path="/organizaciones"
                element={(<OrganizacionesPage />)}
            />

            <Route
                path="/organizaciones/:id"
                element={(<OrgaDetailPage />
                )}
            />

            <Route
                path="/admin"
                element={(
                    <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="administrador">
                        <AdminPanel usuarioSesion={usuarioSesion} />
                    </ProtectedRoute>
                )}
            />

            <Route
                path="/intermediario"
                element={(
                    <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole="intermediario" >
                        <OrgaPanel usuarioSesion={usuarioSesion} />
                    </ProtectedRoute>
                )}
            />

            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    )
}

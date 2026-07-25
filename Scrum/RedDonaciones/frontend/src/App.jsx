import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AppShell from './AppShell'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/*"
          element={(
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          )}
        />
      </Routes>
    </Router>
  )
}

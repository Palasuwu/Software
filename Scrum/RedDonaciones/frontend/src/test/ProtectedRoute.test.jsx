import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import ProtectedRoute from '../components/ProtectedRoute'

// Muestra a dónde llegó la redirección y el state que se pasó
function Destino({ nombre }) {
  const location = useLocation()
  return <p>{nombre}: {JSON.stringify(location.state)}</p>
}

function renderRuta(usuarioSesion, requiredRole) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute usuarioSesion={usuarioSesion} requiredRole={requiredRole}>
              <p>Contenido privado</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Destino nombre="login" />} />
        <Route path="/home" element={<Destino nombre="home" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  afterEach(() => localStorage.clear())

  it('sin sesión manda al login y recuerda la ruta pedida', () => {
    renderRuta(null, 'administrador')
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument()
    expect(screen.getByText('login: {"from":"/admin"}')).toBeInTheDocument()
  })

  it('con usuario guardado pero sin token también manda al login', () => {
    renderRuta({ id_usuario: 1, rol: 'administrador' }, 'administrador')
    expect(screen.getByText(/^login:/)).toBeInTheDocument()
  })

  it('con un rol que no corresponde manda a inicio con aviso', () => {
    localStorage.setItem('token', 'abc')
    renderRuta({ id_usuario: 2, rol: 'donante' }, 'administrador')
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument()
    expect(screen.getByText(/^home:.*No tienes permisos/)).toBeInTheDocument()
  })

  it('muestra el contenido si el rol coincide', () => {
    localStorage.setItem('token', 'abc')
    renderRuta({ id_usuario: 1, rol: 'administrador' }, 'administrador')
    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })

  it('acepta una lista de roles', () => {
    localStorage.setItem('token', 'abc')
    renderRuta({ id_usuario: 3, rol: 'intermediario' }, ['administrador', 'intermediario'])
    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })

  it('sin rol requerido basta con tener sesión', () => {
    localStorage.setItem('token', 'abc')
    renderRuta({ id_usuario: 2, rol: 'donante' })
    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })
})

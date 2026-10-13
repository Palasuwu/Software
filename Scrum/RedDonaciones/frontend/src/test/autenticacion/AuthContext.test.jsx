import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../../context/AuthContext'

function Estado() {
  const { usuarioSesion, isAuthenticated, authNotice, logout } = useAuth()
  const location = useLocation()
  return (
    <div>
      <p>ruta: {location.pathname}</p>
      <p>usuario: {usuarioSesion?.nombre || 'ninguno'}</p>
      <p>autenticado: {String(isAuthenticated)}</p>
      <p>aviso: {authNotice}</p>
      <button type="button" onClick={logout}>Salir</button>
    </div>
  )
}

function renderAuth(ruta = '/perfil') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<Estado />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

function iniciarSesion() {
  localStorage.setItem('usuario_actual', JSON.stringify({ id_usuario: 4, nombre: 'Ana', rol: 'donante' }))
  localStorage.setItem('token', 'abc')
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('carga la sesión guardada', () => {
    iniciarSesion()
    renderAuth()
    expect(screen.getByText('usuario: Ana')).toBeInTheDocument()
    expect(screen.getByText('autenticado: true')).toBeInTheDocument()
  })

  it('sin token no se considera autenticado aunque haya usuario guardado', () => {
    iniciarSesion()
    localStorage.removeItem('token')
    renderAuth()
    expect(screen.getByText('autenticado: false')).toBeInTheDocument()
  })

  it('si la sesión expira manda al login con un aviso', () => {
    iniciarSesion()
    renderAuth()
    // api.js borra la sesión antes de avisar con el evento
    localStorage.clear()
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    })
    expect(screen.getByText('ruta: /login')).toBeInTheDocument()
    expect(screen.getByText('usuario: ninguno')).toBeInTheDocument()
    expect(screen.getByText(/Tu sesión expiró/)).toBeInTheDocument()
  })

  it('si falta permiso avisa sin cerrar la sesión', () => {
    iniciarSesion()
    renderAuth()
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:forbidden'))
    })
    expect(screen.getByText(/No tienes permisos para realizar esta accion/)).toBeInTheDocument()
    expect(screen.getByText('ruta: /perfil')).toBeInTheDocument()
    expect(screen.getByText('usuario: Ana')).toBeInTheDocument()
  })

  it('cerrar sesión borra los datos guardados y manda al login', () => {
    iniciarSesion()
    renderAuth()
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('usuario_actual')).toBeNull()
    expect(screen.getByText('ruta: /login')).toBeInTheDocument()
    expect(screen.getByText('autenticado: false')).toBeInTheDocument()
  })

  it('deja de escuchar los eventos al desmontarse', () => {
    iniciarSesion()
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderAuth()
    unmount()
    const eventos = quitar.mock.calls.map(([nombre]) => nombre)
    expect(eventos).toEqual(expect.arrayContaining(['auth:unauthorized', 'auth:forbidden']))
    quitar.mockRestore()
  })

  it('useAuth fuera del proveedor da un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<MemoryRouter><Estado /></MemoryRouter>)).toThrow('useAuth debe usarse dentro de <AuthProvider>')
    consola.mockRestore()
  })
})

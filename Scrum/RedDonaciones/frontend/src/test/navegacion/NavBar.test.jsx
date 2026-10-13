import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import NavBar from '../../components/NavBar'

vi.mock('../../components/NotificationCenter', () => ({ default: () => <span>Notificaciones</span> }))

function renderNav(props, ruta = '/home') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <NavBar onLogout={() => {}} {...props} />
    </MemoryRouter>
  )
  return within(screen.getByRole('navigation', { name: 'Navegación principal' }))
}

const nombres = (nav) => nav.getAllByRole('link').map((link) => link.getAttribute('aria-label'))

describe('NavBar', () => {
  it('sin sesión solo muestra opciones públicas', () => {
    const nav = renderNav({ isAuthenticated: false, usuarioSesion: null })
    expect(nombres(nav)).toEqual(['Inicio', 'Sobre Nosotros', 'Iniciar sesión'])
    expect(nav.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    expect(nav.queryByText('Notificaciones')).not.toBeInTheDocument()
  })

  it('el donante no ve paneles de administración', () => {
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'donante' } })
    expect(nombres(nav)).toEqual(['Inicio', 'Mis Donaciones', 'Perfil', 'Sobre Nosotros'])
    expect(nav.getByText('Notificaciones')).toBeInTheDocument()
  })

  it('el administrador ve el panel admin y no el de organización', () => {
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'administrador' } })
    expect(nav.getByRole('link', { name: 'Panel Admin' })).toHaveAttribute('href', '/admin')
    expect(nav.queryByRole('link', { name: 'Mi Organización' })).not.toBeInTheDocument()
  })

  it('el intermediario ve su organización y no el panel admin', () => {
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'intermediario' } })
    expect(nav.getByRole('link', { name: 'Mi Organización' })).toHaveAttribute('href', '/intermediario')
    expect(nav.queryByRole('link', { name: 'Panel Admin' })).not.toBeInTheDocument()
  })

  it('cada opción tiene nombre visible y accesible sin pasar el mouse', () => {
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'administrador' } })
    for (const link of nav.getAllByRole('link')) {
      const nombre = link.getAttribute('aria-label')
      expect(link).toHaveAttribute('title', nombre)
      expect(within(link).getByText(nombre)).toBeInTheDocument()
    }
  })

  it('marca como activa la sección actual', () => {
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'donante' } }, '/perfil')
    expect(nav.getByRole('link', { name: 'Perfil' })).toHaveClass('nb-item--active')
    expect(nav.getByRole('link', { name: 'Inicio' })).not.toHaveClass('nb-item--active')
  })

  it('el botón de cerrar sesión llama a onLogout', () => {
    const onLogout = vi.fn()
    const nav = renderNav({ isAuthenticated: true, usuarioSesion: { rol: 'donante' }, onLogout })
    fireEvent.click(nav.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})

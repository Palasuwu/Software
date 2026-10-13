import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, beforeEach, test, expect } from 'vitest'
import PerfilPage from '../pages/PerfilPage'
import { apiGet, apiPut } from '../utils/api'
vi.mock('../utils/api', () => ({ apiGet: vi.fn(), apiPut: vi.fn() }))
vi.mock('../pages/PerfilFoto', () => ({ default: () => <div>Foto</div> }))
vi.mock('../utils/session', () => ({ guardarUsuarioSesion: vi.fn() }))
const usuario = { id_usuario: 9, nombre: 'Ana Perez', correo: 'ana@example.com', telefono: '12345678', rol: 'donante', perfil: { departamento: 'Guatemala', municipio: 'Mixco', zona: '4', direccion_detalle: 'Calle principal' } }
beforeEach(() => { vi.clearAllMocks(); apiGet.mockImplementation(path => Promise.resolve(path.includes('donaciones') ? [] : usuario)) })
async function editar() {
  render(<MemoryRouter><PerfilPage usuarioSesion={usuario} /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }))
}
test('muestra la dirección completa y el enlace al historial', async () => {
  render(<MemoryRouter><PerfilPage usuarioSesion={usuario} /></MemoryRouter>)
  expect(await screen.findByText('Zona 4 · Calle principal')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver mis donaciones' })).toHaveAttribute('href', '/donaciones')
})
test('enfoca el primer campo inválido y asocia su mensaje', async () => {
  await editar()
  const nombre = screen.getByLabelText('Nombre completo')
  fireEvent.change(nombre, { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(nombre).toHaveFocus()
  expect(nombre).toHaveAttribute('aria-invalid', 'true')
  expect(document.getElementById(nombre.getAttribute('aria-describedby'))).toHaveTextContent('El nombre es obligatorio')
  expect(apiPut).not.toHaveBeenCalled()
})
test('bloquea la edición al guardar y conserva los cambios tras un error', async () => {
  let rechazar
  apiPut.mockImplementation(() => new Promise((resolve, reject) => { rechazar = reject }))
  await editar()
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Maria' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(screen.getByLabelText('Nombre completo')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  rechazar(new Error('No se pudo guardar'))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
  await waitFor(() => expect(screen.getByLabelText('Nombre completo')).toBeEnabled())
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Maria')
})

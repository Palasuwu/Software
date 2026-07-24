import { describe, it, expect, beforeEach } from 'vitest'
import { guardarTokenSesion, obtenerTokenSesion, limpiarTokenSesion } from '../utils/session'

describe('session utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('guarda y recupera un token', () => {
    guardarTokenSesion('abc123')
    expect(obtenerTokenSesion()).toBe('abc123')
  })

  it('limpia el token', () => {
    guardarTokenSesion('abc123')
    limpiarTokenSesion()
    expect(obtenerTokenSesion()).toBeNull()
  })
})

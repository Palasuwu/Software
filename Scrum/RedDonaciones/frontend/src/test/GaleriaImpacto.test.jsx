import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GaleriaImpacto from '../components/GaleriaImpacto'
import { apiGet } from '../utils/api'

const vista = vi.hoisted(() => ({ enVista: true, reducir: false }))

vi.mock('../utils/api', () => ({ apiGet: vi.fn() }))
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal()),
  useInView: () => vista.enVista,
  useReducedMotion: () => vista.reducir
}))

const DESDE_API = [
  { id_imagen: 1, url_imagen: '/api/uploads/a.jpg', alt_text: 'Entrega en Mixco', orden: 1 },
  { id_imagen: 2, url_imagen: '/api/uploads/b.jpg', alt_text: 'Jornada en Villa Nueva', orden: 2 }
]

const contador = () => document.querySelector('.gi-conteo').textContent.replace(/\s/g, '')

describe('GaleriaImpacto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vista.enVista = true
    vista.reducir = false
  })

  afterEach(() => vi.useRealTimers())

  it('usa las imágenes configuradas por el administrador', async () => {
    apiGet.mockResolvedValue(DESDE_API)
    render(<GaleriaImpacto />)
    expect(await screen.findByAltText('Entrega en Mixco')).toHaveAttribute('src', '/api/uploads/a.jpg')
    expect(apiGet).toHaveBeenCalledWith('/api/carrusel')
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(contador()).toBe('01/02')
  })

  it.each([
    ['la API falla', () => apiGet.mockRejectedValue(new Error('sin conexión'))],
    ['no hay imágenes cargadas', () => apiGet.mockResolvedValue([])]
  ])('si %s se quedan las fotos de respaldo', async (_, preparar) => {
    preparar()
    render(<GaleriaImpacto />)
    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', '/carousel/carr1.jpeg')
    expect(contador()).toBe('01/04')
  })

  it('todas las fotos tienen texto alternativo', async () => {
    apiGet.mockResolvedValue([])
    render(<GaleriaImpacto />)
    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    for (const img of screen.getAllByRole('img')) {
      expect(img.getAttribute('alt')).toBeTruthy()
    }
  })

  it('los puntos cambian la imagen y el contador', async () => {
    apiGet.mockResolvedValue([])
    render(<GaleriaImpacto />)
    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    const tercera = screen.getByRole('tab', { name: 'Imagen 3 de 4' })
    fireEvent.click(tercera)
    expect(tercera).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Imagen 1 de 4' })).toHaveAttribute('aria-selected', 'false')
    expect(contador()).toBe('03/04')
  })

  describe('avance automático', () => {
    async function montar() {
      vi.useFakeTimers()
      apiGet.mockResolvedValue([])
      render(<GaleriaImpacto />)
      await act(async () => {})
    }

    it('avanza cada 6 segundos y vuelve a la primera al final', async () => {
      await montar()
      act(() => vi.advanceTimersByTime(5999))
      expect(contador()).toBe('01/04')
      act(() => vi.advanceTimersByTime(1))
      expect(contador()).toBe('02/04')
      act(() => vi.advanceTimersByTime(6000 * 3))
      expect(contador()).toBe('01/04')
    })

    it('se detiene al pasar el mouse o enfocar con teclado', async () => {
      await montar()
      const viewport = document.querySelector('.gi-viewport')
      fireEvent.mouseEnter(viewport)
      act(() => vi.advanceTimersByTime(12000))
      expect(contador()).toBe('01/04')

      fireEvent.mouseLeave(viewport)
      fireEvent.focus(screen.getAllByRole('img')[0].closest('figure'))
      act(() => vi.advanceTimersByTime(12000))
      expect(contador()).toBe('01/04')
    })

    it('no avanza si la sección no está a la vista', async () => {
      vista.enVista = false
      await montar()
      act(() => vi.advanceTimersByTime(30000))
      expect(contador()).toBe('01/04')
    })

    it('no avanza si el usuario pidió reducir el movimiento', async () => {
      vista.reducir = true
      await montar()
      act(() => vi.advanceTimersByTime(30000))
      expect(contador()).toBe('01/04')
    })
  })
})

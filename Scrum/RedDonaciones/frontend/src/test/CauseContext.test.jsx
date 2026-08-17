import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CauseContext, { mensajeDeConcientizacion } from '../components/CauseContext'


describe('CauseContext', () => {
  it('adapta el mensaje a la categoría de la campaña', () => {
    expect(mensajeDeConcientizacion('Ropa de invierno')).toContain('prenda')
    expect(mensajeDeConcientizacion('Alimentos')).toContain('alimento')
  })

  it('muestra la organización y una recomendación para donar', () => {
    render(
      <CauseContext
        categoria="Ropa"
        organizacion="Hogar La Esperanza"
      />
    )

    expect(screen.getByRole('heading', {
      name: '¿Por qué importa esta causa?'
    })).toBeInTheDocument()
    expect(screen.getByText(/Hogar La Esperanza/)).toBeInTheDocument()
    expect(screen.getByText(/artículos útiles y en buen estado/)).toBeInTheDocument()
  })
})

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UbicacionEnlaces from '../../components/UbicacionEnlaces'

const conCoordenadas = {
    direccion_detalle: '5 avenida 10-20',
    zona: '4',
    municipio: 'Mixco',
    departamento: 'Guatemala',
    latitud: 14.6345679,
    longitud: -90.5069123
}

afterEach(cleanup)

describe('Bloque de ubicación', () => {
    it('no se muestra si no hay dirección ni coordenadas', () => {
        const { container } = render(<UbicacionEnlaces ubicacion={{ latitud: null, longitud: null }} />)

        expect(container).toBeEmptyDOMElement()
    })

    it('no se muestra si no recibe ubicación', () => {
        const { container } = render(<UbicacionEnlaces />)

        expect(container).toBeEmptyDOMElement()
    })

    it('muestra la dirección, las coordenadas y los enlaces al punto exacto', () => {
        render(<UbicacionEnlaces ubicacion={conCoordenadas} titulo="Cómo llegar" />)

        expect(screen.getByRole('region', { name: 'Cómo llegar' })).toBeInTheDocument()
        expect(screen.getByText('5 avenida 10-20, Zona 4, Mixco, Guatemala')).toBeInTheDocument()
        expect(screen.getByText('14.63457, -90.50691')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Ver en Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=14.6345679,-90.5069123')
        expect(screen.getByRole('link', { name: 'Cómo llegar con Waze' })).toHaveAttribute('href', 'https://www.waze.com/ul?ll=14.6345679%2C-90.5069123&navigate=yes')
        expect(screen.queryByText(/Sin coordenadas registradas/)).not.toBeInTheDocument()
    })

    it('avisa cuando los enlaces buscan por dirección', () => {
        render(<UbicacionEnlaces ubicacion={{ ...conCoordenadas, latitud: null, longitud: null }} nombre="Hogar La Esperanza" />)

        expect(screen.getByText(/Sin coordenadas registradas/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Ver en Google Maps' }).getAttribute('href')).toContain('query=Hogar%20La%20Esperanza')
    })

    it('abre los mapas en otra pestaña de forma segura', () => {
        render(<UbicacionEnlaces ubicacion={conCoordenadas} />)

        for (const enlace of screen.getAllByRole('link')) {
            expect(enlace).toHaveAttribute('target', '_blank')
            expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
        }
    })

    it('indica cuando la campaña usa la ubicación de la organización', () => {
        const { rerender } = render(<UbicacionEnlaces ubicacion={conCoordenadas} heredada />)
        expect(screen.getByText('Esta campaña usa la ubicación de la organización.')).toBeInTheDocument()

        rerender(<UbicacionEnlaces ubicacion={conCoordenadas} />)
        expect(screen.queryByText('Esta campaña usa la ubicación de la organización.')).not.toBeInTheDocument()
    })
})

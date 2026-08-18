import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DonationHistoryDetailPage from '../pages/DonationHistoryDetailPage'
import MisDonacionesPage from '../pages/MisDonacionesPage'
import OrgaDonacionesTable from '../pages/orga/OrgaDonacionesTable'
import AdminDonacionesTable from '../pages/admin/AdminDonacionesTable'
import { apiGet } from '../utils/api'
import { obtenerUsuarioSesion } from '../utils/session'
import { donationStatusLabel } from '../pages/admin/adminHelpers'

vi.mock('../utils/api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn()
}))

vi.mock('../utils/session', () => ({
    obtenerUsuarioSesion: vi.fn()
}))

const sampleDonacionDetalle = {
    id_donacion: 15,
    id_donante: 7,
    id_publicacion: 10,
    publicacion_titulo: 'Abrigos para el invierno',
    publicacion_descripcion: 'Campaña comunitaria',
    organizacion_nombre: 'Fundación Esperanza',
    cantidad_donada: 3,
    cantidad_recibida: 30,
    cantidad_necesaria: 50,
    fecha_donacion: '2026-08-25',
    hora_preferida: '15:00',
    nombre_contacto: 'Laura Gomez',
    telefono_contacto: '77889900',
    nota: 'Llevaré prendas limpias',
    donacion_estado: 'en_proceso',
    estado: 'en_proceso',
    publicacion_estado: 'activa'
}

function renderDonationDetail(id = 15) {
    return render(
        <MemoryRouter initialEntries={[`/donaciones/${id}`]}>
            <Routes>
                <Route path="/donaciones/:idDonacion" element={<DonationHistoryDetailPage />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('Seguimiento de donaciones por el donante', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        obtenerUsuarioSesion.mockReturnValue({
            id_usuario: 7,
            nombre: 'Laura Gomez',
            rol: 'donante'
        })
    })

    it('muestra el estado correcto y la informacion completa en el seguimiento', async () => {
        apiGet.mockResolvedValue(sampleDonacionDetalle)

        const { container } = renderDonationDetail(15)

        expect(await screen.findByText('Detalle de Donacion #15')).toBeInTheDocument()
        expect(screen.getByText('Campana: Abrigos para el invierno')).toBeInTheDocument()
        expect(screen.getByText('Fundación Esperanza')).toBeInTheDocument()
        expect(screen.getByText('15:00')).toBeInTheDocument()

        const badges = container.querySelectorAll('.donacion-estado-en_proceso')
        expect(badges.length).toBeGreaterThanOrEqual(1)
        expect(badges[0]).toHaveTextContent('En proceso')
    })

    it('bloquea el acceso si la donacion pertenece a otro donante', async () => {
        apiGet.mockResolvedValue({
            ...sampleDonacionDetalle,
            id_donante: 99
        })

        renderDonationDetail(15)

        expect(await screen.findByText('No tienes permisos para ver esta donacion')).toBeInTheDocument()
    })

    it('muestra vista de error cuando la API de donacion falla', async () => {
        apiGet.mockRejectedValue(new Error('Error del servidor al obtener donacion'))

        renderDonationDetail(15)

        expect(await screen.findByText('Error del servidor al obtener donacion')).toBeInTheDocument()
    })

    it('muestra el listado de donaciones con sus estados en MisDonacionesPage', async () => {
        apiGet.mockResolvedValue([
            {
                id_donacion: 1,
                publicacion_titulo: 'Campaña 1',
                organizacion_nombre: 'Org 1',
                cantidad_donada: 2,
                cantidad_recibida: 10,
                cantidad_necesaria: 20,
                fecha_donacion: '2026-08-20',
                donacion_estado: 'recibida',
                estado: 'recibida',
                publicacion_estado: 'activa'
            },
            {
                id_donacion: 2,
                publicacion_titulo: 'Campaña 2',
                organizacion_nombre: 'Org 2',
                cantidad_donada: 5,
                cantidad_recibida: 20,
                cantidad_necesaria: 20,
                fecha_donacion: '2026-08-21',
                donacion_estado: 'entregada',
                estado: 'entregada',
                publicacion_estado: 'finalizada'
            }
        ])

        const { container } = render(
            <MemoryRouter>
                <MisDonacionesPage />
            </MemoryRouter>
        )

        expect(await screen.findByText('Campaña 1')).toBeInTheDocument()
        expect(screen.getByText('Campaña 2')).toBeInTheDocument()
        expect(screen.getByText('Recibida')).toBeInTheDocument()
        expect(screen.getByText('Entregada')).toBeInTheDocument()

        const badgeRecibida = container.querySelector('.donacion-estado-recibida')
        const badgeEntregada = container.querySelector('.donacion-estado-entregada')
        expect(badgeRecibida).toBeInTheDocument()
        expect(badgeEntregada).toBeInTheDocument()
    })
})

describe('Gestion de donaciones en el frontend', () => {
    const mockDonaciones = [
        {
            id_donacion: 101,
            publicacion_titulo: 'Alimentos no perecederos',
            organizacion_nombre: 'Comedor Central',
            donante_nombre: 'Mario Ruiz',
            telefono_contacto: '11223344',
            cantidad_donada: 10,
            fecha_donacion: '2026-08-15',
            estado: 'pendiente',
            donacion_estado: 'pendiente'
        },
        {
            id_donacion: 102,
            publicacion_titulo: 'Kits escolares',
            organizacion_nombre: 'Comedor Central',
            donante_nombre: 'Sofia Castro',
            telefono_contacto: '55667788',
            cantidad_donada: 4,
            fecha_donacion: '2026-08-16',
            estado: 'recibida',
            donacion_estado: 'recibida'
        }
    ]

    it('renderiza la tabla del intermediario y permite seleccion individual y total', () => {
        const selectedIds = new Set([101])
        const onToggleOne = vi.fn()
        const onToggleAll = vi.fn()

        render(
            <OrgaDonacionesTable
                donaciones={mockDonaciones}
                loadingDonaciones={false}
                donacionesError=""
                selectedIds={selectedIds}
                onRetry={vi.fn()}
                onToggleOne={onToggleOne}
                onToggleAll={onToggleAll}
            />
        )

        expect(screen.getByText('Alimentos no perecederos')).toBeInTheDocument()
        expect(screen.getByText('Mario Ruiz')).toBeInTheDocument()
        expect(screen.getByText('Kits escolares')).toBeInTheDocument()
        expect(screen.getByText('Pendiente')).toBeInTheDocument()
        expect(screen.getByText('Recibida')).toBeInTheDocument()

        const checkboxOne = screen.getByLabelText('Seleccionar donación #101')
        expect(checkboxOne).toBeChecked()

        const checkboxTwo = screen.getByLabelText('Seleccionar donación #102')
        expect(checkboxTwo).not.toBeChecked()

        fireEvent.click(checkboxTwo)
        expect(onToggleOne).toHaveBeenCalledWith(102, true)

        const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las donaciones')
        fireEvent.click(selectAllCheckbox)
        expect(onToggleAll).toHaveBeenCalledWith(true)
    })

    it('muestra estado vacio y error en la tabla del intermediario', () => {
        const { rerender } = render(
            <OrgaDonacionesTable
                donaciones={[]}
                loadingDonaciones={false}
                donacionesError=""
                selectedIds={new Set()}
                onRetry={vi.fn()}
                onToggleOne={vi.fn()}
                onToggleAll={vi.fn()}
            />
        )

        expect(screen.getByText('No hay donaciones registradas para tu organización.')).toBeInTheDocument()

        const onRetry = vi.fn()
        rerender(
            <OrgaDonacionesTable
                donaciones={[]}
                loadingDonaciones={false}
                donacionesError="Error al conectar con la base de datos"
                selectedIds={new Set()}
                onRetry={onRetry}
                onToggleOne={vi.fn()}
                onToggleAll={vi.fn()}
            />
        )

        expect(screen.getByText('Error al conectar con la base de datos')).toBeInTheDocument()
    })

    it('renderiza la tabla del administrador con columna de organizacion', () => {
        render(
            <AdminDonacionesTable
                donaciones={mockDonaciones}
                loadingDonaciones={false}
                donacionesError=""
                selectedIds={new Set()}
                onRetry={vi.fn()}
                onToggleOne={vi.fn()}
                onToggleAll={vi.fn()}
            />
        )

        expect(screen.getByText('Organización')).toBeInTheDocument()
        expect(screen.getAllByText('Comedor Central').length).toBe(2)
        expect(screen.getByText('Mario Ruiz')).toBeInTheDocument()
        expect(screen.getByText('Sofia Castro')).toBeInTheDocument()
    })
})

describe('Consistencia del estado de donaciones entre roles', () => {
    const estados = [
        { key: 'pendiente', label: 'Pendiente' },
        { key: 'recibida', label: 'Recibida' },
        { key: 'en_proceso', label: 'En proceso' },
        { key: 'entregada', label: 'Entregada' },
        { key: 'rechazada', label: 'Rechazada' }
    ]

    estados.forEach(({ key, label }) => {
        it(`muestra la misma etiqueta "${label}" y clase para el donante, intermediario y administrador`, async () => {
            obtenerUsuarioSesion.mockReturnValue({ id_usuario: 7, rol: 'donante' })
            apiGet.mockResolvedValue({
                ...sampleDonacionDetalle,
                id_donante: 7,
                donacion_estado: key,
                estado: key
            })

            const { container: containerDetalle, unmount: unmountDetalle } = renderDonationDetail(15)
            expect(await screen.findByText('Detalle de Donacion #15')).toBeInTheDocument()

            const badgeDonante = containerDetalle.querySelector(`.donacion-estado-${key}`)
            expect(badgeDonante).toBeInTheDocument()
            expect(badgeDonante).toHaveTextContent(label)
            unmountDetalle()

            const donacionObj = [{
                ...sampleDonacionDetalle,
                id_donacion: 99,
                donante_nombre: 'Laura Gomez',
                donacion_estado: key,
                estado: key
            }]

            const { container: containerOrga, unmount: unmountOrga } = render(
                <OrgaDonacionesTable
                    donaciones={donacionObj}
                    loadingDonaciones={false}
                    donacionesError=""
                    selectedIds={new Set()}
                    onRetry={vi.fn()}
                    onToggleOne={vi.fn()}
                    onToggleAll={vi.fn()}
                />
            )
            const badgeIntermediario = containerOrga.querySelector(`.donacion-estado-${key}`)
            expect(badgeIntermediario).toBeInTheDocument()
            expect(badgeIntermediario).toHaveTextContent(label)
            unmountOrga()

            const { container: containerAdmin, unmount: unmountAdmin } = render(
                <AdminDonacionesTable
                    donaciones={donacionObj}
                    loadingDonaciones={false}
                    donacionesError=""
                    selectedIds={new Set()}
                    onRetry={vi.fn()}
                    onToggleOne={vi.fn()}
                    onToggleAll={vi.fn()}
                />
            )
            const badgeAdmin = containerAdmin.querySelector(`.donacion-estado-${key}`)
            expect(badgeAdmin).toBeInTheDocument()
            expect(badgeAdmin).toHaveTextContent(label)
            expect(donationStatusLabel(key)).toBe(label)
            unmountAdmin()
        })
    })
})

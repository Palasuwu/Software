import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import UserFormFields from '../pages/admin/UserFormFields'
import { buildUserPayload, validateUserForm } from '../pages/admin/adminForms'
afterEach(cleanup)
const form = { nombre: 'Ana Perez', correo: 'ana@example.com', telefono: '22223333', password: 'clave1234', rol: 'intermediario', id_organizacion: '1', cargo: 'Coordinadora' }
describe('Alta administrativa de intermediarios', () => {
    it('explica que guardar autoriza los permisos', () => {
        render(<UserFormFields form={form} errors={{}} mode="create" organizaciones={[{ id_organizacion: 1, nombre: 'Liga Juvenil' }]} onChange={() => {}} />)
        expect(screen.getByText(/Verifica la identidad/)).toBeInTheDocument()
        expect(screen.getByLabelText('Cargo')).toHaveAttribute('maxlength', '200')
    })
    it('envía la asociación únicamente al crear y conserva la edición de cargo', () => {
        expect(buildUserPayload(form, true)).toMatchObject({ id_organizacion: 1, rol: 'intermediario', cargo: 'Coordinadora' })
        expect(buildUserPayload(form, false)).toEqual({ nombre: 'Ana Perez', correo: 'ana@example.com', telefono: '22223333', cargo: 'Coordinadora' })
    })
    it.each(['ab', 'x'.repeat(201)])('bloquea cargo fuera de los límites', cargo => {
        expect(validateUserForm({ ...form, cargo }, 'create').cargo).toBeTruthy()
    })
})

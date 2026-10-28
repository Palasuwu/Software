// Recorrido del administrador: usuarios, organización, campañas, donaciones, carrusel y reportes.
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const h = require('../soporte/helpers')

async function abrirPanel(page) {
    await h.iniciarSesion(page, 'admin')
    const nombre = h.esMovil(page) ? 'Admin' : 'Panel Admin'
    await h.navegacion(page).getByRole('link', { name: nombre, exact: true }).click()
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { name: 'Panel de Administrador' })).toBeVisible()
}

async function abrirPestana(page, nombre) {
    await page.getByRole('button', { name: nombre, exact: true }).click()
    await h.esperarCarga(page)
}

test.describe('Administrador', () => {
    let errores

    test.beforeEach(async ({ page }) => {
        errores = h.vigilarConsola(page)
    })

    test.afterEach(async ({}, testInfo) => {
        await h.revisarConsola(testInfo, errores)
    })

    test('usuarios: crear, validar y desactivar', async ({ page }, testInfo) => {
        await abrirPanel(page)
        await expect(page.locator('tbody tr').first()).toBeVisible()
        await h.revisarPantalla(page, testInfo, 'Admin: usuarios')

        const modal = page.getByRole('dialog')

        await test.step('Formulario vacío', async () => {
            await page.getByRole('button', { name: 'Nuevo Usuario' }).click()
            await expect(modal).toBeVisible()
            await modal.getByRole('button', { name: 'Guardar usuario' }).click()
            await expect(modal.getByText('El nombre es obligatorio')).toBeVisible()
            await expect(modal.getByText('El correo es obligatorio')).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: nuevo usuario')
            await h.revisarEscape(page, testInfo, 'Admin: nuevo usuario', modal, modal.getByRole('button', { name: 'Cerrar modal' }))
        })

        const sufijo = h.sufijoUnico(testInfo)
        const nombre = `Usuario Recorrido ${sufijo}`
        const correo = `admin.${sufijo}@reddonaciones.local`

        await test.step('Error del servidor en un campo', async () => {
            await page.getByRole('button', { name: 'Nuevo Usuario' }).click()
            await modal.locator('#admin-user-nombre').fill('Usuario 2026')
            await modal.locator('#admin-user-telefono').fill('5555-9999')
            await modal.locator('#admin-user-correo').fill(correo)
            await modal.locator('#admin-user-departamento').fill('Guatemala')
            await modal.locator('#admin-user-municipio').fill('Mixco')
            await modal.locator('#admin-user-zona').fill('7')
            await modal.locator('#admin-user-direccion').fill('Calzada San Juan 12-30')
            await modal.getByRole('button', { name: 'Guardar usuario' }).click()

            // El nombre con números lo rechaza el backend; el formulario debería decir cuál campo.
            await expect(modal.getByText(/Datos invalidos|letras/)).toBeVisible()
            if (!(await modal.getByText(/solo debe contener letras/).isVisible())) {
                h.observar(testInfo, 'Admin: nuevo usuario', 'Si el backend rechaza un campo (p. ej. nombre con números), el modal solo dice "Datos invalidos" sin indicar cuál campo corregir', 3)
            }
        })

        await test.step('Crear usuario', async () => {
            await modal.locator('#admin-user-nombre').fill(nombre)
            await modal.getByRole('button', { name: 'Guardar usuario' }).click()
            const temporal = page.getByRole('dialog', { name: /Contraseña Temporal/ })
            await expect(temporal).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: contraseña temporal')
            await temporal.getByRole('button', { name: 'Cerrar modal' }).click()
            await expect(page.locator('tr', { hasText: correo })).toBeVisible()
        })

        await test.step('Desactivar usuario', async () => {
            const fila = page.locator('tr', { hasText: correo })
            await fila.getByRole('button', { name: `Desactivar ${nombre}` }).click()
            const confirmar = page.getByRole('dialog')
            await expect(confirmar).toBeVisible()
            await confirmar.locator('.admin-danger-button').click()
            await expect(fila.getByRole('button', { name: `Activar ${nombre}` })).toBeVisible()
        })
    })

    test('organización, campañas, donaciones y carrusel', async ({ page }, testInfo) => {
        await abrirPanel(page)
        const modal = page.getByRole('dialog')

        await test.step('Organización', async () => {
            await abrirPestana(page, 'Organización')
            await expect(page.locator('tbody tr').first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: organización')
            await page.getByRole('button', { name: /^Editar Liga Juvenil/ }).click()
            await expect(modal).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: editar organización')
            await modal.getByRole('button', { name: 'Cerrar modal' }).click()
            await expect(modal).toBeHidden()
        })

        await test.step('Campañas', async () => {
            await abrirPestana(page, 'Campañas')
            const filas = page.locator('tbody tr')
            await expect(filas.first()).toBeVisible()
            const total = await filas.count()
            await page.locator('#campaign-filtro-texto').fill('Mochilas')
            await expect(filas).toHaveCount(1)
            await page.locator('#campaign-filtro-texto').fill('')
            await expect(filas).toHaveCount(total)
            await h.revisarPantalla(page, testInfo, 'Admin: campañas')

            await page.getByRole('button', { name: 'Nueva Campaña' }).click()
            await expect(modal).toBeVisible()
            await modal.getByRole('button', { name: 'Crear campaña' }).click()
            await expect(modal).toBeVisible()
            await expect(modal.locator('.form-error-text, .error-box, [class*=error]').first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: nueva campaña')
            await modal.getByRole('button', { name: 'Cerrar modal' }).click()
        })

        await test.step('Donaciones', async () => {
            await abrirPestana(page, 'Donaciones')
            await expect(page.locator('tbody tr').first()).toBeVisible()
            await page.getByLabel('Seleccionar todas las donaciones').check()
            await expect(page.getByText(/[1-9]\d* seleccionada\(s\)/)).toBeVisible()
            await page.getByLabel('Seleccionar todas las donaciones').uncheck()
            await h.revisarPantalla(page, testInfo, 'Admin: donaciones')
        })

        await test.step('Carrusel', async () => {
            await abrirPestana(page, 'Carrusel')
            await expect(page.locator('tbody tr').first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: carrusel')
            await page.getByRole('button', { name: 'Nueva Imagen' }).click()
            await expect(modal).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: nueva imagen')
            await modal.getByRole('button', { name: 'Cerrar modal' }).click()
            await expect(modal).toBeHidden()
        })
    })

    test('reportes: filtros y exportación CSV', async ({ page }, testInfo) => {
        await abrirPanel(page)
        await abrirPestana(page, 'Reportes')
        await expect(page.getByRole('heading', { name: 'Estadísticas y reportes' })).toBeVisible()

        await test.step('Filtros', async () => {
            await page.locator('#rep-desde').fill('2026-01-01')
            await page.locator('#rep-hasta').fill('2026-12-31')
            await page.getByRole('button', { name: 'Aplicar' }).click()
            await h.esperarCarga(page)
            await expect(page.locator('table').first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Admin: reportes')
            await page.getByRole('button', { name: 'Limpiar' }).click()
            await expect(page.locator('#rep-desde')).toHaveValue('')
        })

        await test.step('Exportar CSV', async () => {
            const empezo = Date.now()
            const [descarga] = await Promise.all([
                page.waitForEvent('download'),
                page.getByRole('button', { name: /Exportar CSV/ }).last().click()
            ])
            h.medir(testInfo, 'Exportar CSV del detalle', Date.now() - empezo)
            expect(descarga.suggestedFilename()).toMatch(/\.csv$/)
            const contenido = fs.readFileSync(await descarga.path(), 'utf8')
            expect(contenido.split(/\r?\n/).filter(Boolean).length).toBeGreaterThan(1)
        })

        await test.step('Cerrar sesión', async () => {
            await h.cerrarSesion(page, testInfo)
        })
    })
})

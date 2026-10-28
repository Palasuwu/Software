// Recorrido del intermediario: panel de organización, publicaciones, donaciones y perfil institucional.
const { test, expect } = require('@playwright/test')
const h = require('../soporte/helpers')

async function abrirPanel(page) {
    await h.iniciarSesion(page, 'intermediario')
    const nombre = h.esMovil(page) ? /Mi Org/ : 'Mi Organización'
    await h.navegacion(page).getByRole('link', { name: nombre }).click()
    await expect(page).toHaveURL(/\/intermediario/)
    await expect(page.getByRole('heading', { name: 'Panel de Organización' })).toBeVisible()
}

async function abrirPestana(page, nombre) {
    await page.getByRole('button', { name: nombre, exact: true }).click()
    await h.esperarCarga(page)
}

test.describe('Intermediario', () => {
    let errores

    test.beforeEach(async ({ page }) => {
        errores = h.vigilarConsola(page)
    })

    test.afterEach(async ({}, testInfo) => {
        await h.revisarConsola(testInfo, errores)
    })

    test('publicaciones: tabla, filtros y formularios', async ({ page }, testInfo) => {
        await abrirPanel(page)

        await test.step('Tabla de publicaciones', async () => {
            const filas = page.locator('tbody tr')
            const contador = page.locator('.admin-hero-stat', { hasText: 'Publicaciones' }).locator('strong')
            await expect(contador).not.toHaveText('0')
            const total = Number(await contador.innerText())
            await expect(filas).toHaveCount(total)

            await page.locator('#campaign-filtro-texto').fill('Cobijas')
            await expect(filas).toHaveCount(1)
            await page.locator('#campaign-filtro-texto').fill('')
            await expect(filas).toHaveCount(total)

            await page.locator('#campaign-filtro-estado').selectOption({ index: 1 })
            expect(await filas.count()).toBeLessThanOrEqual(total)
            await page.locator('#campaign-filtro-estado').selectOption({ index: 0 })
            await h.revisarPantalla(page, testInfo, 'Panel organización: publicaciones')

            // En pantallas angostas la columna de acciones queda al final del scroll de la tabla.
            const editar = page.getByRole('button', { name: /^Editar publicación: Cobijas/ })
            await editar.scrollIntoViewIfNeeded()
            await expect(editar).toBeVisible()
            if (h.esMovil(page)) {
                const oculta = await page.locator('.admin-table-wrap').first().evaluate((el) => el.scrollWidth > el.clientWidth)
                if (oculta) {
                    h.observar(testInfo, 'Panel organización: publicaciones', 'En móvil la tabla necesita scroll horizontal para llegar al estado y las acciones, y no hay ninguna pista visual de que se puede desplazar', 2)
                }
            }
        })

        await test.step('Editar publicación (abrir y cancelar)', async () => {
            await page.getByRole('button', { name: /^Editar publicación: Cobijas/ }).click()
            const modal = page.locator('.admin-modal')
            await expect(modal).toBeVisible()
            await expect(modal.locator('input[name=titulo]')).toHaveValue(/Cobijas/)
            if (!(await page.getByRole('dialog').count())) {
                h.observar(testInfo, 'Formulario de publicación', 'El modal de publicación no se anuncia como diálogo (falta role="dialog") y no tiene botón para cerrar; sus etiquetas no están asociadas a los campos', 2)
            }
            await h.revisarPantalla(page, testInfo, 'Formulario de publicación')
            await h.revisarEscape(page, testInfo, 'Formulario de publicación', modal, modal.getByRole('button', { name: 'Cancelar' }))
        })

        await test.step('Nueva publicación: validaciones', async () => {
            await page.getByRole('button', { name: 'Nueva Publicación' }).click()
            const modal = page.locator('.admin-modal')
            await expect(modal).toBeVisible()
            await modal.getByRole('button', { name: 'Guardar' }).click()
            await expect(modal).toBeVisible()
            await expect(modal.locator('.error-box, .form-error-text, [class*=error]').first()).toBeVisible()
            await modal.getByRole('button', { name: 'Cancelar' }).click()
            await expect(modal).toBeHidden()
        })
    })

    test('donaciones: cambiar estado en bloque', async ({ page, request }, testInfo) => {
        // Se crea una donación nueva para no depender de los datos de ejemplo.
        const token = await h.tokenDe(request, 'donante')
        const fecha = new Date()
        fecha.setDate(fecha.getDate() + 10)
        const nueva = await request.post('/api/donaciones', {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                id_publicacion: 9,
                descripcion: 'Donación del recorrido del intermediario',
                nombre_contacto: 'Recorrido Intermediario',
                telefono_contacto: '5555-0000',
                hora_preferida: '10:00',
                nota: '',
                fecha_donacion: fecha.toISOString().slice(0, 10),
                cantidad_donada: 1
            }
        })
        expect(nueva.ok(), await nueva.text()).toBeTruthy()
        const { id_donacion: id } = await nueva.json()

        await abrirPanel(page)
        await abrirPestana(page, 'Donaciones')

        const casilla = page.getByLabel(`Seleccionar donación #${id}`)
        const fila = page.locator('tr', { has: casilla })
        await expect(fila).toContainText(/pendiente/i)
        await casilla.check()
        await expect(page.getByText('1 seleccionada(s)')).toBeVisible()
        await h.revisarPantalla(page, testInfo, 'Panel organización: donaciones')

        await page.getByLabel(/Nuevo estado de las donaciones/).selectOption({ label: 'Recibida' })
        await page.getByRole('button', { name: 'Aplicar a seleccionadas' }).click()

        const confirmar = page.getByRole('dialog')
        await expect(confirmar).toContainText('Recibida')
        await confirmar.getByRole('button', { name: 'Confirmar' }).click()
        await expect(fila).toContainText(/recibida/i)

        // Pasar de recibida a pendiente no está permitido: debe avisar.
        await casilla.check()
        await page.getByLabel(/Nuevo estado de las donaciones/).selectOption({ label: 'Pendiente' })
        await page.getByRole('button', { name: 'Aplicar a seleccionadas' }).click()
        const dialogo = page.getByRole('dialog')
        if (await dialogo.isVisible()) await dialogo.getByRole('button', { name: 'Confirmar' }).click()
        await expect(fila).toContainText(/recibida/i)
        await expect(page.getByText(/no se pudo|no permitid|transici|inválid|invalid/i).first()).toBeVisible()
    })

    test('intermediarios, perfil institucional y cierre de sesión', async ({ page }, testInfo) => {
        await abrirPanel(page)

        await test.step('Contadores del panel', async () => {
            const contador = page.locator('.admin-hero-stat', { hasText: 'Intermediarios' }).locator('strong')
            const antes = await contador.innerText()
            await abrirPestana(page, 'Intermediarios')
            const filas = await page.locator('tbody tr').count()
            if (antes === '0' && filas > 0) {
                h.observar(testInfo, 'Panel organización', `El contador dice "0 Intermediarios" al entrar y solo se actualiza (${filas}) después de abrir la pestaña Intermediarios`, 2)
            }
            await h.revisarPantalla(page, testInfo, 'Panel organización: intermediarios')
        })

        await test.step('Perfil institucional', async () => {
            await abrirPestana(page, 'Perfil Institucional')
            const departamento = page.getByLabel('Departamento')
            const municipio = page.getByLabel('Municipio')
            await expect(departamento).toBeVisible()
            await departamento.selectOption({ label: 'Quetzaltenango' })
            await expect(municipio.locator('option', { hasText: 'Salcajá' })).toHaveCount(1)
            await departamento.selectOption({ label: 'Guatemala' })
            await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Panel organización: perfil institucional')
        })

        await test.step('Cerrar sesión', async () => {
            await h.cerrarSesion(page, testInfo)
        })
    })
})

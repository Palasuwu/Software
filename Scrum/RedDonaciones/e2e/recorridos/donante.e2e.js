// Recorrido del donante: desde la landing hasta registrar una donación y darle seguimiento.
const { test, expect } = require('@playwright/test')
const h = require('../soporte/helpers')

test.describe('Donante', () => {
    let errores

    test.beforeEach(async ({ page }) => {
        errores = h.vigilarConsola(page)
    })

    test.afterEach(async ({}, testInfo) => {
        await h.revisarConsola(testInfo, errores)
    })

    test('visitante: landing, campañas públicas y registro de cuenta', async ({ page }, testInfo) => {
        await test.step('Landing', async () => {
            await page.goto('/')
            await expect(page.getByRole('link', { name: /Únete al movimiento/ })).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Landing')
        })

        await test.step('Campañas sin sesión', async () => {
            await page.goto('/home')
            await expect(page.locator('.campaign-card').first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Inicio (sin sesión)')
        })

        await test.step('Registro: validaciones', async () => {
            await page.goto('/signup')
            await page.locator('.auth-submit-btn').click()
            const errores = page.locator('.auth-field-error, .auth-error, [class*=error]').filter({ hasText: /obligatori|requerid|valid/i })
            await expect(errores.first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Registro')
        })

        await test.step('Registro: crear cuenta', async () => {
            const sufijo = h.sufijoUnico(testInfo)
            await page.locator('#reg-nombre').fill(`Donante Recorrido ${sufijo}`)
            await page.locator('#reg-telefono').fill('5555-1234')
            await page.locator('#reg-correo').fill(`e2e.${sufijo}@reddonaciones.local`)
            await page.locator('#reg-password').fill('Recorrido2026')
            await page.locator('#reg-confirmPassword').fill('Recorrido2026')
            await page.locator('#reg-departamento').fill('Guatemala')
            await page.locator('#reg-municipio').fill('Mixco')
            await page.locator('#reg-zona').fill('4')
            await page.locator('#reg-direccion').fill('5a avenida 10-20, colonia El Milagro')
            await page.locator('.auth-submit-btn').click()
            await expect(page).toHaveURL(/\/perfil/, { timeout: 15_000 })
            await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible()
        })
    })

    test('inicio de sesión: mensajes de error y uso con teclado', async ({ page }, testInfo) => {
        await page.goto('/login')

        await test.step('Formulario vacío', async () => {
            await page.locator('.auth-submit-btn').click()
            await expect(page.getByText(/El correo es obligatorio/)).toBeVisible()
            await expect(page.getByText(/obligatoria/)).toBeVisible()
        })

        await test.step('Contraseña incorrecta', async () => {
            await page.locator('#login-correo').fill(h.USUARIOS.donante)
            await page.locator('#login-password').fill('no-es-la-clave')
            await page.locator('.auth-submit-btn').click()
            await expect(page.getByText(/Credenciales/i)).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Inicio de sesión')
        })

        await test.step('Foco visible', async () => {
            if (!(await h.focoVisible(page.locator('#login-correo')))) {
                h.observar(testInfo, 'Inicio de sesión', 'El campo de correo no cambia de aspecto al recibir el foco del teclado', 2)
            }
        })

        await test.step('Solo con teclado', async () => {
            await page.locator('#login-correo').fill('')
            await page.locator('#login-correo').focus()
            await page.keyboard.type(h.USUARIOS.donante)
            await page.keyboard.press('Tab')
            await expect(page.locator('#login-password')).toBeFocused()
            await page.keyboard.type(h.PASSWORD_DEMO)
            await page.keyboard.press('Enter')
            await expect(page).toHaveURL(/\/perfil/)
        })

        const textos = await page.goto('/login').then(() => page.locator('body').innerText()).catch(() => '')
        if (/Contrasena|Iniciar sesion|Olvidaste tu contrasena/.test(textos)) {
            h.observar(testInfo, 'Inicio de sesión', 'Textos sin tildes ni signos de apertura: "Contrasena", "Iniciar sesion", "Olvidaste tu contrasena?"', 1)
        }
    })

    test('buscar campaña, encontrar dónde entregar y donar', async ({ page }, testInfo) => {
        await h.iniciarSesion(page, 'donante')
        const destino = await page.url()
        if (/\/perfil/.test(destino)) {
            h.observar(testInfo, 'Inicio de sesión', 'Después de iniciar sesión el donante llega a su perfil y no a las campañas, que es lo que más usa', 1)
        }

        await test.step('Inicio: búsqueda y filtros', async () => {
            await h.navegacion(page).getByRole('link', { name: 'Inicio', exact: true }).click()
            await expect(page).toHaveURL(/\/home/)
            const tarjetas = page.locator('.campaign-card')
            await expect(tarjetas.first()).toBeVisible()
            const total = await tarjetas.count()

            await h.abrirFiltrosSiHaceFalta(page)
            const buscador = page.getByPlaceholder('Buscar campañas...')
            await buscador.fill('Mochilas')
            await expect(tarjetas.filter({ hasText: 'Mochilas escolares' }).first()).toBeVisible()
            expect(await tarjetas.count()).toBeLessThan(total)

            await page.getByRole('button', { name: 'Limpiar filtros' }).click()
            await expect(tarjetas).toHaveCount(total)

            await page.getByRole('button', { name: 'Activa', exact: true }).click()
            await expect(tarjetas.filter({ hasText: 'Finalizada' })).toHaveCount(0)
            await page.getByRole('button', { name: 'Limpiar filtros' }).click()

            await h.cerrarFiltrosSiHaceFalta(page)
            await h.revisarPantalla(page, testInfo, 'Inicio (campañas)')
        })

        await test.step('Detalle: punto y horario de entrega', async () => {
            const tarjeta = page.locator('.campaign-card').filter({ hasText: 'Mochilas escolares para comunidades rurales' })
            await tarjeta.getByRole('button', { name: 'Ver detalle' }).click()
            await expect(page).toHaveURL(/\/detalle\/\d+/)
            await expect(page.getByText(/Dónde entregar/i)).toBeVisible()

            const maps = page.getByRole('link', { name: /Google Maps/ })
            await expect(maps).toHaveAttribute('href', /google\.com\/maps/)
            await expect(page.getByRole('link', { name: /Waze/ })).toHaveAttribute('href', /waze/)

            const horario = await page.locator('body').innerText()
            if (/HORARIO\s*\n?\s*Coordinar con la org/i.test(horario)) {
                h.observar(testInfo, 'Detalle de campaña', 'El horario de entrega dice "Coordinar con la org."; el donante no sabe a qué hora puede llevar la donación', 2)
            }
            await h.revisarPantalla(page, testInfo, 'Detalle de campaña')
        })

        await test.step('Formulario de donación: validaciones', async () => {
            const formulario = page.locator('form').filter({ has: page.locator('.dp-submit') })
            await expect(formulario.locator('input[name=nombre]')).not.toHaveValue('')

            await h.tocar(formulario.locator('.dp-submit'), testInfo, 'Formulario de donación')
            await expect(page.locator('.dp-error')).toContainText('compromiso')

            await h.tocar(formulario.locator('.dp-commitment'), testInfo, 'Formulario de donación')
            await h.tocar(formulario.locator('.dp-submit'), testInfo, 'Formulario de donación')
            await expect(page.locator('.dp-error')).toBeVisible()
            const mensaje = await page.locator('.dp-error').innerText()
            if (!/fecha|hora/i.test(mensaje)) {
                h.observar(testInfo, 'Formulario de donación', `Sin fecha ni hora el mensaje es "${mensaje}" y no señala qué campo falta`, 2)
            }

            if (!(await formulario.getByLabel('Fecha de entrega').count())) {
                h.observar(testInfo, 'Formulario de donación', 'Las etiquetas (Nombre, Teléfono, Fecha, Hora, Nota) no están asociadas a sus campos; los botones − y + no tienen nombre accesible', 2)
            }
        })

        await test.step('Formulario de donación: registrar', async () => {
            const formulario = page.locator('form').filter({ has: page.locator('.dp-submit') })
            const empezo = Date.now()
            await h.tocar(formulario.locator('.dp-qty-btn').last(), testInfo, 'Formulario de donación')
            await expect(formulario.locator('input[name=cantidad]')).toHaveValue('2')

            const fecha = new Date()
            fecha.setDate(fecha.getDate() + 7)
            await formulario.locator('input[name=fecha]').fill(fecha.toISOString().slice(0, 10))
            await formulario.locator('select[name=hora]').selectOption('10:00')
            await formulario.locator('textarea[name=nota]').fill(`Recorrido ${testInfo.project.name}`)
            await h.tocar(formulario.locator('.dp-submit'), testInfo, 'Formulario de donación')

            await expect(page.getByText('Donación registrada')).toBeVisible()
            h.medir(testInfo, 'Registrar donación (desde llenar fecha hasta la confirmación)', Date.now() - empezo)
            await expect(page).toHaveURL(/\/donaciones$/, { timeout: 10_000 })
        })
    })

    test('historial, detalle de donación, perfil, notificaciones y campañas cerradas', async ({ page }, testInfo) => {
        await h.iniciarSesion(page, 'donante')

        await test.step('Mis donaciones', async () => {
            await page.goto('/donaciones')
            await expect(page.getByRole('heading', { name: 'Mis Donaciones' })).toBeVisible()
            for (const filtro of ['Activas', 'Finalizadas', 'Todas']) {
                await page.getByRole('button', { name: filtro, exact: true }).click()
            }
            await expect(page.getByRole('button', { name: 'Ver detalle' }).first()).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Mis donaciones')
        })

        await test.step('Detalle de una donación', async () => {
            await page.getByRole('button', { name: 'Ver detalle' }).first().click()
            await expect(page).toHaveURL(/\/donaciones\/\d+/)
            const texto = await page.locator('body').innerText()
            if (/Direccion no disponible/i.test(texto)) {
                h.observar(testInfo, 'Detalle de donación', 'Muestra "Direccion no disponible" aunque la campaña sí tiene punto de entrega; el donante no ve a dónde llevar su donación desde su historial', 3)
            }
            if (/ESTADO DE LA CAMPANA|ORGANIZACION|Categoria/.test(texto)) {
                h.observar(testInfo, 'Detalle de donación', 'Textos sin tildes: "CAMPANA", "ORGANIZACION", "Categoria", "Articulos"', 1)
            }
            await h.revisarPantalla(page, testInfo, 'Detalle de donación')
            await page.getByText('Volver al historial').click()
            await expect(page).toHaveURL(/\/donaciones$/)
        })

        await test.step('Perfil: editar y guardar', async () => {
            await page.goto('/perfil')
            await page.getByRole('button', { name: 'Editar perfil' }).click()
            await expect(page.locator('#profile-nombre')).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Perfil (edición)')
            await page.getByRole('button', { name: 'Guardar cambios' }).click()

            // Los datos de ejemplo traen zonas como "Zona 10", que el backend ya no acepta.
            await expect(page.getByText(/Perfil actualizado|La zona debe ser/)).toBeVisible()
            if (await page.getByText('La zona debe ser un numero valido').isVisible()) {
                h.observar(testInfo, 'Perfil (edición)', 'Guardar el perfil sin cambios falla con "La zona debe ser un numero valido": el mensaje sale arriba de la página, lejos del campo, y el campo no se marca', 2)
                const zona = await page.locator('#profile-zona').inputValue()
                await page.locator('#profile-zona').fill(zona.replace(/\D/g, '') || '1')
                await page.getByRole('button', { name: 'Guardar cambios' }).click()
            }
            await expect(page.getByText(/Perfil actualizado/)).toBeVisible()
        })

        await test.step('Notificaciones', async () => {
            const campana = page.getByRole('button', { name: /Notificaciones/ })
            if (await campana.isVisible()) {
                await campana.click()
                await expect(page.getByText(/sin leer|No tienes notificaciones|Marcar todas/i).first()).toBeVisible()
                await page.keyboard.press('Escape')
            } else {
                h.observar(testInfo, 'Notificaciones', 'En móvil no hay acceso al centro de notificaciones: no está en la barra inferior y la barra superior se oculta', 3)
            }
        })

        await test.step('Campaña finalizada', async () => {
            await page.goto('/home')
            await expect(page.locator('.campaign-card').first()).toBeVisible()
            await h.abrirFiltrosSiHaceFalta(page)
            await page.getByRole('button', { name: 'Finalizada', exact: true }).click()
            await h.cerrarFiltrosSiHaceFalta(page)
            await page.locator('.campaign-card').first().getByRole('button', { name: 'Ver detalle' }).click()
            await expect(page.getByRole('heading', { name: 'Campaña finalizada' })).toBeVisible()
            await expect(page.getByRole('button', { name: /Ver otras (causas|campañas)/ })).toBeVisible()
            await h.revisarPantalla(page, testInfo, 'Campaña finalizada')
        })

        await test.step('Campaña cancelada (enlace directo)', async () => {
            await page.goto('/detalle/1')
            await h.esperarCarga(page)
            if (await page.getByText('Error cargando detalle').isVisible()) {
                h.observar(testInfo, 'Detalle de campaña', 'Una campaña cancelada (o un enlace viejo) muestra solo "Error cargando detalle", sin explicar qué pasó ni ofrecer volver a las campañas', 2)
            }
        })

        await test.step('Cerrar sesión', async () => {
            await h.cerrarSesion(page, testInfo)
        })
    })
})

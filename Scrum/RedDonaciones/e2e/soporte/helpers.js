const { expect } = require('@playwright/test')

const PASSWORD_DEMO = process.env.E2E_PASSWORD || 'demo123'

// Cuentas de db/datos.sql
const USUARIOS = {
    donante: process.env.E2E_DONANTE || 'donante.video@reddonaciones.local',
    intermediario: process.env.E2E_INTERMEDIARIO || 'inter.demo@reddonaciones.local',
    admin: process.env.E2E_ADMIN || 'admin.demo@reddonaciones.local'
}

// Recursos externos que pueden fallar sin que sea culpa de la app (fuentes, mapas, Firebase).
const RUIDO_CONSOLA = /fonts\.(googleapis|gstatic)|firebase|googleapis|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|favicon/i

// Igual que App.css: debajo de 641px la barra superior se oculta y aparece la inferior.
function esMovil(page) {
    return page.viewportSize().width < 641
}

// Debajo de cierto ancho los filtros del inicio pasan a un menú lateral.
async function abrirFiltrosSiHaceFalta(page) {
    const boton = page.getByRole('button', { name: '≡ Filtros' })
    if (await boton.isVisible()) await boton.click()
}

async function cerrarFiltrosSiHaceFalta(page) {
    const cerrar = page.getByRole('button', { name: 'Cerrar filtros' })
    if (await cerrar.isVisible()) await cerrar.click()
}

// Las observaciones no hacen fallar la prueba; terminan en resultados/observaciones.md
function observar(testInfo, pantalla, texto, severidad = 2) {
    testInfo.annotations.push({ type: 'observacion', description: `S${severidad} | ${pantalla} | ${texto}` })
}

function medir(testInfo, nombre, ms) {
    testInfo.annotations.push({ type: 'medicion', description: `${nombre} | ${Math.round(ms)} ms` })
}

function vigilarConsola(page) {
    const errores = []
    page.on('pageerror', (e) => errores.push(`Excepción JS: ${e.message}`))
    page.on('console', (m) => {
        // Los 4xx los provocan las validaciones del propio recorrido; los 5xx se capturan abajo.
        if (m.type() === 'error' && !RUIDO_CONSOLA.test(m.text()) && !/Failed to load resource/.test(m.text())) errores.push(m.text())
    })
    page.on('response', (r) => {
        const url = r.url()
        if (r.status() >= 500 && url.includes('/api/')) errores.push(`HTTP ${r.status()} en ${url.replace(/^https?:\/\/[^/]+/, '')}`)
    })
    return errores
}

async function revisarConsola(testInfo, errores, pantalla = 'General') {
    for (const e of new Set(errores)) {
        observar(testInfo, pantalla, `Error en consola: ${e.slice(0, 160)}`, 2)
    }
}

async function iniciarSesion(page, rol) {
    await page.goto('/login')
    await page.locator('#login-correo').fill(USUARIOS[rol])
    await page.locator('#login-password').fill(PASSWORD_DEMO)
    await page.locator('.auth-submit-btn').click()
    await expect(page).not.toHaveURL(/\/login/)
}

// En escritorio la navegación está arriba y en móvil en la barra inferior.
function navegacion(page) {
    return esMovil(page) ? page.locator('.bottom-nav') : page.locator('.top-nav')
}

async function cerrarSesion(page, testInfo) {
    const boton = esMovil(page)
        ? page.locator('.bottom-nav .nav-item', { hasText: 'Salir' })
        : page.getByRole('button', { name: 'Cerrar sesión' })
    await expect(boton).toBeVisible()
    const dentro = await estaDentroDePantalla(boton)
    expect.soft(dentro, 'El botón para cerrar sesión debe verse completo en la pantalla').toBe(true)
    if (!dentro) {
        observar(testInfo, 'Navegación', `El botón para cerrar sesión queda cortado fuera de la pantalla (${page.viewportSize().width}px)`, 3)
    }
    await boton.click({ force: !dentro })
    await expect(page).toHaveURL(/\/(login|home)?$|\/login/)
}

async function estaDentroDePantalla(locator) {
    return locator.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return r.left >= -1 && r.right <= window.innerWidth + 1
    })
}

async function esperarCarga(page) {
    await page.waitForLoadState('domcontentloaded')
    await page.locator('.spinner, .dp-spinner, .skeleton-row').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
    // Espera a que terminen las transiciones (por ejemplo, el menú de filtros al cerrarse).
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
}

// En móvil la barra inferior fija puede quedar encima del botón; se centra antes de tocarlo, como haría la persona.
// Si aun así el navegador no lo deja tocar (pasa cuando la página es más ancha que la pantalla), se anota y se sigue.
async function tocar(locator, testInfo, pantalla) {
    await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    try {
        await locator.click({ timeout: 5000 })
    } catch {
        if (testInfo) observar(testInfo, pantalla, 'Un botón no se pudo tocar con normalidad: otro elemento queda encima en la zona del toque', 3)
        await locator.evaluate((el) => el.click())
    }
}

// Revisión común a todas las pantallas: desbordes, controles cortados, etiquetas y tamaño táctil.
async function revisarPantalla(page, testInfo, pantalla) {
    await esperarCarga(page)
    const ancho = page.viewportSize().width

    const datos = await page.evaluate((ancho) => {
        const visible = (el) => {
            const r = el.getBoundingClientRect()
            const s = getComputedStyle(el)
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
        }
        const enScrollHorizontal = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                const ox = getComputedStyle(p).overflowX
                if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth) return true
            }
            return false
        }
        const nombre = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.name || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)

        const interactivos = [...document.querySelectorAll('button, a[href], input, select, textarea')]
            .filter((el) => el.type !== 'hidden' && visible(el))

        const cortados = interactivos
            .filter((el) => {
                // Solo los que quedan a medias; un menú lateral cerrado queda completo fuera de la pantalla.
                const r = el.getBoundingClientRect()
                const aMedias = (r.left < ancho - 4 && r.right > ancho + 2) || (r.left < -2 && r.right > 4)
                // La barra inferior se revisa aparte, al cerrar sesión.
                return aMedias && !enScrollHorizontal(el) && !el.closest('.bottom-nav')
            })
            .map(nombre)

        const sinEtiqueta = [...document.querySelectorAll('input, select, textarea')]
            .filter((el) => el.type !== 'hidden' && el.type !== 'file' && visible(el))
            .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.title)
            .map((el) => el.placeholder || el.name || (el.tagName === 'SELECT' ? `selector "${el.options[el.selectedIndex]?.text || ''}"` : el.type))

        const pequenos = interactivos
            .filter((el) => el.tagName !== 'INPUT' || ['checkbox', 'radio'].includes(el.type))
            .filter((el) => !el.closest('.bottom-nav'))
            .filter((el) => {
                const r = el.getBoundingClientRect()
                return (r.height < 24 || r.width < 24) && r.width > 2 && r.height > 2
            })
            .map((el) => nombre(el).replace(/#\d+/, '#N'))

        // En móvil, si algo es más ancho que la pantalla el navegador agranda el viewport de diseño
        // (innerWidth) en vez de mostrar scroll, así que se compara contra el ancho real del dispositivo.
        const masAncho = [...document.querySelectorAll('body *')]
            .filter((el) => getComputedStyle(el).position !== 'fixed' && el.getBoundingClientRect().right > ancho + 2)
            .filter((el) => !el.closest('.hf-sidebar, .admin-table-wrap'))
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)

        return {
            desborde: Math.max(document.documentElement.scrollWidth, window.innerWidth) - ancho,
            masAncho: [...new Set(masAncho)].slice(0, 4),
            cortados: [...new Set(cortados)],
            sinEtiqueta: [...new Set(sinEtiqueta)],
            pequenos: [...new Set(pequenos)]
        }
    }, ancho)

    expect.soft(datos.desborde, `${pantalla}: la página es ${datos.desborde}px más ancha que la pantalla (${datos.masAncho.join(', ')})`).toBeLessThanOrEqual(1)
    expect.soft(datos.cortados, `${pantalla}: botones o campos cortados fuera de la pantalla`).toEqual([])

    if (datos.sinEtiqueta.length) {
        observar(testInfo, pantalla, `Campos sin etiqueta asociada (lectores de pantalla no los anuncian): ${datos.sinEtiqueta.slice(0, 6).join(', ')}`, 2)
    }
    if (esMovil(page) && datos.pequenos.length) {
        observar(testInfo, pantalla, `Elementos táctiles de menos de 24 px: ${datos.pequenos.slice(0, 6).join(', ')}`, 1)
    }

    // En móvil la barra inferior es fija: lo último de la página no debe quedar debajo de ella.
    if (esMovil(page)) {
        const tapado = await page.evaluate(async () => {
            const nav = document.querySelector('.bottom-nav')
            if (!nav) return null
            window.scrollTo(0, document.documentElement.scrollHeight)
            await new Promise((r) => setTimeout(r, 250))
            const dentroDeFijo = (el) => {
                for (let p = el; p && p !== document.body; p = p.parentElement) {
                    if (getComputedStyle(p).position === 'fixed') return true
                }
                return false
            }
            // El último control de la página (no los de modales o menús fijos).
            const ultimo = [...document.querySelectorAll('main button, main a[href], main input, main select')]
                .filter((el) => el.getBoundingClientRect().height > 0 && !dentroDeFijo(el))
                .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
            let resultado = 0
            if (ultimo) {
                const r = ultimo.getBoundingClientRect()
                const encima = document.elementFromPoint(r.left + r.width / 2, Math.min(r.bottom - 2, window.innerHeight - 1))
                if (encima && nav.contains(encima)) resultado = Math.round(r.bottom - nav.getBoundingClientRect().top)
            }
            window.scrollTo(0, 0)
            return resultado
        })
        expect.soft(tapado, `${pantalla}: la barra inferior tapa ${tapado}px del último control`).toBeFalsy()
    }

    await testInfo.attach(`${pantalla} (${ancho}px)`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
    })
    return datos
}

// Revisa que Escape cierre el modal; si no, lo cierra con el botón indicado.
async function revisarEscape(page, testInfo, pantalla, modal, botonCerrar) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await modal.isVisible()) {
        observar(testInfo, pantalla, 'El modal no se cierra con la tecla Escape', 1)
        await botonCerrar.click()
    }
    await expect(modal).toBeHidden()
}

// El foco del teclado debe notarse (borde, sombra o contorno distinto al estado normal).
async function focoVisible(locator) {
    const estilo = () => locator.evaluate((el) => {
        const s = getComputedStyle(el)
        return [s.outlineStyle, s.outlineWidth, s.boxShadow, s.borderColor].join('|')
    })
    await locator.evaluate((el) => el.blur())
    const normal = await estilo()
    await locator.focus()
    const enfocado = await estilo()
    return normal !== enfocado
}

async function tokenDe(request, rol) {
    const r = await request.post('/api/login', { data: { correo: USUARIOS[rol], password: PASSWORD_DEMO } })
    expect(r.ok()).toBeTruthy()
    return (await r.json()).token
}

function sufijoUnico(testInfo) {
    const letras = 'abcdefghijklmnopqrstuvwxyz'
    let n = Date.now()
    let s = ''
    while (n > 0) { s = letras[n % 26] + s; n = Math.floor(n / 26) }
    return `${testInfo.project.name.replace(/[^a-z]/gi, '')}${s}`.toLowerCase()
}

module.exports = {
    USUARIOS,
    PASSWORD_DEMO,
    esMovil,
    abrirFiltrosSiHaceFalta,
    cerrarFiltrosSiHaceFalta,
    observar,
    medir,
    vigilarConsola,
    revisarConsola,
    iniciarSesion,
    navegacion,
    cerrarSesion,
    estaDentroDePantalla,
    esperarCarga,
    tocar,
    revisarPantalla,
    revisarEscape,
    focoVisible,
    tokenDe,
    sufijoUnico
}

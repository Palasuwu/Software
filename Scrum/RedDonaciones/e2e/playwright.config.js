const { defineConfig, devices } = require('@playwright/test')

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

// Estos recorridos crean donaciones y usuarios, así que solo corren contra el entorno local.
const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(baseURL)
if (!esLocal && process.env.E2E_PERMITIR_REMOTO !== '1') {
    throw new Error(`E2E_BASE_URL apunta a ${baseURL}. Los recorridos escriben datos: usar solo el docker local.`)
}

module.exports = defineConfig({
    testDir: './recorridos',
    testMatch: '**/*.e2e.js',
    // Uno a la vez: los tres roles comparten la misma base de datos.
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 120_000,
    expect: { timeout: 10_000 },
    outputDir: 'test-results',
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'reporte' }],
        ['./soporte/reporter-observaciones.js', { carpeta: 'resultados' }]
    ],
    use: {
        baseURL,
        locale: 'es-GT',
        timezoneId: 'America/Guatemala',
        acceptDownloads: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    projects: [
        // Motores que descarga Playwright (npm run instalar-navegadores).
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },

        // Navegadores instalados en la computadora (Windows trae Edge; Chrome si está instalado).
        { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
        { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },

        // Tablet, para revisar formularios y tablas en una pantalla más angosta.
        { name: 'ipad', use: { ...devices['iPad (gen 7)'] } }
    ]
})

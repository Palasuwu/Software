# Recorridos de usabilidad y compatibilidad (Playwright)

Pruebas de extremo a extremo que recorren la aplicación como lo haría cada perfil (donante, intermediario y administrador) en navegadores reales de escritorio y en tablet.

Las pruebas de `frontend/src/test` (Vitest) corren en jsdom, que no es un navegador. Estas pruebas no las reemplazan: abren la aplicación de verdad, con el backend y MySQL corriendo.

## Qué revisa cada pantalla

- **Funcionalidad del recorrido**: formularios, tablas, filtros, botones, modales y mensajes de éxito o error.
- **Compatibilidad** (hace fallar la prueba):
  - que no haya scroll horizontal en la página;
  - que ningún botón o campo quede cortado fuera de la pantalla;
  - que la barra inferior (pantallas angostas) no tape el último control;
  - que el botón de cerrar sesión se vea completo.
- **Usabilidad** (se anota como observación, no hace fallar):
  - campos sin etiqueta asociada;
  - elementos táctiles de menos de 24 px;
  - modales que no se cierran con Escape;
  - foco del teclado poco visible;
  - mensajes de error poco claros;
  - errores de JavaScript o respuestas 5xx.

Cada pantalla adjunta una captura completa al reporte HTML.

## Navegadores y dispositivos

| Proyecto | Motor | Pantalla |
|---|---|---|
| `chromium` | Chromium | Escritorio 1280×720 |
| `firefox` | Firefox | Escritorio 1280×720 |
| `webkit` | WebKit (motor de Safari) | Escritorio 1280×720 |
| `edge` | Microsoft Edge instalado en la computadora | Escritorio 1280×720 |
| `chrome` | Google Chrome instalado en la computadora | Escritorio 1280×720 |
| `ipad` | WebKit | iPad 7.ª gen. (810 px) |

## Cómo correrlas

1. Levantar la aplicación con los datos de ejemplo, desde `Scrum/RedDonaciones`:

   ```bash
   docker compose up --build
   ```

   Los recorridos usan las cuentas de `db/datos.sql` (contraseña `demo123`). Si la base ya tiene otros datos, se pueden cambiar con `E2E_DONANTE`, `E2E_INTERMEDIARIO`, `E2E_ADMIN` y `E2E_PASSWORD`.

2. Instalar una sola vez, desde esta carpeta (`Scrum/RedDonaciones/e2e`):

   ```bash
   npm install
   npm run instalar-navegadores
   ```

3. Correr las pruebas:

   ```bash
   npm test                  # todos los navegadores y dispositivos
   npm run test:escritorio   # chromium, firefox, webkit, edge y chrome
   npm run test:tablet       # ipad
   npm run test:rapido       # solo chromium
   npx playwright test --project=firefox recorridos/donante.e2e.js
   ```

   Si Chrome no está instalado, el proyecto `chrome` falla al abrir; los demás corren igual.

4. Ver los resultados:
   - `resultados/observaciones.md`: matriz de compatibilidad, fallas, registro de observaciones (con columnas de corrección y estado) y tiempos medidos.
   - `npm run reporte`: abre el reporte HTML con las capturas de cada pantalla.

## Importante

- Los recorridos **escriben datos**: registran una cuenta de donante, crean donaciones, cambian su estado y crean y desactivan un usuario. Cada corrida usa correos únicos, pero los registros se acumulan en la base local. Para volver a los datos de ejemplo: `docker compose down -v` y luego `docker compose up --build`.
- Por eso la configuración se niega a correr si `E2E_BASE_URL` no es `localhost`. **No correrlas contra producción.**
- Corren de una en una (`workers: 1`) porque los tres perfiles comparten la misma base.

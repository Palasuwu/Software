# Convenciones de Frontend

## Contexto

Este documento describe cómo quedó organizado el frontend después del refactor de SCRUM-145/146/147 (limpieza de código muerto, división de componentes y CSS en archivos más chicos, y centralización de colores en `tokens.css`). Sirve como guía para saber dónde poner código nuevo sin tener que adivinar ni preguntar.

---

## 1. Estructura de carpetas

```
frontend/src/
  main.jsx                 # punto de entrada, importa App.css y tokens.css
  App.jsx                  # router raíz (~15 líneas)
  AppShell.jsx             # header animado + NavBar + BottomNav + <AppRoutes/>
  AppRoutes.jsx             # árbol de <Routes>
  App.css                  # CSS base compartido (reset, shell, header/nav, .form-*/.btn-*, spinner/error/toast/skeleton, animaciones globales)
  tokens.css                # ÚNICA fuente de colores del proyecto

  context/
    AuthContext.jsx        # sesión, login/logout, listeners de auth:unauthorized/forbidden

  components/
    icons.jsx               # todos los íconos SVG, named exports
    BottomNav.jsx, ProtectedRoute.jsx, NavBar.jsx, DonationCard.jsx, ErrorView.jsx, Spinner.jsx, HomeFilterSidebar.jsx

  pages/
    LandingPage.jsx / .css
    AuthPage.jsx / .css
    HomePage.jsx / .css
    DetailPage.jsx / .css
    DonationHistoryDetailPage.jsx, MisDonacionesPage.jsx, MisDonaciones.css   (compartido por ambas)
    OrganizacionesPage.jsx, OrgaDetailPage.jsx, Organizaciones.css            (compartido por ambas)
    PerfilPage.jsx / .css
    AdminPanel.jsx          # contenedor/orquestador del panel admin
    OrgaPanel.jsx            # contenedor/orquestador del panel de organización

    admin/
      adminForms.js          # *_INITIAL_FORM, validate*, build*Payload (funciones puras)
      adminHelpers.js         # roleLabel, campaignStatusLabel, formatDate, getProgress
      AdminModal.jsx, ConfirmationModal.jsx, SkeletonRows.jsx, UserFormFields.jsx
      AdminUsersTable.jsx, AdminOrgsTable.jsx, AdminCampaignsTable.jsx
      UserFormModal.jsx, OrgFormModal.jsx, CampaignFormModal.jsx, TempPasswordModal.jsx
      admin-panel.css         # estilos del panel admin Y del panel de organización

    orga/
      OrgaCampaignsTable.jsx, OrgaCampaignFormModal.jsx, OrgaIntermediariosTable.jsx

  utils/    # api.js, session.js
  assets/   # imágenes, video, SVG decorativos
```

### Por qué cada carpeta existe

| Carpeta | Responsabilidad |
|---|---|
| `components/` | Piezas de UI reutilizables en más de una página (íconos, nav, tarjetas). Si algo solo lo usa una página, no va aquí. |
| `context/` | Estado verdaderamente global (hoy solo la sesión). No se crean contexts nuevos "por si acaso" — solo cuando el prop-drilling se vuelve el problema real. |
| `pages/` | Una página = un `.jsx` (+ su `.css` si tiene estilos propios), colocados juntos. |
| `pages/admin/` y `pages/orga/` | Subcomponentes (tablas, modales, formularios) que solo tienen sentido dentro del panel admin o del panel de organización. Minúsculas para no mezclar con las páginas de nivel superior. |
| `utils/` | Funciones puras de acceso a datos (`api.js`) o `localStorage` (`session.js`), sin JSX ni estado de React. |

---

## 2. ¿Dónde va esto? — Guía de decisión

**Quiero agregar una página nueva.**
Crear `pages/NombrePage.jsx` + `pages/NombrePage.css` (si necesita estilos propios) en la misma carpeta. Registrar la ruta en `AppRoutes.jsx`. Si necesita ítem de navegación, agregarlo en `NavBar.jsx` (y el ícono en `components/icons.jsx` si es nuevo).

**Quiero agregar una función nueva dentro del panel de administrador.**
- ¿Es validación o formato puro (sin JSX, sin estado)? → `pages/admin/adminForms.js` o `adminHelpers.js`.
- ¿Es una tabla o modal nuevo? → componente propio en `pages/admin/`, importado y orquestado desde `AdminPanel.jsx` (que sigue siendo el único que maneja `useState`/`useEffect`/llamadas a la API de esa pantalla).
- Nunca meter un `fetch`/`apiGet` dentro de un componente de presentación (tabla, modal) — esos reciben datos y callbacks por props.

**Quiero agregar un ícono nuevo.**
Siempre en `components/icons.jsx`, como export nombrado que recibe `className` por prop. Nunca un `<svg>` inline dentro de un `.jsx` de página.

**Quiero agregar o cambiar un color.**
**Solo en `tokens.css`.** Nunca un `#hex` o `rgb()`/`rgba()` nuevo en ningún otro archivo del proyecto. Si el color es para una página específica, igual se declara como token en `tokens.css` y se consume con `var(--nombre-del-token)` desde el CSS de esa página. Ver la sección 5 para el detalle de por qué.

**Quiero compartir lógica entre dos páginas o paneles.**
Si es 100% idéntica hoy, extraerla a un helper compartido (mismo patrón que `adminHelpers.js`, usado tanto por `AdminPanel.jsx` como por `OrgaPanel.jsx`). Si es "parecida pero no igual" (por ejemplo, las tablas de campañas de Admin y Orga tienen columnas distintas), mantenerla duplicada explícitamente antes que forzar un componente parametrizado con `if`s — sin una suite de tests, ese tipo de abstracción es más riesgo que beneficio.

**Necesito saber si el usuario está logueado o cuál es su rol.**
Consumir `useAuth()` de `context/AuthContext.jsx`. Nunca leer `localStorage` directamente desde un componente nuevo.

---

## 3. Convención de nombres

- Componentes: `PascalCase`, un componente por archivo, mismo nombre de archivo que el componente exportado.
- CSS de página: mismo nombre base que su `.jsx` (`PerfilPage.jsx` → `PerfilPage.css`), colocado en la misma carpeta — nunca en una carpeta `styles/` separada.
- Helpers/funciones puras: `camelCase`, agrupados por dominio en archivos descriptivos (`adminForms.js`, `adminHelpers.js`) en vez de un `utils.js` genérico donde todo termina mezclado.
- Tokens de color: `--dominio-variante` (ej. `--badge-campaign-active-bg`, `--status-verified-border`) — el nombre debe decir a qué pertenece el color, no solo describir el color.

---

## 4. Convención de comentarios

- Cada archivo nuevo lleva **1-3 líneas al inicio** describiendo su responsabilidad (qué hace y, si aplica, quién lo consume). Ejemplo real, `pages/admin/adminHelpers.js`:
  ```js
  // Funciones de formato y cálculo compartidas entre AdminPanel y OrgaPanel.
  // No mueve estado ni hace llamadas a la API.
  ```
- Comentarios inline **solo donde el porqué no es obvio** — una decisión no evidente, una restricción externa, un workaround. No se comenta código que ya se explica solo.
- Se prefiere un nombre explícito (`onToggleActiveUser`) antes que un nombre corto (`onToggle`) + un comentario aclarando qué hace.
- No se escriben docstrings largos ni bloques de comentario multi-párrafo. Una o dos líneas es el estándar.

---

## 5. Principios de ingeniería de software aplicados

### Responsabilidad única (SRP)
Cada archivo tiene un solo motivo para cambiar. `adminForms.js` cambia solo si cambia una validación; `AdminUsersTable.jsx` cambia solo si cambia cómo se ve la tabla de usuarios; `AdminPanel.jsx` cambia solo si cambia el flujo de datos entre pestañas. Antes del refactor, `AdminPanel.jsx` tenía 1729 líneas mezclando las tres cosas a la vez.

### Contenedor + componentes de presentación
Los contenedores (`AdminPanel.jsx`, `OrgaPanel.jsx`, `AppShell.jsx`) son los únicos que manejan `useState`/`useEffect`/llamadas a la API. Todo lo demás (tablas, modales, formularios) recibe datos y callbacks por props y no sabe de dónde vienen. Ejemplo: `AdminUsersTable.jsx` recibe `{ usuarios, loadingUsers, onEdit, onToggleActive }` — nunca hace su propio `fetch`.

### DRY sin sobre-abstracción
Se comparte lo que es *literalmente idéntico* hoy (`adminHelpers.js`, `components/icons.jsx`, `SkeletonRows.jsx`). Lo que se parece pero no es igual —por ejemplo, la tabla de campañas de `AdminPanel` tiene columna "Organización" sin botón editar, mientras que la de `OrgaPanel` tiene "Artículo" con botón editar— se mantiene deliberadamente duplicado en `pages/admin/AdminCampaignsTable.jsx` y `pages/orga/OrgaCampaignsTable.jsx`. Forzar un solo componente parametrizado ahí sería más frágil que las ~100 líneas repetidas.

### Una sola fuente de verdad para colores
`tokens.css` es el único archivo del proyecto donde puede existir un valor de color literal (`#hex`, `rgb()`, `rgba()`). Todos los demás archivos CSS —el `App.css` base y cada `.css` de página— solo consumen color vía `var(--token)`. Esto es lo que permite cambiar, por ejemplo, el verde primario de toda la app en una sola línea de `tokens.css` y verlo reflejado en Landing, Auth, Admin, Perfil y el resto de páginas a la vez, sin importar en cuántos archivos físicos esté repartido el CSS.

Una consecuencia de esta regla: colores que a simple vista se ven parecidos pero pertenecen a dominios distintos **no se fusionan en el mismo token**. Los badges de estado de organización (`--status-verified-*`), los de estado de campaña (`--badge-campaign-active-*`) y los de rol de usuario (`--role-*`) tienen cada uno su propio token aunque compartan tonos de verde — así un cambio en uno no afecta a los otros por accidente.

---

## 6. Hallazgos pendientes

Estos puntos se detectaron durante el refactor de SCRUM-145/146/147 pero quedaron **fuera de alcance** porque no eran parte de esos tickets (mover/dividir código y centralizar colores, sin cambiar comportamiento ni corregir bugs funcionales). Quedan documentados aquí para no perderse como contexto de futuros tickets:

1. **`OrgaPanel.jsx` no tiene campo de subida de imagen** en su formulario de campaña, aunque `CAMP_INITIAL_FORM` incluye `imagen_url` y el backend lo soporta.
2. **`AuthPage.jsx` usa `fetch` nativo** en vez de `utils/api.js` (`apiPost`), por lo que no dispara el evento `auth:unauthorized` centralizado que sí usa el resto de la app.
3. **Locale de fechas inconsistente**: `AdminPanel.jsx`/`OrgaPanel.jsx`/`DonationCard.jsx` usan `es-GT`; `MisDonacionesPage.jsx`/`DonationHistoryDetailPage.jsx` usan `es-CO`.
4. **Doble definición de `.org-status` con cascada silenciosa** (ya corregido durante SCRUM-146): existían dos bloques CSS distintos para las mismas clases `.org-status-*`, uno pensado para el directorio de organizaciones y otro para el detalle. Como ambos usaban el mismo nombre de clase sin ningún scope adicional, el segundo tapaba por completo al primero via cascada — el primero nunca se veía en pantalla. Se eliminó el bloque tapado por ser código muerto comprobado (cero efecto visual), pero es un patrón a vigilar: **si dos páginas necesitan la misma clase con estilos distintos, hay que darles un selector distinto o un modificador**, no repetir el nombre esperando que "el que está más abajo en el archivo gane".
5. **El "banner" de sección `estado-*` (badges de campaña) vivía en `App.css`** en vez de en `MisDonaciones.css`, aunque solo lo consumen `MisDonacionesPage.jsx` y `DonationHistoryDetailPage.jsx`. Se movió durante SCRUM-146 junto con la tokenización de sus colores, siguiendo la regla de colocación de este documento.

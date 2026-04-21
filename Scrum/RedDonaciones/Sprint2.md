# Sprint 2 — Red de Donaciones

Branch: `Jorge-Palacios-Sprint2` (git no permite espacios en nombres de rama, por lo que se usó guion medio en lugar de espacios).

Cada uno de los 5 commits corresponde exactamente a una tarea SCRUM. A continuación se detalla qué tecnologías y librerías se usaron en cada push. Todas las dependencias ya estaban en el proyecto (Flask + React + MySQL + bcrypt); no se introdujeron frameworks nuevos.

---

## SCRUM-42 — Conectar registro frontend-backend
**Commit:** `SCRUM-42: Conectar registro frontend-backend`

**Backend (Flask / Python)**
- `Flask` + `flask_cors` — registro del blueprint `organizacion_bp` y expose del header `Authorization`.
- `python-os` (stdlib) — para leer `SECRET_KEY` desde variables de entorno.

**Frontend (React / Vite / JavaScript)**
- `React` + `react-router-dom` — páginas `RegisterPage.jsx` y `LoginPage.jsx` con validación cliente.
- `fetch` nativo encapsulado en `src/api/client.js` (helper con manejo de `Authorization: Bearer` y errores JSON).
- `Vite` — nuevo proxy de desarrollo `/api -> backend:5001` en `vite.config.js` para espejar `nginx.conf`.
- `localStorage` — persistencia de token y usuario entre recargas.

**Archivos clave:** `.gitignore`, `backend/app.py`, `frontend/vite.config.js`, `frontend/package-lock.json`, `frontend/src/api/client.js`, `frontend/src/pages/RegisterPage.jsx`, `frontend/src/pages/LoginPage.jsx`.

---

## SCRUM-43 — Implementar hash contraseñas
**Commit:** `SCRUM-43: Implementar hash contraseñas`

**Backend (Flask / Python)**
- `bcrypt` (ya presente en `requirements.txt`) — `bcrypt.hashpw(password, gensalt())` al registrar y `bcrypt.checkpw()` al iniciar sesión.
- `re` (stdlib) — `backend/validators.py` con `validar_password` (≥ 8 caracteres, al menos una letra y un dígito) y `validar_correo`.
- `routes/usuario.py` ahora rechaza passwords que no estén hasheados con prefijo `$2` (bcrypt), normaliza correos a minúsculas y verifica duplicados antes del insert.

**Archivos clave:** `backend/validators.py`, `backend/routes/usuario.py`.

---

## SCRUM-66 — Notificaciones básicas
**Commit:** `SCRUM-66: Notificaciones básicas`

**Frontend (React / CSS)**
- `React Context API` (`createContext` + `useContext`) — `NotificationContext` expone `success`, `error`, `warning`, `info`, `dismiss`.
- `setTimeout` / `useRef` — auto-dismiss a los 5 segundos, con `clearTimeout` al desmontar.
- Componente `Toaster.jsx` con `role="status"` y `aria-live="polite"` para accesibilidad.
- `App.css` extendido con estilos para `.toaster`, `.toast`, variantes `.toast-success/.toast-error/.toast-warning/.toast-info` y animación `@keyframes toast-in`.

**Archivos clave:** `frontend/src/context/NotificationContext.jsx`, `frontend/src/components/Toaster.jsx`, `frontend/src/App.css`.

---

## SCRUM-70 — Logout usuario
**Commit:** `SCRUM-70: Logout usuario`

**Frontend (React Context)**
- `AuthContext` — método `logout()` que llama al endpoint autenticado `/api/logout`, limpia `localStorage`, resetea el estado y permite redirigir a `/login`.
- `App.jsx` — botones "Salir" en la navegación superior y en `PerfilPage`, ambos conectados al `logout()` del contexto y al `notify.info('Sesion cerrada')` del sistema de notificaciones.

**Archivos clave:** `frontend/src/context/AuthContext.jsx`, `frontend/src/App.jsx`.

---

## SCRUM-71 — Middleware de autenticación
**Commit:** `SCRUM-71: Middleware de autenticación`

**Backend (Flask / Python)**
- `itsdangerous.TimedSerializer` (dependencia transitiva de Flask, no requiere instalación nueva) — firma/verificación de tokens con expiración configurable vía `AUTH_TOKEN_MAX_AGE` y firma con `AUTH_SECRET_KEY`.
- `functools.wraps` (stdlib) — decorador `token_required` que extrae `Authorization: Bearer <token>`, valida firma y expiración, adjunta `request.user` / `request.token` y responde 401 en fallos.
- Lista en memoria de tokens revocados (`_revoked_tokens`) usada por `revoke_token` desde el endpoint `/logout`.
- Rutas sensibles de `routes/publicacion.py` (`POST /publicaciones`, `POST /donaciones`) ahora decoradas con `@token_required`.

**Frontend (React Router)**
- `ProtectedRoute.jsx` — componente de guardia que usa `useAuth` y `<Navigate>` de `react-router-dom` para redirigir al login preservando `location.from`.

**Archivos clave:** `backend/auth.py`, `backend/routes/publicacion.py`, `frontend/src/components/ProtectedRoute.jsx`, `documentation/Sprint2.md`.

---

## Stack completo usado (sin dependencias nuevas)

| Capa | Tecnología |
|------|------------|
| Backend | Python 3 + Flask, flask_cors, bcrypt, mysql-connector-python, itsdangerous (transitiva de Flask) |
| Base de datos | MySQL 8 (`db/init.sql`) |
| Frontend | React 18, react-router-dom 6, Vite 5 |
| Infraestructura | Docker Compose (db + backend + frontend), Nginx (proxy `/api`) |

## Cómo probar
```bash
docker compose up --build
# Frontend en http://localhost:3000, backend en http://localhost:5001
```
Flujo recomendado: registrar un usuario desde `/registro`, cerrar sesión desde el perfil, volver a iniciar en `/login`. Las notificaciones deben aparecer en la esquina superior derecha y desaparecer solas a los 5s.

## Resultados de pruebas end-to-end (Docker)

Pruebas corridas contra los contenedores (`backend` en `http://localhost:5001`, `frontend` en `http://localhost:3000`) el 2026-04-21.

| # | Caso | Resultado |
|---|------|-----------|
| 1 | `GET /` backend | 200 |
| 2 | `GET /publicaciones` | 200 (2 registros) |
| 3 | `POST /usuarios` con password débil (`"abc"`) | 400 — `"El password debe tener al menos 8 caracteres"` |
| 4 | `POST /usuarios` válido (`Secreto123`) | 201 + `token` + `usuario` |
| 5 | `POST /usuarios` correo/teléfono duplicado | 409 — `"El correo o el telefono ya estan registrados"` |
| 6 | `POST /login` con password incorrecto | 401 — `"Credenciales invalidas"` |
| 7 | `POST /login` correcto (bcrypt `checkpw`) | 200 + token |
| 8 | `GET /me` sin `Authorization` | 401 — `"Token de autenticacion requerido"` |
| 9 | `GET /me` con `Bearer <token>` | 200 + payload del usuario |
| 10 | `POST /logout` con token válido | 200 — `"Sesion cerrada"` |
| 11 | `GET /me` reutilizando token revocado | 401 — `"Token invalido o expirado"` |
| 12 | `POST /donaciones` sin token (ruta protegida) | 401 (middleware bloquea) |
| 13 | Frontend SPA `/`, `/login`, `/registro` | 200 |

Todos los casos pasan. El frontend se construye sin warnings (`vite build` ✓ 43 módulos) y el backend compila los 6 módulos Python sin errores.

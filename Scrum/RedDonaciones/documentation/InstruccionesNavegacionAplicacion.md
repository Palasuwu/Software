# Navegación — Red de Donaciones

Este archivo explica cómo usar y probar la navegación implementada.

## Rutas disponibles
- `/` → Homepage (vista prototipo existente)
- `/index` → Placeholder para `index`
- `/login` → Placeholder para `Inicio de Sesión`
- `/perfil` → Placeholder para `Perfil`
- `/donaciones` → Placeholder para `Mis Donaciones`

## Requisitos
- Node.js y npm (solo para modo desarrollo)
- Docker / Docker Compose

## Usando Vite (opcional)
Desde la carpeta del frontend:

```bash
cd Scrum/RedDonaciones/frontend
npm install
npm run dev
```

Luego abrir en el navegador la URL que indique Vite (por defecto `http://localhost:5173`). Navega a las rutas listadas arriba.

## Usando Docker
En la raíz del proyecto:

```bash
cd Scrum/RedDonaciones
docker compose up --build
```
El frontend quedará disponible en `http://localhost:3000`.

## Añadir/Probar vistas
- Para implementar las vistas reales, se crean componentes en `frontend/src/pages/` y se reemplazan los `Placeholder` en las rutas por los componentes reales.
- Ejemplo: reemplazar `element={<Placeholder title="Perfil" />}` por `element={<Perfil />}` e importar `Perfil`.

## Notas
- La navegación usa `BrowserRouter`. En producción, Nginx está configurado para servir `index.html` en rutas no encontradas (`try_files ... /index.html`).
- Si se agregas rutas anidadas o rutas protegidas, considera usar `Navigate` para redirecciones y `Outlet` para layouts.

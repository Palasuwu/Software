# Navegación — Red de Donaciones

Este archivo explica cómo usar y probar la navegación implementada.

## Rutas disponibles
- `/` → Homepage (vista prototipo existente)
- `/index` → Placeholder para `index`
- `/login` → Placeholder para `Inicio de Sesión`
- `/perfil` → Placeholder para `Perfil`
- `/donaciones` → Vista real de `Mis Donaciones` (consume API con donante simulado)

## Requisitos
- Docker / Docker Compose

## Usando Docker
En la raíz del proyecto:

```bash
cd Scrum/RedDonaciones
docker compose up --build
```
El frontend quedará disponible en `http://localhost:3000`.
El backend quedará disponible en `http://localhost:5000`.

Para detener los servicios:

```bash
docker compose down
```

Para reiniciar también la base de datos desde cero (incluye recarga de `db/init.sql`):

```bash
docker compose down -v
docker compose up --build
```

## Añadir/Probar vistas
- Para implementar las vistas reales, se crean componentes en `frontend/src/pages/` y se reemplazan los `Placeholder` en las rutas por los componentes reales.
- Ejemplo: reemplazar `element={<Placeholder title="Perfil" />}` por `element={<Perfil />}` e importar `Perfil`.

## Notas
- La navegación usa `BrowserRouter`. En producción, Nginx está configurado para servir `index.html` en rutas no encontradas (`try_files ... /index.html`).
- Si se agregas rutas anidadas o rutas protegidas, considera usar `Navigate` para redirecciones y `Outlet` para layouts.

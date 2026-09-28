# Sprint 8 — Plan de trabajo de Rodrigo

Rama: `feature/sprint8-ubicaciones`. Base: `bf5c56c` de `origin/main`.
Las tres tareas asignadas no tienen descripción ni criterios adicionales en Jira.
El alcance se basa en sus títulos y en los endpoints de ubicaciones ya integrados por el equipo.

## Día 1 — Formularios de ubicación

- **SCRUM-206:** incorporar latitud y longitud opcionales al formulario administrativo y al perfil institucional de la organización. Cargar los valores al editar, validar el par y guardarlo mediante los endpoints existentes.
- **SCRUM-207:** permitir ubicación heredada de la organización o propia en los formularios de campañas de administrador e intermediario. Validar dirección y coordenadas y conservar la selección al editar.
- Verificar guardado, recarga, valores vacíos, cero, rangos inválidos y cambio entre ubicación propia y heredada. Ejecutar las pruebas relevantes y compilar el frontend.
- Commits: `Ubicacion en formulario de organizacion` y `Ubicacion en formulario de campañas`.
- Dejar la aplicación local disponible y ambos tickets en revisión para la validación de Rodrigo.

## Día 2 — Organización principal y datos reales

- **SCRUM-210:** revisar la configuración de la organización principal y aplicar los datos reales aprobados: identidad, contacto, ubicación e información institucional.
- Confirmar nombre, dirección, coordenadas, imágenes y textos con Rodrigo antes de reemplazar datos de demostración.
- Revisar cómo se reflejan los datos en la portada, el perfil y las campañas con ubicación heredada.
- Commit previsto: `Configuracion de organizacion principal`.

Cada commit se registra al terminar el trabajo, con su fecha real. El día 2 comienza cuando Rodrigo lo indique.
La vista pública de mapas (SCRUM-189) pertenece a Jorge; las pruebas generales de ubicación (SCRUM-203) pertenecen a Jorge Carlos. Las comprobaciones del día 1 validan únicamente estos formularios y su integración.

## Verificación del día 1 — 28 de septiembre

- Suite del frontend en Docker: 30 pruebas aprobadas, incluidas 17 nuevas de formularios de ubicación.
- Backend: 17 pruebas de validación/esquema aprobadas y 2 comprobaciones de los endpoints con la base local aprobadas.
- Compilación del frontend y arranque de frontend, backend y MySQL correctos; web y listado de publicaciones responden HTTP 200.
- Se aplicó a la base local la migración existente `asegurar_columnas_ubicacion`; faltaban las columnas de coordenadas. No se eliminaron datos.
- La prueba de login fallaba con el Node local por incompatibilidad de AbortSignal; pasó en el entorno Docker definido por el proyecto.
- Pendiente: revisión manual de Rodrigo con su sesión. Las pruebas de formularios utilizan API simulada; no sustituyen su revisión de guardado real desde el navegador.

### Dónde revisar

Abrir http://localhost:3000 e iniciar sesión con administrador o intermediario.
En administrador: Organizaciones → crear/editar, campos de latitud y longitud; Campañas → crear, selector de ubicación.
En intermediario: perfil institucional, coordenadas; campañas/publicaciones → crear/editar, ubicación de organización o propia.
Guardar y volver a editar para comprobar persistencia. Probar ambos campos vacíos, un solo campo lleno y latitud fuera de -90 a 90.
La ubicación propia exige dirección completa; las coordenadas siguen siendo opcionales. Si se omiten, el backend actual resuelve las coordenadas desde la organización.

Los cambios principales están en `CoordinatesFields.jsx`, `CampaignLocationFields.jsx`, `utils/ubicacion.js` y los formularios de `pages/admin/` y `pages/orga/`.
Los servicios quedan corriendo mediante Docker Compose. Esta entrega no incluye push ni merge; el día 2 continúa pendiente.

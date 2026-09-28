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

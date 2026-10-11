# Registro de intermediarios — tarea 15 del Sprint 9

Método seleccionado por el equipo: alta únicamente por administrador.

El formulario público muestra «Crear cuenta de donante», explica que el administrador verifica los datos y crea las cuentas de intermediarios, y dirige a los usuarios con credenciales al inicio de sesión existente. No ofrece selección de roles, organización ni cargo y siempre envía `rol: donante`. Se eliminó la consulta pública de organizaciones que solo servía al formulario anterior.

El alta administrativa mantiene sus campos y validaciones existentes. El campo cargo sigue disponible allí, conforme al documento del sprint, que deja su revisión pendiente. No se añadieron solicitudes pendientes ni estados de aprobación/rechazo porque este método usa alta administrativa directa.

El backend ya exige autorización de administrador para crear intermediarios. Se agregaron pruebas que comprueban rechazo sin token y con token de donante, y el alta por administrador únicamente con organización verificada. No hubo cambios en endpoints, permisos, modelos ni esquema de base de datos para esta tarea.

Validación: suite frontend completa (148 pruebas aprobadas); pruebas backend de usuarios y alta de intermediarios (10 aprobadas); compilación Vite correcta; revisión visual en Edge en escritorio de 1366 × 900 y móvil de 390 × 844, sin desbordamiento horizontal. La suite backend completa con MySQL se había ejecutado para la tarea anterior; para esta tarea se ejecutaron las pruebas específicas de autorización, sin modificar datos reales.

## Tarea 16: validación y autorización administrativa

Se evaluaron tres mecanismos: alta por administrador, solicitudes públicas pendientes con revisión y verificación por correo/teléfono. Se mantiene el alta únicamente por administrador seleccionada por el equipo: reutiliza el panel y los permisos existentes, no requiere nuevas tablas ni estados. La verificación de contacto por sí sola no prueba autorización para actuar como intermediario. El administrador revisa identidad, contacto y vínculo con la organización antes de guardar; guardar constituye la autorización. Si no autoriza a la persona, no crea su cuenta. No existe una bandeja de solicitudes pendientes ni un rechazo automático en este método.

### Controles implementados

- Se conserva la consulta del administrador activo en la base de datos para autorizar altas privilegiadas; un token con rol obsoleto no es suficiente.
- El registro rechaza tipos inválidos y asociaciones de organización booleanas, fraccionarias o no positivas; cargo entre 3 y 200 caracteres. Las contraseñas inválidas o mayores a 72 bytes se rechazan antes de bcrypt.
- Antes de insertar al usuario se comprueba que la organización exista y esté verificada. `FOR SHARE` conserva esta condición hasta finalizar la transacción. La cuenta y su asociación se guardan juntas mediante el commit existente; errores revierten la transacción.
- La edición de perfil rechaza intentos de cambiar el rol. Los permisos siguen consultando el usuario activo y la organización vigente.
- El panel advierte que crear un intermediario autoriza el acceso. La edición administrativa omite `id_organizacion`, cuyo envío previo bloqueaba el guardado; conserva cargo y datos personales.

### Verificación

Suite completa contra una base temporal dentro del contenedor existente `mysql_db` (MySQL 8.4.8): **364 pruebas aprobadas, 0 errores/fallos/omitidas**, en 44.16 segundos, incluyendo rendimiento. Se cargó el esquema y datos de ejemplo de `db/init.sql` en una base `sprint9_test_*`, eliminada al finalizar. No se modificó la base de trabajo `donaciones` ni se creó otro contenedor.

Las pruebas nuevas con MySQL comprueban alta autorizada, asociación guardada, login y acceso de intermediario, rechazo del alta desde un intermediario, rechazo de promoción por perfil y ausencia de cuentas parciales ante organización inexistente. Las pruebas unitarias cubren datos manipulados y administrador inactivo/inexistente/con rol distinto al token.

Frontend: **152 pruebas aprobadas** y compilación correcta. Revisión visual del formulario administrativo en escritorio y móvil, sin desbordamiento horizontal. Persisten avisos anteriores de JWT de pruebas y tamaño de bundle.

Evidencia: `backend-task16-output.txt`, `backend-task16-results.xml` y `frontend-task16-output.txt`.

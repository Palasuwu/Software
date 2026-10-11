# Registro de intermediarios — tarea 15 del Sprint 9

Método seleccionado por el equipo: alta únicamente por administrador.

El formulario público muestra «Crear cuenta de donante», explica que el administrador verifica los datos y crea las cuentas de intermediarios, y dirige a los usuarios con credenciales al inicio de sesión existente. No ofrece selección de roles, organización ni cargo y siempre envía `rol: donante`. Se eliminó la consulta pública de organizaciones que solo servía al formulario anterior.

El alta administrativa mantiene sus campos y validaciones existentes. El campo cargo sigue disponible allí, conforme al documento del sprint, que deja su revisión pendiente. No se añadieron solicitudes pendientes ni estados de aprobación/rechazo porque este método usa alta administrativa directa.

El backend ya exige autorización de administrador para crear intermediarios. Se agregaron pruebas que comprueban rechazo sin token y con token de donante, y el alta por administrador únicamente con organización verificada. No hubo cambios en endpoints, permisos, modelos ni esquema de base de datos para esta tarea.

Validación: suite frontend completa (148 pruebas aprobadas); pruebas backend de usuarios y alta de intermediarios (10 aprobadas); compilación Vite correcta; revisión visual en Edge en escritorio de 1366 × 900 y móvil de 390 × 844, sin desbordamiento horizontal. La suite backend completa con MySQL se había ejecutado para la tarea anterior; para esta tarea se ejecutaron las pruebas específicas de autorización, sin modificar datos reales.


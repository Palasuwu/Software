# Pruebas de Verificación - Sprint 7

Pruebas automatizadas implementadas durante el Sprint 7 en la branch `TestsVerificacion-Sprint7`, agrupadas por categoría funcional para Backend y Frontend.

---

## Categoría: Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas

Verifica que el sistema bloquee donaciones en campañas finalizadas, canceladas o con fecha límite vencida, tanto en la API como en la interfaz de usuario.

### Backend

**Archivo:** `Scrum/RedDonaciones/backend/tests/test_bloqueo_campanas_vencidas_finalizadas.py`

| Función de Test | Categoría | Lo que hace |
| :--- | :--- | :--- |
| `test_donacion_rechazada_campana_finalizada` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Verifica que el backend rechace con código 400 y mensaje correspondiente cualquier intento de donar a una campaña en estado finalizada, asegurando que no se inserte ningún registro en la base de datos. |
| `test_donacion_rechazada_campana_fecha_limite_vencida` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Verifica que si la fecha límite ya expiró, la donación sea rechazada con error 400 y el estado de la campaña se actualice automáticamente a "cancelada" en la base de datos. |
| `test_donacion_rechazada_campana_cancelada` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Comprueba que las donaciones dirigidas a campañas en estado cancelada sean denegadas con código 400 y el mensaje de bloqueo correspondiente. |
| `test_donacion_rechazada_meta_alcanzada_restante_cero` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Comprueba que si una campaña ya alcanzó su meta requerida (cupo restante en cero), se impida registrar nuevas donaciones considerándola finalizada. |
| `test_donacion_rechazada_supera_restante` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Valida que si un donante intenta aportar una cantidad mayor a las unidades que faltan para completar la meta, la petición sea rechazada indicando el cupo restante disponible. |
| `test_donacion_permitida_campana_activa_con_fecha_futura` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Confirma que en una campaña activa con fecha límite futura se permita registrar la donación exitosamente (código 201) y se incremente la cantidad recibida. |
| `test_donacion_permitida_campana_fecha_limite_hoy` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Asegura que una campaña cuya fecha límite es el día de hoy siga considerándose vigente y acepte aportes con normalidad. |
| `test_donacion_permitida_campana_sin_fecha_limite` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Verifica que las campañas activas que no tienen definida una fecha límite (permanentes) acepten donaciones correctamente. |
| `test_consulta_publicacion_calcula_cancelada_si_vencida` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Verifica que el endpoint público de consulta de campaña calcule y devuelva el estado "cancelada" si la fecha límite ha expirado. |

---

### Frontend

**Archivo:** `Scrum/RedDonaciones/frontend/src/test/BloqueoCampanas.test.jsx`

| Función de Test | Categoría | Lo que hace |
| :--- | :--- | :--- |
| `en DetailPage con campaña finalizada, muestra mensaje de bloqueo y no renderiza el formulario` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Comprueba que al abrir una campaña finalizada en el detalle se presente la tarjeta informativa con el mensaje de que ya no acepta donaciones y se oculte completamente el formulario de agendar entrega. |
| `en DetailPage con campaña con fecha límite vencida, muestra aviso de vencimiento y no renderiza formulario` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Comprueba que si la fecha límite ya expiró, el detalle muestre el encabezado de campaña cancelada con el aviso de vencimiento y no permita ver ni interactuar con el formulario. |
| `en DetailPage con campaña cancelada, muestra mensaje de cancelación y oculta el formulario` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Verifica que ante una campaña cancelada, la interfaz informe claramente la situación y oculte el formulario de donación. |
| `en DetailPage con campaña activa y vigente, renderiza formulario y permite donar exitosamente` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Valida el flujo normal en campañas vigentes, asegurando que el formulario se muestre con todos sus campos y se envíe la solicitud de donación al confirmar los datos requeridos. |
| `en HomePage oculta campañas canceladas y vencidas, pero muestra activas y finalizadas con badge` | Pruebas de Bloqueo de Donaciones en Campañas Vencidas y Finalizadas | Valida que el catálogo principal filtre y excluya campañas canceladas o vencidas, mostrando solo activas y finalizadas, estas últimas con su badge distintivo "Finalizada". |

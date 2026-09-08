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

---

## Categoría: Pruebas de Resultados e Imágenes de Campañas

Verifica la publicación, consulta y visualización de resultados e imágenes en campañas finalizadas, asegurando permisos por organización y correcta presentación de impacto.

### Backend

**Archivo:** `Scrum/RedDonaciones/backend/tests/test_resultados_imagenes_campanas.py`

| Función de Test | Categoría | Lo que hace |
| :--- | :--- | :--- |
| `test_consultar_resultado_campana_existente` | Pruebas de Resultados e Imágenes de Campañas | Comprueba que se puedan consultar los resultados de una campaña finalizada, obteniendo el resumen, beneficiarios, imagen y usuario que publicó. |
| `test_consultar_resultado_campana_no_publicado_404` | Pruebas de Resultados e Imágenes de Campañas | Verifica que al consultar resultados de una campaña que aún no los tiene registrados se retorne error 404 de no publicado. |
| `test_publicar_resultado_exitoso_intermediario` | Pruebas de Resultados e Imágenes de Campañas | Valida que un intermediario perteneciente a la organización de la campaña pueda publicar los resultados y la URL de imagen con éxito (código 200). |
| `test_publicar_resultado_exitoso_administrador` | Pruebas de Resultados e Imágenes de Campañas | Verifica que un usuario administrador tenga permisos globales para publicar o actualizar resultados e imágenes en cualquier campaña finalizada. |
| `test_rechazo_publicar_resultado_campana_no_finalizada` | Pruebas de Resultados e Imágenes de Campañas | Comprueba que se rechace (código 409) cualquier intento de publicar resultados en campañas que aún siguen activas o no finalizadas. |
| `test_rechazo_publicar_resultado_intermediario_otra_organizacion` | Pruebas de Resultados e Imágenes de Campañas | Verifica que se deniegue el acceso (código 403) si un intermediario intenta publicar resultados en una campaña que pertenece a otra organización. |
| `test_rechazo_publicar_resultado_donante_no_autorizado` | Pruebas de Resultados e Imágenes de Campañas | Comprueba que los usuarios con rol donante no tengan permisos para publicar resultados (código 403). |
| `test_rechazo_publicar_resultado_datos_invalidos` | Pruebas de Resultados e Imágenes de Campañas | Valida que el servidor rechace la solicitud (código 400) si el resumen está vacío o la cantidad de personas beneficiadas es negativa. |
| `test_detalle_publicacion_incluye_resultado_e_imagen` | Pruebas de Resultados e Imágenes de Campañas | Verifica que el endpoint público de detalle de campaña incluya los campos del resultado, cantidad de beneficiarios, fecha e imagen de evidencia. |

---

### Frontend

**Archivo:** `Scrum/RedDonaciones/frontend/src/test/ResultadosImagenesCampanas.test.jsx`

| Función de Test | Categoría | Lo que hace |
| :--- | :--- | :--- |
| `en DetailPage con campaña finalizada, muestra la sección de impacto con resumen, beneficiarios e imagen` | Pruebas de Resultados e Imágenes de Campañas | Verifica que en el detalle de una campaña finalizada se muestre la sección "El impacto que logramos juntos" con el resumen, conteo de beneficiarios, fecha e imagen de evidencia. |
| `en DetailPage con campaña finalizada sin resultados, muestra mensaje de preparación y no renderiza imagen de resultados` | Pruebas de Resultados e Imágenes de Campañas | Comprueba que si la campaña finalizó pero aún no tiene informe publicado, se muestre un mensaje indicando que la organización lo está preparando y no se muestre imagen vacía. |
| `en DetailPage con campaña activa, no muestra la sección de resultados ni de impacto` | Pruebas de Resultados e Imágenes de Campañas | Asegura que en campañas activas la sección de resultados permanezca oculta para los usuarios. |
| `en DetailPage renderiza la imagen de portada de la campaña o imagen por defecto` | Pruebas de Resultados e Imágenes de Campañas | Valida que la cabecera del detalle cargue correctamente la imagen de portada de la campaña con su atributo alt correspondiente. |
| `en OrgaCampaignResultModal renderiza los campos de resumen, personas beneficiadas y URL de imagen` | Pruebas de Resultados e Imágenes de Campañas | Comprueba en el panel de la organización que el modal de publicar resultados presente los campos de texto, beneficiarios e imagen, gestione eventos de cambio y controle el estado de guardado. |


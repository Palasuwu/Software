# Pruebas implementadas en la rama Backend-Tests

Este documento lista las pruebas que se encuentran en la rama Backend-Tests.

---

## 1. Estados, transiciones y permisos de donaciones

**Archivo:** `backend/tests/test_estados_permisos_donaciones.py`

Estas pruebas aseguran que las donaciones pasen únicamente por los estados permitidos y que cada usuario tenga acceso solamente a lo que le corresponde.

* **Cambio de estado exitoso por intermediario:** Verifica que el intermediario de la organización encargada de la donación pueda actualizar su estado sin problemas (por ejemplo, pasar de pendiente a recibida).
* **Cambio de estado exitoso por administrador:** Verifica que un usuario administrador tenga permisos para actualizar el estado de donaciones de cualquier organización.
* **Aceptación de transiciones válidas:** Comprueba que el sistema permita las transiciones que siguen el orden lógico del proceso (pendiente a recibida, recibida a en proceso, en proceso a entregada, o cualquiera de estas a rechazada).
* **Rechazo de transiciones inválidas:** Comprueba que la API rechace saltos de estado no permitidos (por ejemplo, querer pasar directamente de pendiente a entregada, o intentar reactivar una donación que ya fue entregada o rechazada).
* **Rechazo de estados desconocidos:** Verifica que el sistema no acepte estados inventados o que no existan en el sistema.
* **Rechazo al asignar el mismo estado:** Verifica que si se intenta actualizar una donación al estado que ya tiene actualmente, se devuelva un aviso indicando que ya se encuentra en ese estado.
* **Aislamiento entre organizaciones:** Comprueba que un intermediario de la Organización A no pueda ver ni modificar donaciones que pertenecen a la Organización B.
* **Privacidad entre donantes:** Comprueba que un donante únicamente pueda consultar sus propias donaciones y se le bloquee el acceso si intenta ver las de otro donante.
* **Restricción de modificación para donantes:** Verifica que los donantes no puedan cambiar el estado de las donaciones, ya que es una función exclusiva de intermediarios y administradores.
* **Rechazo de solicitudes sin autenticación:** Comprueba que cualquier intento de consultar o modificar donaciones sin haber iniciado sesión sea rechazado.

---

## 2. Concurrencia y consistencia de datos

**Archivo:** `backend/tests/test_concurrencia_donacion.py`

Estas pruebas validan cómo responde el sistema cuando varios usuarios interactúan al mismo tiempo.

* **Consultas simultáneas sin bloqueos ni errores:** Simula múltiples usuarios consultando al mismo tiempo listados de donaciones y estados específicos, verificando que la API responda de forma consistente y sin fallos.
* **Control de meta con registros concurrentes:** Simula dos donaciones que ingresan exactamente al mismo tiempo cuando solo queda espacio para una de ellas en la meta. Se asegura de que solo se registre la que cabe dentro del cupo disponible y la otra sea rechazada para no superar la meta.
* **Múltiples donaciones simultáneas respetando el cupo:** Simula varias donaciones concurrentes compitiendo por un cupo limitado, comprobando que la meta se llene exactamente sin sobrepasar el total y que la campaña pase automáticamente a estado finalizada.

---

## 3. Flujo base y regresión de donaciones

**Archivo:** `backend/tests/test_regresion_donaciones.py`

Estas pruebas validan el ciclo de vida completo de registro de donaciones y las reglas de negocio asociadas.

* **Registro exitoso de donación:** Valida el registro completo de una donación con fecha, hora, cantidades, datos de contacto y notas opcionales.
* **Finalización automática al completar meta:** Comprueba que cuando una donación completa exactamente la cantidad restante que necesitaba la campaña, esta cambie automáticamente su estado a finalizada.
* **Rechazo si la cantidad supera lo restante:** Comprueba que si un donante intenta aportar más unidades de las que faltan para llegar a la meta, la solicitud sea rechazada con un mensaje claro.
* **Rechazo en campañas ya finalizadas:** Verifica que no se puedan registrar donaciones en campañas que ya alcanzaron su meta o que no estén activas.
* **Validación de cantidades válidas:** Comprueba que no se permitan donaciones con cantidad cero, números negativos o texto no numérico.
* **Validación de formato de fecha y hora:** Comprueba que la fecha de entrega tenga formato YYYY-MM-DD y que la hora tenga formato válido HH:MM.
* **Validación de campos obligatorios:** Comprueba que el sistema exija los datos mínimos requeridos (campaña, descripción, contacto y fecha).
* **Verificación de existencia de registros:** Verifica que se devuelva error si se intenta donar a una campaña que no existe o con un donante no registrado.

---

## 4. Notificaciones del sistema

**Archivo:** `backend/tests/test_notificaciones_casos_completos.py`

Estas pruebas cubren todos los escenarios en los que el sistema debe avisar a los usuarios involucrados.

* **Aviso al donante por cambio de estado individual:** Comprueba que cuando un intermediario o administrador actualiza el estado de una donación, el donante reciba una notificación con el detalle del cambio y el enlace directo a su donación.
* **Avisos individuales en cambios de estado masivos:** Comprueba que al actualizar varias donaciones al mismo tiempo, cada donante reciba su notificación correspondiente.
* **Ausencia de notificaciones en transiciones fallidas:** Comprueba que si un cambio de estado es rechazado por ser inválido, no se generen notificaciones erróneas.
* **Avisos al registrar una donación:** Comprueba que al crear una donación se envíen dos notificaciones: una al donante confirmando su registro y otra al intermediario avisándole que recibió un nuevo aporte.
* **Generación de recordatorios de entregas pendientes:** Comprueba que el sistema genere recordatorios automáticos para las donaciones que están pendientes de entrega en la fecha agendada, sin duplicar recordatorios si ya se enviaron.
* **Consulta de notificaciones y conteo de no leídas:** Verifica que el usuario pueda consultar su lista de avisos y saber cuántos tiene sin leer.
* **Marcado de notificación como leída:** Comprueba que al marcar una notificación se guarde como leída y se registre la fecha en que se leyó.
* **Privacidad de notificaciones entre usuarios:** Comprueba que ningún usuario pueda ver o marcar notificaciones que pertenezcan a otra persona.

---

## 5. Pruebas de interfaz y frontend

**Archivos:** `frontend/src/test/DonacionesFrontend.test.jsx` y `frontend/src/test/DetailPage.test.jsx`

Estas pruebas validan la experiencia de usuario, formularios, tablas de gestión y la coherencia visual de los estados.

* **Compromiso de entrega obligatorio:** Verifica que en la página de detalle de la campaña no se pueda registrar una donación si el usuario no ha marcado la casilla confirmando su compromiso de entrega.
* **Estado visual del compromiso de entrega:** Comprueba que la casilla de compromiso cambie de apariencia cuando está seleccionada y permita continuar con el envío.
* **Restricción de registro por rol en frontend:** Verifica que usuarios con roles distintos a donante no puedan enviar el formulario de donación.
* **Seguimiento de donación para el donante:** Comprueba que en la vista de seguimiento el donante pueda ver el título de la campaña, la organización, los datos de entrega, el progreso actual y la etiqueta con el estado correspondiente.
* **Protección de seguimiento contra accesos no autorizados:** Comprueba que si un donante intenta ver el seguimiento de una donación ajena, la interfaz le muestre un mensaje de que no tiene permisos.
* **Lista de historial en Mis Donaciones:** Comprueba que el donante pueda ver todas sus donaciones con sus respectivas etiquetas de estado y datos generales.
* **Gestión de donaciones para intermediarios:** Comprueba que la tabla del intermediario muestre la campaña, donante, contacto, fecha y estado, y permita seleccionar donaciones una por una o todas juntas para acciones en lote.
* **Estados vacíos y de error en gestión:** Comprueba que se muestren mensajes amigables cuando una organización aún no tiene donaciones o cuando ocurre un fallo de carga.
* **Gestión de donaciones para administradores:** Comprueba que la tabla del administrador incluya la columna de la organización a la que pertenece cada donación.
* **Consistencia de estados entre roles:** Verifica que para todos los estados posibles (Pendiente, Recibida, En proceso, Entregada, Rechazada), el donante, el intermediario y el administrador vean exactamente el mismo texto y estilo de estado para una misma donación.

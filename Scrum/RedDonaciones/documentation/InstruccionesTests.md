# Pruebas locales

## Backend: requisitos

Docker y Python 3 en el host. No se lee `.env` ni se necesita instalar las
dependencias Python en el host. El runner usa una imagen backend local con
`backend/requirements.txt` instalado: primero la del contenedor
`reddonaciones-backend-1`, o `reddonaciones-backend`. Si no existe:

```bash
docker build -t reddonaciones-backend backend
```

Para MySQL usa la imagen local exacta del contenedor `mysql_db`, incluso si está
detenido; si no existe ese contenedor, busca `mysql:8` local. No descarga imágenes
implícitamente. Se puede elegir con `--mysql-image` y `--backend-image`.

Ejecutar los comandos siguientes desde la raíz de RedDonaciones.

## Unitarias, sin MySQL

```bash
python3 scripts/test_mysql.py --unit
python3 scripts/test_mysql.py --unit -- tests/autenticacion -q
```

El contenedor no tiene red. Las pruebas reales se identifican por sus fixtures
y el marcador `mysql`, y se excluyen explícitamente de la selección unitaria
(`deselected`, no `skipped`). Cualquier conexión real no simulada queda bloqueada
antes de invocar el conector. Los mocks existentes siguen parcheando al consumidor.

También puede usarse `cd backend` y `python -m pytest` si ya se dispone de las
dependencias y permisos locales necesarios para la carpeta de uploads. La
configuración unitaria se establece antes de recolectar e importar la aplicación.

## MySQL real: integración, regresión y concurrencia autocontenidas

```bash
python3 scripts/test_mysql.py
python3 scripts/test_mysql.py -- tests/automatizadas -m integracion -v
python3 scripts/test_mysql.py -- tests/automatizadas -m regresion -v
python3 scripts/test_mysql.py -- tests/concurrencia -v
```

Sin argumentos ejecuta `tests/automatizadas` y `tests/concurrencia`. Todo lo que
sigue a `--` se pasa a pytest; se conserva su código de salida, incluidos fallos,
errores de uso y selección vacía. Para reportes, usar rutas del contenedor como
`/tmp/resultados.xml`; los montajes de código son de solo lectura y los archivos
del contenedor se eliminan al terminar.

El runner crea nombres aleatorios para una red Docker nueva `--internal`, un
MySQL y un contenedor pytest. No publica puertos, monta datos del proyecto ni
reutiliza redes/volúmenes. MySQL guarda sus datos en un `tmpfs` exclusivo.
Espera una consulta autenticada TCP en el servidor definitivo, hasta 120 segundos
(`--timeout` cambia el límite). Carga solo `db/init.sql` y comprueba exactamente
13 tablas con cero filas antes de pytest. Cada importación manual usa
`--show-warnings`, por sentencia; los errores y el código SQL se comprueban.

La aplicación bajo pytest exige `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`,
`TEST_DB_PASSWORD`, `TEST_DB_NAME`, `TEST_MYSQL_SERVER_UUID` y `TEST_MYSQL_TOKEN`.
El runner los genera sin fallback a `DB_*`. Cada conexión comprueba UUID y token
contra una marca creada solo en ese servidor. No basta con un nombre `_test`.
No se deben copiar valores de desarrollo para intentar satisfacer esta guardia.
Una configuración incompleta con `--mysql` falla antes de importar la app o abrir
conexiones. Los fixtures que abren MySQL directamente pasan por la misma guardia.

Integración, concurrencia y rendimiento clonan el esquema sin filas dentro de ese
servidor, siguiendo el orden del DDL canónico y sin desactivar FK. La limpieza
por prueba incluye la preparación; el runner elimina finalmente su servidor,
contenedor pytest y red, también ante fallo de preparación, pytest, SIGINT o
SIGTERM. SIGKILL o la pérdida del daemon no permiten garantizar ejecución de
`finally`: los nombres y la etiqueta `reddonaciones.test-run` identifican los
recursos de la ejecución para revisión. No usar limpieza general.

## Comprobar la inicialización de desarrollo sin tocar desarrollo

```bash
python3 scripts/test_mysql.py --check-development
```

Crea otro entorno desechable. Prueba los montajes reales, en orden:
`10-schema.sql` (`db/init.sql`) y `20-demo.sql` (`db/datos.sql`). Comprueba las
cantidades del seed. En ese mismo servidor exclusivo también prueba los dos
comandos manuales en una segunda base vacía, mostrando advertencias por sentencia.
No modifica ni inicia los contenedores del proyecto.

## Alcance pendiente: parte 2

No se adaptaron `tests/reportes/test_reporte_service.py`, los casos que usan
`dataset_reportes` en `tests/reportes/test_reporte_endpoints.py`, ni
`tests/usuarios/test_registro_intermediario_mysql.py`: aún dependen del seed.
Se clasifican como `mysql_seed`; una selección MySQL que los incluya se rechaza
explícitamente, no se omite para simular éxito.

Los dos casos de `tests/ubicacion/test_ubicacion_tipos.py` siguen clasificados
como MySQL: consultan la base real y su preparación con datos propios queda para
la parte 2. No se convirtieron en mocks.

Los dos casos de `tests/notificaciones/test_notificaciones.py` son unitarios:
ya simulaban la conexión de la ruta y ahora completan la de autenticación en
`auth_utils.get_db_connection`. Devuelven un usuario válido y activo; se conserva
la validación real del JWT, el rol y los decoradores. Cada prueba comprueba que
la consulta de autenticación se realizó para el usuario del token. Se retiró su
clasificación MySQL por archivo, sin debilitar las aserciones existentes.

Los demás datasets reales de reportes (`datos_reportes`) deben revisarse en la
parte 2 para su aislamiento por prueba. Sus casos de validación simulados siguen
dentro de las unitarias.

Rendimiento conserva su condición existente `RENDIMIENTO=1`; esta primera parte
cambia su conexión y plantilla, pero no ejecuta esa cobertura ni habilita el flag
en el contenedor. Su habilitación explícita y validación quedan pendientes.
El workflow del repositorio padre sigue pendiente de adaptación: no modificarlo
ni asumir que sus comandos antiguos verifican el nuevo aislamiento.

## Validación de la primera parte (27 de octubre de 2026)

Se utilizó MySQL 8.4.11, desde la imagen local exacta del proyecto, y una imagen
backend local con dependencias ya instaladas. No se instalaron dependencias en
el host ni se ejecutaron pruebas en el servidor de desarrollo.

| Comando desde la raíz | Resultado |
|---|---|
| `python3 scripts/test_mysql.py --unit -- tests/notificaciones/test_notificaciones.py -q` | 2 aprobadas, 0 fallidas, 0 omitidas, 0 deseleccionadas; código 0 |
| `python3 scripts/test_mysql.py --unit` | 397 aprobadas, 0 fallidas, 0 omitidas, 92 MySQL deseleccionadas; código 0 |
| `python3 scripts/test_mysql.py` | 31 aprobadas, 0 fallidas, 0 skips: 27 MySQL y 4 simuladas existentes |
| `python3 scripts/test_mysql.py --check-development` | Entry point Docker y carga manual: 13 tablas, seed completo |
| `python3 scripts/test_mysql.py --unit -- --mysql tests/base_datos/test_connection.py -q` | Rechazo temprano por configuración incompleta, código 4 |
| `python3 scripts/test_mysql.py -- tests/base_datos/test_connection.py --argumento-inexistente` | Error controlado de pytest, código 4 conservado; limpieza completa |
| `python3 scripts/test_mysql.py --timeout 1` | Fallo controlado de preparación, código 1; limpieza completa |

Antes de pytest se verificaron las 13 tablas con `COUNT(*) = 0` en cada una.
El servidor final de integración tuvo UUID `cc401328-d1cf-11f1-8487-b2e22531d88c`,
sin puertos y conectado solo a su red exclusiva
`rdtest-a6d174ae570b4dbdbe63aaf1d4992809-net`. Las pruebas reales verifican además
que UUID o token incorrectos impiden entregar una conexión al backend.

La separación conserva exactamente el DDL de tablas y el contenido del seed
corregido anterior. Las importaciones manuales del DDL mostraron dos advertencias
1681 por `TINYINT(1)`; el seed no mostró advertencias ni errores. Las unitarias
mostraron 30 advertencias JWT preexistentes por claves cortas de sus ejemplos.

La primera ejecución tuvo **395 aprobadas, 4 fallidas, 0 omitidas y 88
deseleccionadas**. Los cuatro fallos fueron los dos de notificaciones y los dos
de tipos de coordenadas: intentaban usar conexiones reales bloqueadas en modo
unitario. No fueron cuatro pruebas aprobadas ni cuatro skips.

Una ejecución intermedia deseleccionó también las cuatro y obtuvo 395 aprobadas,
0 fallidas, 0 omitidas y 94 deseleccionadas (ya incluía dos pruebas nuevas de
identidad MySQL). Esa clasificación no resolvía los mocks de notificaciones.
La corrección final resuelve esos dos fallos completando su mock de autenticación;
los dos de coordenadas siguen pendientes de adaptación a datos propios. Las 92
pruebas deseleccionadas de la selección unitaria final no se presentan como
aprobadas. Primero se ejecutaron las dos de notificaciones y después toda la
selección unitaria, ambas sin red ni MySQL y con el bloqueo de conexiones reales
habilitado. No se añadieron skips ni se desactivaron decoradores o permisos.

En esta corrección solo se cambiaron pruebas, clasificación y documentación;
no se repitieron las importaciones SQL ni las validaciones MySQL ya aprobadas.
Los cinco hashes demo trasladados con el seed ya estaban versionados y se
conservaron sin modificaciones: no son secretos nuevos ni tokens temporales y
no se reproducen en esta documentación.
También se corrigió un montaje inicial incompatible con uploads; la versión final
monta solo los archivos y directorios de código y un tmpfs separado para uploads.

Todos los contenedores y redes creados por estas ejecuciones fueron eliminados.
La interrupción por SIGKILL o pérdida del daemon sigue teniendo la limitación
explicada en la sección de limpieza.

# Frontend (Vitest)

Las pruebas del frontend se encuentran en:

```text
frontend/src/test/
```

Actualmente incluyen pruebas del componente **LoginPage**.

---

## Ejecutar las pruebas del frontend

```bash
docker compose --profile test run --rm frontend-test
```

El perfil `test` evita que el servicio de pruebas se inicie automáticamente al ejecutar `docker compose up`.

---

## ¿Por qué no realizan peticiones al backend?

Las peticiones HTTP son simuladas utilizando:

```javascript
vi.stubGlobal("fetch", ...)
```

De esta manera:

* No se realizan llamadas reales al backend.
* No depende de que Flask esté respondiendo.
* Se prueba únicamente el comportamiento del componente React.

---

# Si una prueba falla

Cuando una prueba falla, Pytest o Vitest mostrarán:

* El nombre de la prueba.
* La línea donde ocurrió el error.
* La diferencia entre el resultado esperado y el obtenido.

Esto facilita identificar rápidamente el origen del problema.

---

# Recomendaciones

* Ejecutar las pruebas antes de subir cambios importantes.
* Si se modifica el formulario de login, los mensajes de validación o la respuesta del backend, revisar y actualizar las pruebas correspondientes.
* Mantener las pruebas independientes entre sí para evitar que una afecte el resultado de otra.

# Pruebas locales y CI

## Requisitos

Ejecutar desde la raíz de RedDonaciones. Se necesita Docker y Python 3 en el host.
El runner usa la imagen local exacta del contenedor `mysql_db` (incluso detenido),
o `mysql:8` local, y la imagen del contenedor `reddonaciones-backend-1`, o
`reddonaciones-backend`. No inicia los servicios del proyecto ni instala paquetes
en el host. Si falta la imagen backend, prepararla explícitamente:

```bash
docker build -t reddonaciones-backend backend
```

`--mysql-image` y `--backend-image` permiten seleccionar imágenes locales.
No se lee `.env`, no se montan secretos ni datos de desarrollo y no hay fallback
a `DB_*`. Los montajes de código y del único DDL (`db/init.sql`) son de solo lectura.
El seed `db/datos.sql` no se monta en las ejecuciones de pruebas.

## Comandos actuales

```bash
# Unitarias, sin red ni MySQL.
python3 scripts/test_mysql.py --unit

# Todas las MySQL funcionales: marcador mysql, sin rendimiento.
python3 scripts/test_mysql.py

# Suite habitual: unitarias + MySQL, sin rendimiento.
python3 scripts/test_mysql.py --full

# Prueba condicional de intermediarios, habilitada por el runner.
python3 scripts/test_mysql.py -- tests/usuarios/test_registro_intermediario_mysql.py -q

# Rendimiento: habilita RENDIMIENTO=1 y conserva escala y umbral del proyecto.
python3 scripts/test_mysql.py --performance

# Opciones existentes de rendimiento, explícitas (estos son los valores por defecto).
RENDIMIENTO_ESCALA=1 RENDIMIENTO_LIMITE_MS=2000 python3 scripts/test_mysql.py --performance

# Selección específica: los argumentos después de -- reemplazan la selección por defecto.
python3 scripts/test_mysql.py -- tests/reportes -m mysql -v

# Orden alternativo de todos los grupos MySQL funcionales.
python3 scripts/test_mysql.py -- tests/ubicacion/test_ubicacion_tipos.py tests/usuarios/test_registro_intermediario_mysql.py tests/reportes tests/base_datos/test_mysql_isolation.py tests/concurrencia tests/automatizadas -m mysql -q
```

El runner pasa los argumentos a pytest y conserva su código de salida. Cada modo
MySQL habilita `SPRINT9_MYSQL_INTEGRATION=1`; fuera del runner esa condición sigue
siendo explícita. Rendimiento se habilita solo con `--performance`, que pasa
`RENDIMIENTO=1` y únicamente las opciones `RENDIMIENTO_ESCALA` y
`RENDIMIENTO_LIMITE_MS` del host si se proporcionaron. No se modificaron umbrales.

## Preparación, aislamiento y limpieza

Cada ejecución MySQL crea un servidor, una red Docker nueva `--internal` y un
contenedor pytest exclusivos, sin puertos publicados. Los datos MySQL y uploads
usan tmpfs nuevos. Se espera una consulta TCP autenticada en el servidor definitivo
hasta 120 segundos (`--timeout`). `scripts/mysql_test_support.py` carga únicamente
el DDL, muestra advertencias por sentencia con `--show-warnings`, comprueba las
13 tablas con cero filas y crea una marca aleatoria de la ejecución.

Antes de importar la app y recolectar pruebas, pytest exige `--mysql` y todas las
variables `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`,
`TEST_DB_NAME`, `TEST_MYSQL_SERVER_UUID`, `TEST_MYSQL_TOKEN`. Si falta configuración,
falla antes de conectar. Cada conexión verifica UUID y token del servidor; el
nombre de la base no es la garantía de aislamiento. En modo unitario, una conexión
real no simulada se rechaza antes de invocar el conector.

Los fixtures reales clonan las tablas sin filas siguiendo el DDL canónico, sin
desactivar FK. Reportes, intermediarios y coordenadas crean sus propias entidades
y relaciones usando los IDs devueltos por cada inserción. Configuran y restauran
`ID_ORGANIZACION_PRINCIPAL` y la clave JWT de pruebas por ámbito. Las peticiones
de reportes ahora leen datos confirmados
mediante conexiones reales; no se confía en un rollback externo para deshacer
commits de endpoints o DDL. La eliminación de la base por prueba abarca también
los fallos de preparación anteriores al yield. Dos regresiones nuevas verifican
la limpieza con y sin datos confirmados y la restauración de configuración.

Notificaciones sigue siendo unitario: su mock de autenticación está en
`auth_utils.get_db_connection`; JWT, rol, usuario activo y decoradores se conservan.

Un `finally` elimina únicamente los contenedores y la red etiquetados con el ID
de esa ejecución, también ante fallos y SIGINT/SIGTERM. Se comprueba su ausencia.
SIGKILL o la pérdida del daemon no permiten garantizar ejecución del finally;
los nombres `rdtest-*` y la etiqueta `reddonaciones.test-run` permiten identificar
los recursos propios para revisión. No usar limpieza general.

## CI: workflow real del repositorio padre

El workflow es `.github/workflows/pruebas-automatizadas.yml` en la raíz real del
repositorio, dos niveles por encima de RedDonaciones. Conserva el servicio MySQL
efímero, los reportes, artefactos y el job frontend. Usa `TEST_DB_*` explícitos,
`SPRINT9_MYSQL_INTEGRATION=1` y el ID `${{ job.services.mysql.id }}`.

Desde `backend`, el paso `python ../scripts/prepare_ci_mysql.py` prepara únicamente
ese contenedor de servicio y reutiliza la misma importación, inventario vacío y
marca del runner. Exige CI/GitHub Actions y el ID completo del contenedor; fuera
de ese contexto rechaza la preparación. Registra el token mediante el comando
de enmascaramiento de Actions antes de guardar UUID/token en `GITHUB_ENV`, para
ocultarlo también en el entorno mostrado por pasos posteriores; no lo incluye
en artefactos. Cada comando pytest usa `--mysql`.

Si todos los pasos llegan a ejecutarse, integración, regresión y generales
seleccionan respectivamente 5, 4 y 454 casos, sin solaparse: la selección general excluye automatizadas y rendimiento.
Los 28 casos de rendimiento siguen fuera del workflow habitual, como antes;
se ejecutan con el comando local explícito. **No se ejecutó GitHub Actions con
estos cambios locales sin commit.** La comprobación remota queda pendiente.

### Corrección del bloqueo de CI y ensayo local (2026-10-27)

La raíz Git es `/home/mache/SW/Software`; el único workflow versionado está en
`.github/workflows/pruebas-automatizadas.yml` bajo esa raíz. No existe otro en
`Scrum/RedDonaciones/.github`. En `HEAD` y la referencia local `origin/main`,
commit `86dfa7a`, el workflow aún usa `DB_*` y ejecuta pytest sin `--mysql`,
exactamente como los comandos del log comunicado. La adaptación del workflow
quedó sin commit, mientras que el runner y los scripts sí están versionados.
Esto explica el rechazo de configuración previo a las pruebas (código 4).
No se consultó el SHA de la ejecución real: no se facilitó su URL/ID y no hay
cliente `gh` disponible. La referencia remota local no confirma el SHA del run.

El diff pendiente configura `TEST_DB_*`, habilita intermediarios, pasa el ID
`${{ job.services.mysql.id }}` a `prepare_ci_mysql.py` y añade `--mysql` a las
tres selecciones. Reutiliza el servicio existente y la preparación compartida,
sin seed y conservando los controles de UUID/token. No incorpora otro servicio
MySQL, fallback a desarrollo ni `continue-on-error`. El frontend es idéntico
al de `HEAD`; no se cambiaron versiones de actions ni Ubuntu.

Se ensayó **localmente**, en otro servidor y contenedor desechables, el script
real `prepare_ci_mysql.py` y los tres comandos pytest leídos del YAML:

```bash
# working-directory: Scrum/RedDonaciones/backend
python ../scripts/prepare_ci_mysql.py
pytest --mysql -m integracion tests/automatizadas -v --junitxml=reportes/integracion.xml --html=reportes/integracion.html --self-contained-html
pytest --mysql -m regresion tests/automatizadas -v --junitxml=reportes/regresion.xml --html=reportes/regresion.html --self-contained-html
pytest --mysql tests -v --ignore=tests/automatizadas --ignore=tests/rendimiento --junitxml=reportes/backend-general.xml --html=reportes/backend-general.html --self-contained-html
```

El ensayo proporcionó explícitamente el ID de su propio contenedor y un archivo
temporal equivalente a `GITHUB_ENV`; no utilizó la base de desarrollo. Las
credenciales fueron independientes, sin puertos publicados y con datos en tmpfs.
Para ejecutar pytest dentro del contenedor, `TEST_DB_HOST` fue el alias `mysql`;
en Actions se conserva `127.0.0.1` porque pytest corre en el host del job.
Se instaló `pytest-html` únicamente dentro del contenedor desechable, igual que
en el paso de dependencias de CI. Se usaron `PYTEST_ADDOPTS` para desactivar la
caché y los tracebacks, evitando exponer cabeceras JWT si fallaba un caso; no se
alteraron selecciones, aserciones ni códigos de salida.

| Selección local del workflow | Aprobadas | Fallidas | Omitidas | Deseleccionadas | Código |
|---|---:|---:|---:|---:|---:|
| Integración | 5 | 0 | 0 | 4 | 0 |
| Regresión | 4 | 0 | 0 | 5 | 0 |
| Generales | 454 | 0 | 0 | 0 | 0 |

Los JUnit confirmaron **463 casos únicos sin solapamientos** (397 unitarios y
66 MySQL funcionales); intermediarios ejecutó sus dos casos condicionales.
Los únicos 28 casos fuera de esta selección habitual son los de rendimiento,
ya excluidos expresamente. Las deselecciones de integración/regresión se cubren
mutuamente. La preparación terminó con código 0: 13 tablas con cero filas,
UUID `dbe24535-d227-11f1-b0c7-42b0bf12ba36` y registro de enmascaramiento del token
verificado sin mostrarlo. Hubo dos advertencias SQL 1681 conocidas del DDL y
30 advertencias de longitud JWT en generales; ningún error de importación.
Esto no resuelve ni identifica la causa de los 401 intermitentes históricos.

Se verificaron tres XML JUnit y tres HTML en `backend/reportes/`. Los comandos
y el resumen usan rutas relativas al working-directory del backend;
`upload-artifact` usa `Scrum/RedDonaciones/backend/reportes/`, relativa a la raíz
del checkout, y apunta al mismo directorio. Los reportes del ensayo permanecieron
en tmpfs y se eliminaron con su contenedor, junto con el servidor, su red y el
archivo temporal de entorno. El primer intento se detuvo antes de crear recursos
porque ya no existía `mysql_db`; se usó la imagen local `mysql:8`, ID
`b3b90af2a655`, MySQL 8.4.11, para el ensayo completado.

Validaciones estáticas aprobadas: parseo YAML con PyYAML, `bash -n` en cada paso
run, AST de los scripts, rutas de preparación/reportes y `git diff --check`.
`actionlint` no está disponible. **No se ejecutó ni consultó GitHub Actions**
con el diff final. Quedan pendientes confirmar el SHA del run remoto, el paso
de preparación, las tres selecciones y la publicación del resumen/artefactos
en una ejecución real que incluya este workflow. No se hizo commit ni push.

## Validación local de la parte 2 (27 de octubre de 2026)

| Ejecución | Aprobadas | Fallidas | Omitidas | Deseleccionadas |
|---|---:|---:|---:|---:|
| Primera `--full` de la versión final | 463 | 0 | 0 | 0 |
| Segunda `--full` de la misma versión final, en otro entorno | 462 | 1 | 0 | 0 |
| `--unit` | 397 | 0 | 0 | 94 |
| Comando MySQL por defecto | 66 | 0 | 0 | 397 |
| Grupos MySQL en orden alternativo (comando de arriba) | 66 | 0 | 0 | 53 |
| Intermediarios explícitos | 2 | 0 | 0 | 0 |
| Última `--performance`, escala 1 y umbral 2000 ms | 28 | 0 | 0 | 0 |

La segunda corrida final falló en
`test_filtra_por_fecha_de_inicio_de_fin_o_ambas[filtros3-0]`: el resumen respondió
200 y la petición siguiente de detalle respondió 401 con «Token inválido o
expirado». El rechazo ocurre en la verificación JWT, antes de consultar los datos.
El fixture ya fija y restaura también la clave JWT de pruebas; eso no eliminó
el fallo intermitente y no se afirma que la clave heredada fuera su causa.

En validaciones preliminares también hubo una repetición con 462 aprobadas y
un 401 en `test_intermediario_solo_ve_su_organizacion`, y una corrida de rendimiento
con 27 aprobadas y un 401 en `test_resumen_de_reportes_completo[alto]`. Esos fallos
no se borran del historial porque otras ejecuciones hayan pasado. No se determinó
su causa ni que todos compartan el mismo origen. No se modificaron autenticación,
reglas, aserciones ni umbrales para aprobar. **La reproducibilidad completa aún
no queda cerrada.**

Los volúmenes fueron los originales: 50 campañas/2000 donaciones y
500 campañas/20000 donaciones. En la última corrida las medianas
medidas estuvieron entre 18,9 y 180,1 ms, por debajo del límite. La exportación
completa se estima a partir de páginas; no se midió una descarga completa. Los
401 anteriores no fueron agotamiento de recursos ni excesos del umbral. Un primer intento de rendimiento no llegó a pytest por un import
faltante del runner; se corrigió y se verificó su limpieza antes de repetirlo.

Todas las preparaciones verificaron 13 tablas vacías, con dos advertencias 1681
por `TINYINT(1)` y sin seed. Las dos suites finales se ejecutaron
secuencialmente y usaron UUID distintos `48f8aea2-d1da-11f1-9b47-da5078665f07` y
`b262525b-d1da-11f1-897a-6acf005db19f`. Una repetición preliminar y el orden
alternativo se lanzaron simultáneamente y tuvieron servidores, redes y
credenciales independientes.
La limpieza funcionó también en las ejecuciones con fallos.

La preparación CI se ensayó **localmente** en otro contenedor sin red ni puertos:
13 tablas vacías e identidad/token válidos en un archivo de entorno temporal,
eliminado al finalizar. El YAML y los scripts bash se revisaron con PyYAML y
`bash -n`; los scripts Python con el parser AST. Esto no equivale a una ejecución
de CI ni a una validación con actionlint, que no está instalado.

## Investigación dirigida del 401 JWT (sin causa reproducida)

Se revisaron `generate_token`, `verify_token`, fixtures y restauración del entorno.
El generador usa UTC, `iat` con el instante de emisión y `exp` siete días después;
no emite `nbf`. La validación instalada es PyJWT 2.15.1, HS256 y leeway cero.
Generación y validación leen `JWT_SECRET_KEY` del entorno; `app.config` conserva
una copia inicial que esos métodos no consultan.

Se usó instrumentación temporal que delegaba a la implementación original de
PyJWT, conservaba excepciones y solo registraba su clase, comparaciones booleanas
de clave y datos temporales numéricos. No se imprimieron claves ni tokens ni se
alteraron decisiones de autenticación. Se retiró al terminar.

| Comprobación dirigida | Aprobadas | Fallidas | Omitidas | Deseleccionadas |
|---|---:|---:|---:|---:|
| Dos casos originales de cálculos de reportes | 2 | 0 | 0 | 0 |
| Prueba temporal: 50 pares de peticiones, parada ante el primer error | 1 | 0 | 0 | 0 |
| Resumen de rendimiento, solo parámetro alto | 1 | 0 | 0 | 0 |
| Login para comprobar restauración del entorno | 1 | 0 | 0 | 0 |
| Login seguido de cálculos de reportes | 25 | 0 | 0 | 0 |
| Una suite habitual completa con diagnóstico | 463 | 0 | 0 | 0 |

Además, una comprobación aislada de 50.000 generaciones/validaciones PyJWT con
claims equivalentes no produjo excepciones ni detectó retrocesos de reloj en
esa ventana. Eso no excluye un problema temporal fuera de la ventana observada.

Se confirmó que `test_login_exitoso` deja la clave del entorno alterada tras su
teardown y distinta de la copia de `app.config`. La suite diagnóstica también
observó otros cambios de entorno no restaurados. No se demostró que sean la
causa del 401: los fixtures MySQL fijan y restauran su propia clave, y la secuencia
login → reportes pasó con la validación real activa. No se observaron cambios en
la clave de `app.config` después de su importación.

La suite diagnóstica registró 418 emisiones y 374 validaciones. La única excepción
fue `InvalidSignatureError` en
`test_token_firmado_con_otro_secreto_se_rechaza`, que cambia la clave expresamente
y espera ese rechazo. No identifica la excepción del 401 intermitente anterior.
No se observaron `ExpiredSignatureError` ni `ImmatureSignatureError` en las
reproducciones de reportes o rendimiento.

**No se reprodujo el 401 ni se declara resuelta su causa.** No se modificaron
autenticación, permisos, expiración, fixtures ni workflow para intentar obtener
un resultado verde; no se añadieron reintentos, sleeps o skips. Al no existir una
corrección sustentada en evidencia, no se realizaron dos suites posteriores a
una corrección. El único cambio permanente de esta investigación es este registro.
Se eliminaron la prueba y la instrumentación temporales y todos sus recursos
Docker. Los comandos instrumentados fueron de diagnóstico temporal, no nuevos
comandos permanentes del runner. La colección no cambia y los resultados de esta
sección se solapan entre sí y con las ejecuciones anteriores.

## Corrección acotada del entorno de login (2026-10-27)

**Contaminación del entorno corregida:** `test_login_exitoso` usa ahora
`monkeypatch.setenv` en lugar de asignar directamente al entorno. La fixture
restaura automáticamente el valor anterior de `JWT_SECRET_KEY` al terminar,
también si falla la prueba. Se conservan los mocks y todas las aserciones.
El cambio se limita a esa prueba; no corrige otras asignaciones observadas.

Se intentaron estos comandos con el código final, sin instrumentación temporal:

```bash
python3 scripts/test_mysql.py --unit -- tests/autenticacion/test_login.py -q --tb=no
python3 scripts/test_mysql.py -- tests/autenticacion/test_login.py tests/reportes/test_reportes_calculos.py -q --tb=no
python3 scripts/test_mysql.py --full -- tests --ignore=tests/rendimiento -q --tb=no
```

Los tres terminaron con código 1 antes de iniciar pytest: Docker no está
disponible en esta distribución WSL, confirmado mediante `docker version`.
El intento unitario inicial dentro del sandbox y su repetición con permisos
ampliados tuvieron el mismo impedimento. No se crearon contenedores ni redes.
No hay conteos de aprobadas, fallidas, omitidas o deseleccionadas para estos
intentos: las pruebas no llegaron a ejecutarse. Quedan pendientes las tres
validaciones cuando Docker esté disponible; los resultados históricos anteriores
no validan este cambio. `git diff --check` terminó con código 0.

**401 intermitente:** no se reprodujo en la investigación anterior y su causa
sigue pendiente. Esta restauración del entorno no se presenta como solución
del 401. No se modificaron autenticación de producción ni workflow, ni se
añadieron reintentos, sleeps, skips o instrumentación.

## Investigación acotada del 401 en foto de perfil (2026-10-27)

La salida aportada de `--full` registra 462 aprobadas y una fallida:
`test_donante_guarda_foto_y_la_recupera`, cuyo PUT devolvió 401. Esa salida no
contiene el cuerpo del 401 ni la excepción JWT; no permite identificar su causa.

Se revisó la cadena real `gestionar_foto` → `token_required` →
`_autenticar_request` → `verify_token`. `foto_db` parchea correctamente
`auth_utils._obtener_usuario_actual`, que es donde la autenticación busca al
usuario, y devuelve ID, rol donante y activo=1. La conexión del endpoint se
parchea en `routes.foto_perfil`. No se desactivan autenticación ni permisos.
La fixture establece la clave mediante `monkeypatch.setenv` antes de generar
el token y la restaura al terminar. Emisión y validación consultan el mismo
`JWT_SECRET_KEY` del entorno; no usan la copia inicial de `app.config`.

Comandos ejecutados, en este orden:

```bash
python3 scripts/test_mysql.py --unit -- tests/fotos_perfil/test_foto_perfil.py::test_donante_guarda_foto_y_la_recupera -q --tb=no
python3 scripts/test_mysql.py --unit -- tests/fotos_perfil/test_foto_perfil.py -q --tb=no
# Diagnóstico temporal, retirado al terminar; este plugin ya no está disponible.
python3 scripts/test_mysql.py -- tests/autenticacion tests/campanas tests/concurrencia tests/configuracion tests/donaciones tests/fotos_perfil -p tests.foto_jwt_diagnostic -s -q --tb=no
```

| Selección | Aprobadas | Fallidas | Omitidas | Deseleccionadas |
|---|---:|---:|---:|---:|
| Caso aislado, sin instrumentación | 1 | 0 | 0 | 0 |
| Archivo completo, sin instrumentación | 11 | 0 | 0 | 0 |
| Grupos anteriores relevantes y fotos, con diagnóstico temporal | 121 | 0 | 0 | 0 |

Los resultados se solapan; no son 133 pruebas únicas. El intento inicial del
caso aislado dentro del sandbox no pudo acceder al socket Docker; la ejecución
autorizada posterior sí terminó con código 0, igual que las otras dos selecciones.

La colección de la selección confirmó como cuatro casos inmediatamente
anteriores a fotos los de cantidad inválida, formatos de fecha/hora inválidos,
campos faltantes y donante/publicación inexistente de
`test_regresion_donaciones.py`. Se conservaron en ese orden. No se repitió
indiscriminadamente toda la suite ni se incluyeron reportes o rendimiento.

El diagnóstico temporal delegó las operaciones originales y restauró sus
envoltorios en `finally`. No imprimió tokens ni claves. En el caso señalado,
PUT y GET completaron dos validaciones JWT y dos consultas al mock de usuario
válido. La clave usada para validar coincidió con el entorno al iniciar el caso;
el entorno y `app.config` no cambiaron durante sus peticiones. No se capturó
ninguna excepción JWT en fotos. Los únicos cuerpos 401 capturados fueron
`{"error": "Token no proporcionado o malformado"}`, ambos esperados en
`test_foto_requiere_sesion`; no corresponden al fallo original.

Se observaron cambios de clave no restaurados al terminar casos de intentos
de login, recuperación de contraseña, campañas, concurrencia simulada y
donaciones. `test_login_exitoso` y las pruebas de fotos no mostraron esa fuga
en esta selección. No se demostró relación causal con el 401: la fixture de
fotos fija su configuración y sus once casos pasaron después de esos grupos.
Las advertencias de longitud de clave también aparecen en las ejecuciones
aprobadas; no se consideran explicación del fallo.

**El 401 no se reprodujo y su causa sigue pendiente.** No se aplicó una
corrección especulativa ni se modificaron pruebas funcionales, autenticación,
permisos, imágenes o workflow. Solo se añadió este registro; se eliminó el
plugin temporal. Por no haber corrección de código no se ejecutó otro `--full`.
Los contenedores y la red temporales se eliminaron correctamente.
`git diff --check` terminó con código 0.

## Colección completa y solapamientos

La colección contiene 491 casos: 397 unitarios, 66 MySQL funcionales y 28 de
rendimiento. Los dos casos añadidos respecto de los 489 de la parte 1 verifican
limpieza ante fallo de preparación. Las 94 deselecciones del modo unitario son
66 MySQL más 28 de rendimiento; no son aprobaciones ni skips.

`--full` cubre los mismos 397 + 66 = 463 casos en cada repetición. La selección
MySQL por defecto y el orden alternativo seleccionan los mismos 66 casos. Los dos
intermediarios son un subconjunto de esos 66. Los 31 del runner anterior eran
27 MySQL y 4 simulados: ya están incluidos en los grupos actuales, no se suman.
Rendimiento aporta los otros 28 casos distintos. Se ejecutaron los 491 al menos
una vez. No se presenta una ejecución única de 491 aprobadas ni se oculta la
repetición funcional fallida. Las repeticiones y comandos
solapados no aumentan ese total único.

Para cerrar faltan: investigar el 401 intermitente sin ampliar esta tarea de
forma automática; obtener dos corridas habituales reproducibles sin alterar verificaciones
(los 28 de rendimiento pasaron en la última ejecución); ejecutar/consultar el workflow real
cuando los cambios estén disponibles en CI.

## Inicialización de desarrollo

Se conserva `python3 scripts/test_mysql.py --check-development` para verificar
en otro entorno desechable la carga ordenada de `init.sql` y `datos.sql` tanto
por Docker como manualmente. No se repitió esa comprobación en esta parte porque
no cambiaron el DDL, el seed ni los montajes de desarrollo. Los hashes demo
trasladados en la parte 1 ya estaban versionados y no son secretos nuevos.

## Historial de la parte 1 (comandos y conteos anteriores a la parte 2)

Los pendientes de fixtures descritos en esta sección son históricos: la parte 2
los adaptó. Sus comandos y resultados conservan el significado de aquella versión.

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

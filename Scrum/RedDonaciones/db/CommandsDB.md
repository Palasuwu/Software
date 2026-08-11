# Base de Datos

## Descripción

Este proyecto utiliza **MySQL 8 en Docker** para gestionar la base de datos del sistema Red de Donaciones.

La base de datos se inicializa automáticamente mediante el archivo `db/init.sql`, el cual contiene la creación de las tablas y datos de ejemplo utilizados durante el desarrollo.

---

## Requisitos

Antes de comenzar, asegúrate de tener instalado:

- Docker
- Docker Compose

---

## Cómo ejecutar el proyecto

### 1. Ubicarse en la carpeta raíz del proyecto

```bash
cd ruta/del/proyecto
```

### 2. Levantar los contenedores

Para iniciar normalmente el proyecto:

```bash
docker compose up --build
```

Si se realizaron cambios en la estructura de `init.sql` y ya existe un volumen de MySQL:

```bash
docker compose down -v
docker compose up --build
```

### ⚠️ ¿Por qué usar `down -v`?

MySQL almacena la información de la base de datos en un volumen de Docker.

El archivo `init.sql` se utiliza para inicializar la base de datos cuando se crea por primera vez el volumen. Por lo tanto, modificar `init.sql` no modifica automáticamente una base de datos que ya fue inicializada.

El comando:

```bash
docker compose down -v
```

elimina los volúmenes asociados al proyecto. Al volver a levantar los contenedores, MySQL crea nuevamente la base de datos utilizando el `init.sql` actualizado.

> **Advertencia:** este comando elimina los datos almacenados en la base de datos local. Debe utilizarse únicamente cuando se quiera reconstruir la BD de desarrollo desde `init.sql`.

---

## Creación de la base de datos

La base de datos se crea automáticamente mediante:

```text
db/init.sql
```

Este archivo:

- Crea la base de datos `donaciones`.
- Crea las tablas necesarias.
- Define claves primarias y foráneas.
- Define restricciones y valores por defecto.
- Inserta datos de ejemplo para desarrollo y pruebas.

---

## Cambios recientes del esquema

### Estados de donación

La tabla `donacion` incluye el campo:

```sql
estado ENUM(
    'pendiente',
    'recibida',
    'en_proceso',
    'entregada',
    'rechazada'
) NOT NULL DEFAULT 'pendiente'
```

Los estados permitidos son:

- `pendiente`: estado inicial de una donación.
- `recibida`: la donación fue recibida.
- `en_proceso`: la donación se encuentra en proceso de gestión.
- `entregada`: el proceso de la donación fue completado.
- `rechazada`: la donación fue rechazada.

Toda nueva donación que no especifique un estado recibe automáticamente:

```text
pendiente
```

El backend debe utilizar exactamente estos valores al consultar o actualizar estados.

---

### Datos institucionales de organizaciones

La tabla `organizacion` incluye los siguientes campos de información institucional:

```text
quienes_somos
que_hacemos
como_trabajamos
donde_trabajamos
url_logo
imagen_portada
```

Los campos institucionales permiten almacenar información más detallada sobre cada organización.

Los campos:

```text
url_logo
imagen_portada
```

se encuentran preparados para el soporte visual de las organizaciones.

Todos estos campos son opcionales y permiten `NULL`. Por lo tanto, backend y frontend deben contemplar organizaciones que todavía no tengan esta información registrada.

Los campos anteriores como `descripcion` y `direccion` se mantienen. `descripcion` funciona como información general/resumida, mientras que los nuevos campos permiten desarrollar el perfil institucional con mayor detalle.

Las campañas de una organización **no se almacenan nuevamente en estos campos**, ya que se obtienen mediante la relación existente entre `organizacion` y `publicacion`.

---

## Compatibilidad con datos existentes

Los nuevos campos institucionales de `organizacion` permiten `NULL`, por lo que las organizaciones existentes pueden continuar funcionando aunque todavía no tengan información institucional completa.

El campo `estado` de `donacion` tiene:

```sql
DEFAULT 'pendiente'
```

por lo que las donaciones creadas sin indicar explícitamente un estado comienzan como `pendiente`.

Para bases de datos locales ya existentes, los cambios pueden aplicarse mediante una migración/`ALTER TABLE` o reconstruyendo la base de datos de desarrollo con:

```bash
docker compose down -v
docker compose up --build
```

---

## Datos de ejemplo

`init.sql` incluye datos de ejemplo para facilitar el desarrollo y las pruebas.

Actualmente se incluyen:

- Usuarios con diferentes roles.
- Organizaciones verificadas.
- Donantes.
- Intermediarios.
- Categorías y artículos.
- Publicaciones.
- Donaciones.
- Relaciones entre publicaciones y artículos.

Las organizaciones demo incluyen información institucional para probar las futuras vistas de perfil.

Las donaciones demo utilizan diferentes estados para facilitar el desarrollo y las pruebas del flujo de seguimiento.

---

## Usuario de prueba para historial

Después de reconstruir la base de datos se crea un usuario de prueba con historial de donaciones:

- **Correo:** `donante.video@reddonaciones.local`
- **Password:** `demo123`

Este usuario tiene donaciones registradas que pueden utilizarse para probar el historial y seguimiento de donaciones.

---

## Cómo verificar que todo funciona

### 1. Entrar al contenedor de MySQL

```bash
docker exec -it mysql_db mysql -uroot -proot
```

### 2. Seleccionar la base de datos

```sql
USE donaciones;
```

### 3. Ver las tablas

```sql
SHOW TABLES;
```

### 4. Verificar la estructura de una tabla

Por ejemplo:

```sql
DESCRIBE donacion;
```

o:

```sql
DESCRIBE organizacion;
```

### 5. Verificar estados de donaciones

```sql
SELECT id_donacion, id_donante, id_publicacion, estado
FROM donacion;
```

### 6. Verificar datos institucionales

```sql
SELECT
    id_organizacion,
    nombre,
    quienes_somos,
    que_hacemos,
    como_trabajamos,
    donde_trabajamos
FROM organizacion;
```

---

## Insertar datos de prueba

Ejemplo de usuario:

```sql
INSERT INTO usuario (
    nombre,
    correo,
    password,
    telefono,
    rol
)
VALUES (
    'Ejemplo',
    'ejemplo@mail.com',
    '1234',
    '11111111',
    'donante'
);
```

> Para pruebas reales de autenticación se debe utilizar el mecanismo correspondiente del backend para almacenar correctamente la contraseña.

---

## Consultar datos

Ejemplo:

```sql
SELECT * FROM usuario;
```

```sql
SELECT * FROM donacion;
```

```sql
SELECT * FROM organizacion;
```

---

## Reiniciar la base de datos

Si se modifica la estructura del archivo `init.sql` y se desea reconstruir completamente la base local:

```bash
docker compose down -v
docker compose up --build
```

> Esto elimina los datos almacenados en el volumen local.

---

## ⚠️ Errores comunes

### 1. No aparecen tablas

**Causa posible:**

`init.sql` no se ejecutó correctamente.

**Solución:**

```bash
docker compose down -v
docker compose up --build
```

También se pueden revisar los logs:

```bash
docker compose logs
```

---

### 2. Error en `init.sql`

Ejemplo:

```text
ERROR 1064 (42000): syntax error
```

Revisar:

- Sintaxis SQL.
- Nombres de columnas.
- Comas entre columnas o valores.
- Comentarios SQL.
- Orden de creación de tablas y claves foráneas.

---

### 3. MySQL no conecta desde el backend

**Posibles causas:**

- MySQL todavía no está listo.
- Configuración incorrecta de conexión.
- El contenedor no está saludable.

**Solución:**

- Esperar unos segundos.
- Revisar el `healthcheck`.
- Consultar los logs de Docker.

---

### 4. Cambios de `init.sql` no se reflejan

**Causa:**

MySQL ya fue inicializado y conserva los datos mediante el volumen de Docker.

**Solución para desarrollo:**

```bash
docker compose down -v
docker compose up --build
```

---

### 5. Permitir teléfonos repetidos en usuarios

Si ya existe una base de datos y se necesita eliminar una restricción `UNIQUE` sobre `telefono`, primero se pueden consultar los índices:

```sql
SHOW INDEX FROM usuario;
```

Luego eliminar el índice correspondiente:

```sql
ALTER TABLE usuario DROP INDEX telefono;
```

El nombre exacto del índice puede variar.

---

## Consideraciones importantes

### Base de datos local por desarrollador

Cada integrante del equipo tiene su propia base de datos local:

- Los datos no se comparten automáticamente.
- Cada integrante trabaja con su propio contenedor/volumen.
- Un cambio en `init.sql` no modifica automáticamente la BD de los demás integrantes.

Cuando se incorporen cambios de esquema, cada integrante debe actualizar su entorno local.

### Cambios de esquema

Todo cambio en la estructura de la base de datos debe:

1. Quedar reflejado en `init.sql`.
2. Mantener compatibilidad cuando sea posible.
3. Documentarse.
4. Comunicarse al equipo.
5. Ser considerado por backend y frontend si modifica el contrato de datos.

### No modificar la base manualmente sin control

Evitar cambios estructurales directos que no queden registrados en el repositorio.

`init.sql` debe mantenerse como referencia actual del esquema utilizado por el proyecto.

---

## Notas técnicas

- MySQL 8.
- Motor de almacenamiento InnoDB.
- Codificación `utf8mb4`.
- Claves primarias y foráneas.
- Integridad referencial.
- Restricciones `CHECK` donde corresponde.
- Valores `DEFAULT` para determinados campos.
- Uso de `ENUM` para estados controlados.

---

## Buenas prácticas

- Utilizar nombres consistentes en `snake_case`.
- Validar los datos también en el backend.
- No confiar únicamente en las restricciones de la base de datos.
- Mantener `init.sql` actualizado.
- Documentar cambios de esquema.
- Mantener sincronizados BD, backend y frontend.
- No eliminar volúmenes con información importante sin respaldo.

---

## Comandos útiles

Entrar a MySQL:

```bash
docker exec -it mysql_db mysql -uroot -proot
```

Salir de MySQL:

```sql
exit;
```

Ver logs:

```bash
docker compose logs -f
```

Ver tablas:

```sql
SHOW TABLES;
```

Ver estructura:

```sql
DESCRIBE nombre_tabla;
```

---

## Estado actual

- Esquema principal de la base de datos implementado.
- Datos de ejemplo disponibles.
- Estados de seguimiento de donaciones definidos.
- Información institucional de organizaciones incorporada.
- Soporte de campos opcionales para identidad visual de organizaciones preparado.
- `init.sql` actualizado como referencia del esquema actual.
- Base de datos preparada para integración con las tareas de backend y frontend.
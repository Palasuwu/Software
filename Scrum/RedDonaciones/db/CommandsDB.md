# Base de Datos

## Descripción

Este proyecto utiliza **MySQL 8 en Docker** para gestionar la base de datos del sistema de donaciones.
La base de datos se inicializa automáticamente mediante un script SQL.

---

## Requisitos

Antes de comenzar, asegúrate de tener instalado:

* Docker
* Docker Compose

---

## Cómo ejecutar el proyecto

### 1. Ubicarse en la carpeta raíz del proyecto

```bash
cd ruta/del/proyecto
```

---

### 2. Levantar los contenedores (IMPORTANTE)

```bash
docker-compose down -v
docker-compose up --build
```

### ⚠️ ¿Por qué usar `down -v`?

* Elimina la base de datos anterior
* Permite ejecutar nuevamente el archivo `init.sql`
* Evita inconsistencias

---

## Creación de la base de datos

La base de datos se crea automáticamente gracias al archivo:

```text
/db/init.sql
```

Este archivo:

* Crea la base de datos `donaciones`
* Crea todas las tablas necesarias

---

## Cómo verificar que todo funciona

### 1. Entrar al contenedor de MySQL

```bash
docker exec -it mysql_db mysql -uroot -proot
```

---

### 2. Usar la base de datos

```sql
USE donaciones;
```

---

### 3. Ver tablas

```sql
SHOW TABLES;
```

---

## Insertar datos de prueba

```sql
INSERT INTO usuario (nombre, correo, password, telefono, rol)
VALUES ('Ejemplo', 'ejemplo@mail.com', '1234', '11111111', 'donante');
```

---

## Consultar datos

```sql
SELECT * FROM usuario;
```

---

## Reiniciar la base de datos

Si se modifica el archivo `init.sql`, es obligatorio ejecutar:

```bash
docker-compose down -v
docker-compose up --build
```

---

## ⚠️ Errores comunes

### 1. No aparecen tablas (`SHOW TABLES` vacío)

**Causa:**

* No se ejecutó `init.sql`

**Solución:**

```bash
docker-compose down -v
docker-compose up --build
```

---

### 2. Error en `init.sql`

Ejemplo:

```
ERROR 1064 (42000): syntax error
```

**Causa común:**

* Comentarios mal escritos

---

### 3. MySQL no conecta desde el backend

**Causa:**

* MySQL aún no está listo

**Solución:**

* Esperar unos segundos
* Verificar `healthcheck`

---

### 4. Cambios en la base de datos no se reflejan

**Causa:**

* Docker guarda datos en volumen

**Solución:**

```bash
docker-compose down -v
```

---

## Consideraciones importantes

### 1. Base de datos local por desarrollador

Cada integrante del equipo tiene su propia base de datos:

* Los datos NO se comparten automáticamente
* Cada quien trabaja con su propio contenedor

---

### 2. Cómo compartir datos


* Insertar datos mediante el backend
* Usar una base de datos en la nube (más adelante)

---

### 3. No modificar la base manualmente sin control

* Evitar cambios directos sin documentar
* Mantener actualizado `init.sql`

---


## Notas técnicas

* MySQL versión 8
* Motor de almacenamiento: InnoDB
* Uso de claves foráneas (FK)
* Integridad referencial activa

---

## Buenas prácticas

* Usar nombres consistentes (`snake_case`)
* Validar datos también en el backend
* No confiar únicamente en la base de datos
* Versionar cambios en el script SQL

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
docker-compose logs -f
```

---

## Estado actual

* Base de datos inicial (Sprint 1)
* Tablas principales implementadas
* Lista para conexión con backend

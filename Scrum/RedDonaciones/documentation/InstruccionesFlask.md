# Guía rápida de Flask

## Documentación sugerida

## Contexto

Este proyecto utiliza **Flask** como backend para exponer una API REST que conecta el frontend con MySQL.

---

## ¿Qué cambia respecto a otras APIs?

En Flask:

* No hay controladores como en Spring o Express estructurado
* Se usan **Blueprints** para organizar endpoints
* Todo es más manual pero también más flexible

---


## 1. Blueprints (CLAVE en Flask)

Los Blueprints permiten dividir la API en módulos.

Ejemplo:

```python
from flask import Blueprint

usuario_bp = Blueprint("usuario", __name__)
```

Esto representa un grupo de endpoints (`/usuarios`)

---

## 2. Crear un endpoint en Flask

```python
@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    return {"message": "ok"}
```

Es equivalente a:

```text
GET /usuarios
```

---

## ⚠️ IMPORTANTE: Registrar el Blueprint

Si no se hace esto, el endpoint NO funciona

En `app.py`:

```python
from routes.usuario import usuario_bp

app.register_blueprint(usuario_bp)
```

---

## 3. Conexión a la base de datos

Archivo: `db/connection.py`

```python
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
```

---

## 4. Uso dentro de un endpoint

```python
conn = get_db_connection()
cursor = conn.cursor()

cursor.execute("SELECT * FROM usuario")
data = cursor.fetchall()

cursor.close()
conn.close()
```

---

## 5. Cómo llamar un endpoint

Desde el frontend o navegador:

```text
http://localhost:5000/usuarios
```

---

## 6. Cómo devolver datos

Flask usa JSON:

```python
from flask import jsonify

return jsonify(data)
```

---

## 7. Métodos HTTP en Flask

```python
@route("/usuarios", methods=["GET"])     # obtener
@route("/usuarios", methods=["POST"])    # crear
@route("/usuarios", methods=["PUT"])     # actualizar
@route("/usuarios", methods=["DELETE"])  # eliminar
```

---

## 8. Ejemplo real (GET usuarios)

```python
@usuario_bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuario")
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)
```

---

## ⚠️ Errores comunes en Flask

### ❌ No registrar el Blueprint

Endpoint no existe

---

### ❌ No cerrar conexión

Problemas de rendimiento

---

### ❌ No usar jsonify

Respuesta incorrecta

---

### ❌ Usar localhost en Docker

Debe ser:

```python
host="db"
```

---

### No hacer commit()

INSERT no guarda datos

---

## Cómo trabajar en este proyecto

Para agregar un nuevo endpoint:

1. Crear archivo en `routes/`
2. Definir Blueprint
3. Crear rutas
4. Registrar en `app.py`

---

# Guía rápida de pruebas unitarias

## Cosas previas
El proyecto utiliza dos herramientas para realizar pruebas unitarias:

* **Pytest** → Backend (Flask).
* **Vitest + React Testing Library** → Frontend (React + Vite).

Todas las pruebas se ejecutan mediante **Docker**, por lo que no es necesario instalar Pytest, Vitest o dependencias adicionales en la computadora.

---

# Backend (Pytest)

Las pruebas del backend se encuentran en:

```text
backend/tests/
```

Actualmente incluyen pruebas del endpoint de **inicio de sesión (login)**.

## Ejecutar todas las pruebas del backend

```bash
docker compose exec backend pytest -v
```

La opción `-v` (verbose) muestra el nombre de cada prueba y si pasó o falló.

---

## Ejecutar un archivo específico

Por ejemplo, para ejecutar únicamente las pruebas del login:

```bash
docker compose exec backend pytest tests/test_login.py -v
```

---

## Ejecutar una sola prueba

Ejemplo:

```bash
docker compose exec backend pytest tests/test_login.py::test_login_exitoso -v
```

También se puede ejecutar cualquier otro test reemplazando el nombre de la función.

---

## ¿Por qué no usan la base de datos?

Estas pruebas son **unitarias**.

La conexión a MySQL se reemplaza mediante **monkeypatch**, utilizando una conexión simulada (DummyConn).

Esto permite:

* No modificar datos reales.
* Ejecutar las pruebas rápidamente.
* Probar únicamente la lógica del endpoint.

Si en el futuro cambia la forma de obtener la conexión a la base de datos, deberá actualizarse el `monkeypatch` correspondiente.

---

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

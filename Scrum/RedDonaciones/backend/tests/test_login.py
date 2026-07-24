import os
import bcrypt

# -----------------------------------------------------------------------------
# Configuración para las pruebas unitarias del endpoint POST /login
#
# Estas pruebas NO utilizan la base de datos real.
# Solo esta para detectar errores en la lógica de la función login() y en la generación del token JWT.
# Se reemplaza la función get_db_connection() mediante monkeypatch para devolver una conexión simulada (DummyConn).
#
# Si algo falla, hay algún error de lógica 
# -----------------------------------------------------------------------------


def crear_conexion_mock(usuario_mock):
    """
    Crea una conexión simulada para reemplazar MySQL durante las pruebas.
    """

    class DummyCursor:
        def execute(self, sql, params=None):
            return None

        def fetchone(self):
            return usuario_mock

        def close(self):
            pass

    class DummyConn:
        def cursor(self, dictionary=True):
            return DummyCursor()

        def close(self):
            pass

    return DummyConn()


# -----------------------------------------------------------------------------
# CASO 1: Login exitoso
# Se simula un usuario válido almacenado en la base de datos con contraseña
# encriptada mediante bcrypt.
# Resultado esperado:
#   HTTP 200
#   Mensaje "Login exitoso"
#   Token JWT

def test_login_exitoso(client, monkeypatch):

    os.environ["JWT_SECRET_KEY"] = "test-secret"

    usuario_mock = {
        "id_usuario": 1,
        "nombre": "Ana",
        "correo": "ana@test.com",
        "telefono": "12345678",
        "password": bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt()
        ).decode(),
        "rol": "donante",
        "activo": 1,
    }

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(usuario_mock)
    )

    response = client.post(
        "/login",
        json={
            "correo": "ana@test.com",
            "password": "12345678"
        }
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["message"] == "Login exitoso"
    assert data["usuario"]["correo"] == "ana@test.com"
    assert "token" in data


# -----------------------------------------------------------------------------
# CASO 2: Contraseña incorrecta
# El usuario existe pero la contraseña enviada no coincide con el hash almacenado.
# Resultado esperado:
#   HTTP 401

def test_login_password_incorrecta(client, monkeypatch):

    os.environ["JWT_SECRET_KEY"] = "test-secret"

    usuario_mock = {
        "id_usuario": 1,
        "nombre": "Ana",
        "correo": "ana@test.com",
        "telefono": "12345678",
        "password": bcrypt.hashpw(
            b"correcta123",
            bcrypt.gensalt()
        ).decode(),
        "rol": "donante",
        "activo": 1,
    }

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(usuario_mock)
    )

    response = client.post(
        "/login",
        json={
            "correo": "ana@test.com",
            "password": "incorrecta"
        }
    )

    assert response.status_code == 401
    assert response.get_json()["error"] == "Credenciales invalidas"


# -----------------------------------------------------------------------------
# CASO 3: Usuario inexistente
# Se simula que la consulta SQL no encuentra ningún usuario.
# Resultado esperado:
#   HTTP 401

def test_login_usuario_inexistente(client, monkeypatch):

    os.environ["JWT_SECRET_KEY"] = "test-secret"

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(None)
    )

    response = client.post(
        "/login",
        json={
            "correo": "noexiste@test.com",
            "password": "12345678"
        }
    )

    assert response.status_code == 401
    assert response.get_json()["error"] == "Credenciales invalidas"


# -----------------------------------------------------------------------------
# CASO 4: Usuario desactivado
# El usuario existe pero el administrador desactivó su cuenta.
# Resultado esperado:
#   HTTP 403
def test_login_usuario_desactivado(client, monkeypatch):

    os.environ["JWT_SECRET_KEY"] = "test-secret"

    usuario_mock = {
        "id_usuario": 1,
        "nombre": "Ana",
        "correo": "ana@test.com",
        "telefono": "12345678",
        "password": bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt()
        ).decode(),
        "rol": "donante",
        "activo": 0,
    }

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(usuario_mock)
    )

    response = client.post(
        "/login",
        json={
            "correo": "ana@test.com",
            "password": "12345678"
        }
    )

    assert response.status_code == 403
    assert response.get_json()["error"] == (
        "Esta cuenta está desactivada. Por favor contacte al administrador."
    )
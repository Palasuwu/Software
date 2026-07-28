
import os
import jwt
# -----------------------------------------------------------------------------
# Configuración para las pruebas unitarias para el registro de usuarios y permisos de admin
#
# Estas pruebas NO utilizan la base de datos real.
# Solo esta para detectar errores en la lógica
# Se reemplaza la función get_db_connection() mediante monkeypatch para devolver una conexión simulada (DummyConn).
#
# Si algo falla, hay algún error de lógica 
# --------
# Se crea conexión mock
def crear_conexion_mock(resultados_fetchone=None, resultado_fetchall=None, error=None):
    class DummyCursor:
        def __init__(self):
            self.resultados_fetchone = resultados_fetchone or []
            self.resultado_fetchall = resultado_fetchall
            self.error = error
            self.executed_queries = []
            self.indice = 0
            self.lastrowid = 7
        def execute(self, sql, params=None):
            self.executed_queries.append((sql, params))
            if self.error:
                raise self.error
        def fetchone(self):
            if self.indice < len(self.resultados_fetchone):
                resultado = self.resultados_fetchone[self.indice]
                self.indice += 1
                return resultado
            return None
        def fetchall(self):
            return self.resultado_fetchall or []
        def close(self):
            pass
    class DummyConn:
        def __init__(self):
            self.cursor_obj = DummyCursor()
        def cursor(self, dictionary=True):
            return self.cursor_obj
        def commit(self):
            pass
        def rollback(self):
            pass
        def close(self):
            pass
    return DummyConn()

# Para comprobar que si se esten registrando bien
def test_registro_usuario_exitoso(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"

    conn_mock = crear_conexion_mock()

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: conn_mock
    )

    response = client.post(
        "/usuarios",
        json={
            "nombre": "Carlos Perez",
            "correo": "carlos@test.com",
            "password": "clave1234",
            "telefono": "22223333",
            "rol": "donante",
            "departamento": "San Salvador",
            "municipio": "San Salvador",
            "zona": "1",
            "direccion_detalle": "Colonia Centro 1"
        }
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Usuario creado"
    assert data["usuario"]["correo"] == "carlos@test.com"
    assert data["usuario"]["rol"] == "donante"

# Si tiene una contraseña que no es válida
def test_registro_usuario_password_invalido(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: crear_conexion_mock())
    response = client.post(
        "/usuarios",
        json={
            "nombre": "Carlos Perez",
            "correo": "carlos@test.com",
            "password": "1234567",
            "telefono": "22223333",
            "rol": "donante",
            "departamento": "San Salvador",
            "municipio": "San Salvador",
            "zona": "1",
            "direccion_detalle": "Colonia Centro 1"
        }
    )
    assert response.status_code == 400
    assert "password" in response.get_json()["error"].lower() or "caracteres" in response.get_json()["error"].lower()

# Para las rutas protegidas que no tienen token
def test_acceso_protegido_sin_token(client):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    response = client.get("/usuarios")
    assert response.status_code == 401
    assert response.get_json()["error"] == "Token no proporcionado o malformado"

# Para verificar bien lo del acceso solo para admin
def test_acceso_admin_denegado_para_usuario_no_admin(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    token = self_make_token(
        {
            "id_usuario": 2,
            "rol": "donante",
            "id_organizacion": None,
            "exp": 9999999999,
            "iat": 1,
        },
        os.environ["JWT_SECRET_KEY"],
    )
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: crear_conexion_mock())
    response = client.get(
        "/usuarios",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Acceso denegado" in response.get_json()["error"]

# 
def test_acceso_a_perfil_propio_permitido(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(
            resultados_fetchone=[
                {
                    "id_usuario": 2,
                    "nombre": "Juan",
                    "correo": "juan@test.com",
                    "telefono": "22223333",
                    "rol": "donante",
                    "fecha_registro": "2024-01-01",
                },
                {
                    "departamento": "San Salvador",
                    "municipio": "San Salvador",
                    "zona": "1",
                    "direccion_detalle": "Colonia Centro"
                }
            ]
        ),
    )
    token = self_make_token(
        {
            "id_usuario": 2,
            "rol": "donante",
            "id_organizacion": None,
            "exp": 9999999999,
            "iat": 1,
        },
        os.environ["JWT_SECRET_KEY"],
    )
    response = client.get(
        "/usuarios/2",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Solo para depurar para ver que estaba fallando
    # print(response.status_code)
    # print(response.get_json())
    assert response.status_code == 200
    data = response.get_json()
    assert data["correo"] == "juan@test.com"
    assert data["rol"] == "donante"


# Para probar los permisos de admin 
def test_acceso_admin_permitido_para_admin(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: crear_conexion_mock(resultado_fetchall=[]),
    )
    token = self_make_token(
        {
            "id_usuario": 1,
            "rol": "administrador",
            "id_organizacion": None,
            "exp": 9999999999,
            "iat": 1,
        },
        os.environ["JWT_SECRET_KEY"],
    )
    response = client.get(
        "/usuarios",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

def self_make_token(payload, secret):
    return jwt.encode(payload, secret, algorithm="HS256")

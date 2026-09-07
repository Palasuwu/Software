# Tests para verificar las rutas privadas y la autenticación de usuarios en la API.
import os

import pytest

from auth_utils import generate_token
from test_usuarios import crear_conexion_mock


SECRET = "test-secret-key-with-at-least-32-bytes"


def token_usuario(id_usuario, rol):
    os.environ["JWT_SECRET_KEY"] = SECRET
    return generate_token(id_usuario, rol)


def auth_usuario(monkeypatch, id_usuario, rol, activo=1):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: {
            "id_usuario": id_usuario,
            "rol": rol,
            "activo": activo,
        },
    )


class CursorDonacion:
    def __init__(self, donacion, id_organizacion_intermediario=3):
        self.donacion = donacion
        self.id_organizacion_intermediario = id_organizacion_intermediario
        self.queries = []
        self.last_query = ""

    def execute(self, sql, params=None):
        self.last_query = sql
        self.queries.append((sql, params))

    def fetchone(self):
        if "FROM intermediario" in self.last_query:
            return {
                "id_organizacion": self.id_organizacion_intermediario
            }
        return self.donacion

    def fetchall(self):
        return []

    def close(self):
        pass


class ConnectionDonacion:
    def __init__(self, donacion, id_organizacion_intermediario=3):
        self.cursor_obj = CursorDonacion(
            donacion,
            id_organizacion_intermediario,
        )

    def cursor(self, dictionary=True):
        return self.cursor_obj

    def close(self):
        pass


def configurar_conexion_donacion(
    monkeypatch,
    donacion,
    id_organizacion_intermediario=3,
):
    connection = ConnectionDonacion(
        donacion,
        id_organizacion_intermediario,
    )
    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: connection,
    )
    return connection


def configurar_acceso_intermediario(monkeypatch, id_organizacion):
    monkeypatch.setattr(
        "routes.donacion._obtener_organizacion_actual_intermediario",
        lambda _: id_organizacion,
    )
    monkeypatch.setattr(
        "routes.donacion._organizacion_verificada",
        lambda _: True,
    )


def donacion_para_pruebas(id_donante=21, id_organizacion=3):
    return {
        "id_donacion": 4,
        "id_donante": id_donante,
        "id_publicacion": 5,
        "id_organizacion": id_organizacion,
        "estado": "pendiente",
        "publicacion_titulo": "Campaña de alimentos",
    }


DETALLE_INTERNO = (
    "Access denied for user root; "
    "password=secreta; tabla=usuario"
)


def simular_error_de_conexion(monkeypatch):
    def lanzar_error():
        raise RuntimeError(DETALLE_INTERNO)

    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lanzar_error,
    )
    monkeypatch.setattr(
        "db.connection.get_db_connection",
        lanzar_error,
    )


@pytest.mark.parametrize(
    ("metodo", "ruta", "datos", "mensaje"),
    [
        ("get", "/usuarios", None, "Error al obtener usuarios"),
        ("post", "/login", {"correo": "a@b.com", "password": "clave1234"}, "Error al iniciar sesion"),
        ("put", "/usuarios/7/desactivar", None, "No se pudo desactivar el usuario"),
        ("put", "/usuarios/7/activar", None, "No se pudo activar el usuario"),
        ("put", "/usuarios/7/anonimizar", None, "No se pudo anonimizar el usuario"),
    ],
)
def test_endpoints_usuario_no_exponen_error_interno(
    client,
    monkeypatch,
    metodo,
    ruta,
    datos,
    mensaje,
):
    if ruta != "/login":
        auth_usuario(monkeypatch, 1, "administrador")

    simular_error_de_conexion(monkeypatch)
    token = token_usuario(1, "administrador")
    headers = {"Authorization": f"Bearer {token}"} if ruta != "/login" else None

    response = getattr(client, metodo)(
        ruta,
        json=datos,
        headers=headers,
    )

    assert response.status_code == 500
    assert response.get_json() == {"error": mensaje}
    assert "detalle" not in response.get_json()
    assert DETALLE_INTERNO not in response.get_data(as_text=True)


def test_token_de_usuario_desactivado_es_rechazado(client, monkeypatch):
    auth_usuario(monkeypatch, 7, "donante", activo=0)
    token = token_usuario(7, "donante")

    response = client.get(
        "/donaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Token inválido o usuario no autorizado"
    }


def test_usuario_inexistente_es_rechazado(client, monkeypatch):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: None,
    )
    token = token_usuario(12, "donante")

    response = client.get(
        "/donaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Token inválido o usuario no autorizado"
    }


def test_rol_cambiado_en_bd_es_rechazado(client, monkeypatch):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: {
            "id_usuario": 13,
            "rol": "intermediario",
            "activo": 1,
        },
    )
    token = token_usuario(13, "donante")

    response = client.get(
        "/donaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Token inválido o usuario no autorizado"
    }


def test_error_de_bd_no_expone_detalle(client, monkeypatch):
    detalle = "password de MySQL o tabla usuario"

    def lanzar_error(_):
        raise RuntimeError(detalle)

    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lanzar_error,
    )
    token = token_usuario(14, "donante")

    response = client.get(
        "/donaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 500
    assert response.get_json() == {
        "error": "No se pudo validar la sesión"
    }
    assert detalle not in response.get_data(as_text=True)


def test_detalle_donacion_propietario_obtiene_200_y_consulta_organizacion(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 21, "donante")
    connection = configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(),
    )
    token = token_usuario(21, "donante")

    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert any(
        "p.id_organizacion" in query
        for query, _ in connection.cursor_obj.queries
    )


def test_detalle_donacion_donante_ajeno_obtiene_404(client, monkeypatch):
    auth_usuario(monkeypatch, 22, "donante")
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(id_donante=21),
    )
    token = token_usuario(22, "donante")

    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Donación no encontrada"}


def test_detalle_donacion_intermediario_de_organizacion_obtiene_200(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 30, "intermediario")
    configurar_acceso_intermediario(monkeypatch, 3)
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(id_organizacion=3),
    )
    token = token_usuario(30, "intermediario")

    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_detalle_donacion_intermediario_de_otra_organizacion_obtiene_404(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 31, "intermediario")
    configurar_acceso_intermediario(monkeypatch, 9)
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(id_organizacion=3),
    )
    token = token_usuario(31, "intermediario")

    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def test_detalle_donacion_administrador_obtiene_200(client, monkeypatch):
    auth_usuario(monkeypatch, 1, "administrador")
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(),
    )
    token = token_usuario(1, "administrador")

    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_estado_donacion_propietario_obtiene_200(client, monkeypatch):
    auth_usuario(monkeypatch, 21, "donante")
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(),
    )
    token = token_usuario(21, "donante")

    response = client.get(
        "/donaciones/4/estado",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_estado_donacion_donante_ajeno_obtiene_404(client, monkeypatch):
    auth_usuario(monkeypatch, 22, "donante")
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(id_donante=21),
    )
    token = token_usuario(22, "donante")

    response = client.get(
        "/donaciones/4/estado",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Donación no encontrada"}


def test_donante_no_puede_cambiar_estado_obtiene_403(client, monkeypatch):
    auth_usuario(monkeypatch, 21, "donante")
    token = token_usuario(21, "donante")

    response = client.put(
        "/donaciones/4/estado",
        json={"estado": "recibida"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_intermediario_de_otra_organizacion_no_puede_cambiar_estado(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 31, "intermediario")
    configurar_acceso_intermediario(monkeypatch, 9)
    configurar_conexion_donacion(
        monkeypatch,
        donacion_para_pruebas(id_organizacion=3),
    )
    token = token_usuario(31, "intermediario")

    response = client.put(
        "/donaciones/4/estado",
        json={"estado": "recibida"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def datos_registro_intermediario():
    return {
        "nombre": "Intermediario Nuevo",
        "correo": "intermediario.nuevo@test.com",
        "password": "clave1234",
        "telefono": "22223333",
        "rol": "intermediario",
        "id_organizacion": 3,
        "cargo": "Coordinador",
    }


def test_registro_publico_intermediario_requiere_token(client):
    response = client.post(
        "/usuarios",
        json=datos_registro_intermediario(),
    )

    assert response.status_code == 401


def test_donante_no_puede_crear_intermediario(client, monkeypatch):
    auth_usuario(monkeypatch, 15, "donante")
    token = token_usuario(15, "donante")

    response = client.post(
        "/usuarios",
        json=datos_registro_intermediario(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_administrador_puede_crear_intermediario(client, monkeypatch):
    auth_usuario(monkeypatch, 1, "administrador")
    connection = crear_conexion_mock(
        resultados_fetchone=[{"id_organizacion": 3}]
    )
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: connection,
    )
    token = token_usuario(1, "administrador")

    response = client.post(
        "/usuarios",
        json=datos_registro_intermediario(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    assert response.get_json()["usuario"]["rol"] == "intermediario"


def test_intermediario_no_puede_cambiar_su_organizacion(client, monkeypatch):
    auth_usuario(monkeypatch, 8, "intermediario")

    class Cursor:
        def __init__(self):
            self.queries = []

        def execute(self, sql, params=None):
            self.queries.append(sql)

        def fetchone(self):
            return {"id_usuario": 8, "rol": "intermediario"}

        def close(self):
            pass

    class Connection:
        def __init__(self):
            self.cursor_obj = Cursor()

        def cursor(self, dictionary=True):
            return self.cursor_obj

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            pass

    connection = Connection()
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: connection,
    )
    token = token_usuario(8, "intermediario")

    response = client.put(
        "/usuarios/8",
        json={
            "nombre": "Intermediario Actualizado",
            "correo": "intermediario@test.com",
            "telefono": "22223333",
            "cargo": "Coordinador",
            "id_organizacion": 999,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "La organización no puede modificarse desde el perfil"
    }
    assert not any(
        "UPDATE usuario" in query
        for query in connection.cursor_obj.queries
    )
    assert not any(
        "UPDATE intermediario" in query
        for query in connection.cursor_obj.queries
    )


def test_intermediario_actualiza_datos_sin_cambiar_organizacion(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 8, "intermediario")

    class Cursor:
        def __init__(self):
            self.queries = []

        def execute(self, sql, params=None):
            self.queries.append(sql)

        def fetchone(self):
            return {
                "id_usuario": 8,
                "nombre": "Intermediario Actualizado",
                "correo": "intermediario@test.com",
                "telefono": "22223333",
                "rol": "intermediario",
            }

        def close(self):
            pass

    class Connection:
        def __init__(self):
            self.cursor_obj = Cursor()

        def cursor(self, dictionary=True):
            return self.cursor_obj

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            pass

    connection = Connection()
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: connection,
    )
    token = token_usuario(8, "intermediario")

    response = client.put(
        "/usuarios/8",
        json={
            "nombre": "Intermediario Actualizado",
            "correo": "intermediario@test.com",
            "telefono": "22223333",
            "cargo": "Coordinador",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    updates_intermediario = [
        query for query in connection.cursor_obj.queries
        if "UPDATE intermediario" in query
    ]
    assert len(updates_intermediario) == 1
    assert "SET cargo = %s" in updates_intermediario[0]
    assert "id_organizacion" not in updates_intermediario[0]


def test_donante_no_puede_ejecutar_operaciones_de_intermediario(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 9, "donante")
    token = token_usuario(9, "donante")

    response = client.get(
        "/intermediario/publicaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_intermediario_solo_consulta_donaciones_de_su_organizacion(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 10, "intermediario")
    monkeypatch.setattr(
        "auth_utils._obtener_organizacion_actual_intermediario",
        lambda _: 3,
    )
    monkeypatch.setattr(
        "routes.donacion._obtener_organizacion_actual_intermediario",
        lambda _: 3,
    )
    monkeypatch.setattr(
        "auth_utils._organizacion_verificada",
        lambda _: True,
    )
    monkeypatch.setattr(
        "routes.donacion._organizacion_verificada",
        lambda _: True,
    )
    token = token_usuario(10, "intermediario")

    class Cursor:
        def __init__(self, donacion):
            self.donacion = donacion
            self.step = 0

        def execute(self, sql, params=None):
            pass

        def fetchone(self):
            self.step += 1
            if self.step == 1:
                return self.donacion
            return {"id_organizacion": 3}

        def fetchall(self):
            return []

        def close(self):
            pass

    class Connection:
        def __init__(self, donacion):
            self.cursor_obj = Cursor(donacion)

        def cursor(self, dictionary=True):
            return self.cursor_obj

        def close(self):
            pass

    donacion = {
        "id_donacion": 4,
        "id_donante": 20,
        "id_publicacion": 5,
        "id_organizacion": 4,
    }
    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: Connection(donacion),
    )
    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404

    donacion["id_organizacion"] = 3
    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: Connection(donacion),
    )
    response = client.get(
        "/donaciones/4",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_organizacion_no_verificada_bloquea_ruta_institucional(
    client,
    monkeypatch,
):
    auth_usuario(monkeypatch, 11, "intermediario")
    monkeypatch.setattr(
        "auth_utils._obtener_organizacion_actual_intermediario",
        lambda _: 3,
    )
    monkeypatch.setattr(
        "auth_utils._organizacion_verificada",
        lambda _: False,
    )
    token = token_usuario(11, "intermediario")

    response = client.get(
        "/intermediario/publicaciones",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403

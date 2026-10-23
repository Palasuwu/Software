import mysql.connector
import pytest
from auth_utils import generate_token

SECRET = "test-editar-perfil-con-al-menos-32-bytes"
DONANTE = {
    "nombre": "  Lucia   Perez ",
    "correo": " Lucia@Correo.COM ",
    "telefono": "5555-1234",
    "departamento": "Guatemala",
    "municipio": "Mixco",
    "zona": "4",
    "direccion_detalle": "Calle 5, casa 12",
}


class CursorPerfil:
    def __init__(self, rol, error_en=None):
        self.rol = rol
        self.error_en = error_en
        self.consultas = []
        self.ultima = ""

    def execute(self, sql, params=None):
        sql = " ".join(sql.split())
        if self.error_en and self.error_en in sql:
            raise mysql.connector.IntegrityError(msg="Duplicate entry 'lucia@correo.com' for key 'usuario.correo'")
        self.consultas.append((sql, params))
        self.ultima = sql

    def fetchone(self):
        if self.ultima.startswith("SELECT id_usuario, rol FROM usuario"):
            return {"id_usuario": 7, "rol": self.rol}
        if self.ultima.startswith("SELECT id_usuario, nombre"):
            return {"id_usuario": 7, "nombre": "Lucia Perez", "correo": "lucia@correo.com", "telefono": "5555-1234", "rol": self.rol, "fecha_registro": None}
        if "FROM donante" in self.ultima:
            return {"departamento": "Guatemala", "municipio": "Mixco", "zona": "4", "direccion_detalle": "Calle 5, casa 12"}
        if "FROM intermediario" in self.ultima:
            return {"id_organizacion": 1, "cargo": "Coordinadora", "organizacion_nombre": "Org"}
        return None

    def escrituras(self):
        return [(sql, p) for sql, p in self.consultas if sql.startswith("UPDATE")]

    def close(self):
        self.cerrado = True


class ConexionPerfil:
    def __init__(self, cursor):
        self.cursor_obj = cursor
        self.commits = 0
        self.rollbacks = 0

    def cursor(self, dictionary=False):
        return self.cursor_obj

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass


@pytest.fixture
def sesion(monkeypatch):
    def iniciar(rol="donante", id_usuario=7, error_en=None):
        monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
        monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda uid: {"id_usuario": uid, "rol": rol, "activo": 1})
        conn = ConexionPerfil(CursorPerfil("intermediario" if rol == "intermediario" else "donante", error_en))
        monkeypatch.setattr("routes.usuario.get_db_connection", lambda: conn)
        return conn, {"Authorization": f"Bearer {generate_token(id_usuario, rol)}"}
    return iniciar


def test_donante_actualiza_su_perfil_con_datos_limpios(client, sesion):
    conn, headers = sesion()
    response = client.put("/usuarios/7", json=DONANTE, headers=headers)
    assert response.status_code == 200
    assert response.get_json()["usuario"]["perfil"]["municipio"] == "Mixco"

    escrituras = conn.cursor_obj.escrituras()
    assert escrituras[0][1] == ("Lucia Perez", "lucia@correo.com", "5555-1234", 7)
    assert escrituras[1][0].startswith("UPDATE donante")
    assert escrituras[1][1] == ("Guatemala", "Mixco", "4", "Calle 5, casa 12", 7)
    assert conn.commits == 1


def test_no_puede_editar_el_perfil_de_otro_usuario(client, sesion, monkeypatch):
    _, headers = sesion(id_usuario=8)
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: pytest.fail("No debe tocar la base de datos"))
    response = client.put("/usuarios/7", json=DONANTE, headers=headers)
    assert response.status_code == 403


def test_editar_perfil_requiere_sesion(client):
    assert client.put("/usuarios/7", json=DONANTE).status_code == 401


@pytest.mark.parametrize("cambios", [
    {"nombre": "Al"},
    {"nombre": "Lucia 123"},
    {"correo": "lucia@"},
    {"telefono": "123"},
], ids=["nombre-corto", "nombre-con-numeros", "correo-invalido", "telefono-corto"])
def test_datos_basicos_invalidos_no_se_guardan(client, sesion, monkeypatch, cambios):
    _, headers = sesion()
    monkeypatch.setattr("routes.usuario.get_db_connection", lambda: pytest.fail("No debe tocar la base de datos"))
    response = client.put("/usuarios/7", json={**DONANTE, **cambios}, headers=headers)
    assert response.status_code == 400
    assert response.get_json()["campos"]


@pytest.mark.parametrize("cambios", [
    {"zona": ""},
    {"zona": "abc"},
    {"zona": "123"},
    {"direccion_detalle": "Casa 1"},
], ids=["sin-zona", "zona-texto", "zona-3-digitos", "direccion-corta"])
def test_direccion_invalida_revierte_los_cambios(client, sesion, cambios):
    conn, headers = sesion()
    response = client.put("/usuarios/7", json={**DONANTE, **cambios}, headers=headers)
    assert response.status_code == 400
    assert conn.commits == 0
    assert conn.rollbacks == 1


def test_no_se_puede_cambiar_el_rol_desde_el_perfil(client, sesion):
    conn, headers = sesion()
    response = client.put("/usuarios/7", json={**DONANTE, "rol": "administrador"}, headers=headers)
    assert response.status_code == 400
    assert conn.cursor_obj.escrituras() == []
    assert conn.commits == 0


def test_intermediario_no_cambia_su_organizacion(client, sesion):
    conn, headers = sesion("intermediario")
    datos = {**DONANTE, "cargo": "Coordinadora", "id_organizacion": 2}
    response = client.put("/usuarios/7", json=datos, headers=headers)
    assert response.status_code == 400
    assert conn.cursor_obj.escrituras() == []
    assert conn.commits == 0


@pytest.mark.parametrize("cargo,esperado", [("  Jefa   de bodega ", 200), ("", 400), ("ab", 400)])
def test_intermediario_actualiza_su_cargo(client, sesion, cargo, esperado):
    conn, headers = sesion("intermediario")
    response = client.put("/usuarios/7", json={**DONANTE, "cargo": cargo}, headers=headers)
    assert response.status_code == esperado
    if esperado == 200:
        assert conn.cursor_obj.escrituras()[1][1] == ("Jefa de bodega", 7)
        assert conn.commits == 1
    else:
        assert conn.commits == 0


def test_correo_repetido_responde_409(client, sesion):
    conn, headers = sesion(error_en="UPDATE usuario")
    response = client.put("/usuarios/7", json=DONANTE, headers=headers)
    assert response.status_code == 409
    assert "correo" in response.get_json()["error"]
    assert conn.rollbacks == 1
    assert conn.commits == 0

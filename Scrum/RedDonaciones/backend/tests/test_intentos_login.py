import os
from datetime import datetime, timedelta

import bcrypt

from db.intentos_login import MAX_INTENTOS_FALLIDOS

# Pruebas del limitador de intentos de inicio de sesion (bloqueo tras varios
# intentos fallidos consecutivos).


class UsuarioLoginState:
    def __init__(self, password_plano, intentos_fallidos=0, bloqueado_hasta=None):
        self.id_usuario = 1
        self.correo = "ana@test.com"
        self.password_hash = bcrypt.hashpw(
            password_plano.encode(), bcrypt.gensalt()
        ).decode()
        self.activo = 1
        self.intentos_fallidos = intentos_fallidos
        self.bloqueado_hasta = bloqueado_hasta

    def as_row(self):
        return {
            "id_usuario": self.id_usuario,
            "nombre": "Ana",
            "correo": self.correo,
            "telefono": "12345678",
            "password": self.password_hash,
            "rol": "donante",
            "activo": self.activo,
            "intentos_fallidos": self.intentos_fallidos,
            "bloqueado_hasta": self.bloqueado_hasta,
        }


class LoginCursor:
    def __init__(self, estado):
        self.estado = estado
        self._resultado = None

    def execute(self, sql, params=None):
        sql_norm = " ".join(sql.split())

        if "information_schema.COLUMNS" in sql_norm:
            self._resultado = {"total": 1}

        elif sql_norm.startswith("SELECT id_usuario, nombre, correo"):
            self._resultado = self.estado.as_row()

        elif "SET intentos_fallidos = 0" in sql_norm and "bloqueado_hasta = DATE_ADD" in sql_norm:
            self.estado.intentos_fallidos = 0
            self.estado.bloqueado_hasta = datetime.now() + timedelta(minutes=params[0])

        elif sql_norm.startswith("UPDATE usuario SET intentos_fallidos = %s"):
            self.estado.intentos_fallidos = params[0]

        elif "intentos_fallidos = 0, bloqueado_hasta = NULL" in sql_norm:
            self.estado.intentos_fallidos = 0
            self.estado.bloqueado_hasta = None

        else:
            self._resultado = None

    def fetchone(self):
        return self._resultado

    def close(self):
        pass


class LoginConexion:
    def __init__(self, estado):
        self.cursor_mock = LoginCursor(estado)

    def cursor(self, dictionary=True):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def _login(client, monkeypatch, estado, password):
    monkeypatch.setattr(
        "routes.usuario.get_db_connection",
        lambda: LoginConexion(estado)
    )
    return client.post(
        "/login",
        json={"correo": estado.correo, "password": password}
    )


def test_bloquea_cuenta_tras_maximo_de_intentos_fallidos(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    estado = UsuarioLoginState("correcta123")

    for _ in range(MAX_INTENTOS_FALLIDOS - 1):
        response = _login(client, monkeypatch, estado, "incorrecta")
        assert response.status_code == 401

    assert estado.bloqueado_hasta is None

    # Este es el intento que llega al limite y debe bloquear la cuenta.
    response = _login(client, monkeypatch, estado, "incorrecta")
    assert response.status_code == 401
    assert estado.bloqueado_hasta is not None
    assert estado.intentos_fallidos == 0


def test_rechaza_login_mientras_la_cuenta_este_bloqueada(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    estado = UsuarioLoginState(
        "correcta123",
        bloqueado_hasta=datetime.now() + timedelta(minutes=10)
    )

    # Aunque la password sea correcta, la cuenta sigue bloqueada.
    response = _login(client, monkeypatch, estado, "correcta123")

    assert response.status_code == 429
    assert "Demasiados intentos" in response.get_json()["error"]


def test_login_correcto_reinicia_el_contador_de_intentos(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    estado = UsuarioLoginState("correcta123", intentos_fallidos=3)

    response = _login(client, monkeypatch, estado, "correcta123")

    assert response.status_code == 200
    assert estado.intentos_fallidos == 0
    assert estado.bloqueado_hasta is None


def test_login_permitido_despues_de_expirar_el_bloqueo(client, monkeypatch):
    os.environ["JWT_SECRET_KEY"] = "test-secret"
    estado = UsuarioLoginState(
        "correcta123",
        bloqueado_hasta=datetime.now() - timedelta(minutes=1)
    )

    response = _login(client, monkeypatch, estado, "correcta123")

    assert response.status_code == 200

import os
import pytest
from app import app
from auth_utils import generate_token
from services.donacion_service import (
    cambiar_estado_donacion,
    cambiar_estado_donaciones_masivo,
    crear_notificacion,
)
from services.notificacion_service import (
    generar_recordatorios_donaciones_pendientes,
)


class NotificacionesMockCursor:
    def __init__(self, notificaciones=None, donaciones=None, donante_id=1, intermediario_id=2):
        self.notificaciones = notificaciones or []
        self.donaciones = donaciones or {}
        self.donante_id = donante_id
        self.intermediario_id = intermediario_id
        self.operaciones = []
        self.last_query = ""
        self.rowcount = 0
        self.lastrowid = 1
        self._current_donacion = None

    def execute(self, sql, params=None):
        sql_norm = " ".join(sql.split())
        self.last_query = sql_norm
        self.operaciones.append((sql_norm, params))

        if sql_norm.startswith("INSERT INTO notificacion") and "VALUES" in sql_norm:
            id_usuario, tipo, titulo, mensaje, enlace = params
            nuevo_id = len(self.notificaciones) + 1
            self.notificaciones.append({
                "id_notificacion": nuevo_id,
                "id_usuario": id_usuario,
                "tipo": tipo,
                "titulo": titulo,
                "mensaje": mensaje,
                "enlace": enlace,
                "leida": 0,
                "fecha_creacion": "2026-08-18 10:00:00",
                "fecha_lectura": None
            })
            self.lastrowid = nuevo_id

        elif sql_norm.startswith("INSERT INTO notificacion") and "SELECT" in sql_norm:
            id_usuario = params[0]
            for don in self.donaciones.values():
                if don["id_donante"] == id_usuario and don["estado"] == "pendiente":
                    enlace = f"/donaciones/{don['id_donacion']}"
                    ya_existe = any(n["id_usuario"] == id_usuario and n["tipo"] == "recordatorio_donacion_pendiente" and n["enlace"] == enlace for n in self.notificaciones)
                    if not ya_existe:
                        self.notificaciones.append({
                            "id_notificacion": len(self.notificaciones) + 1,
                            "id_usuario": id_usuario,
                            "tipo": "recordatorio_donacion_pendiente",
                            "titulo": "Tienes una entrega pendiente",
                            "mensaje": f"Recuerda coordinar la entrega de tu donación para {don['publicacion_titulo']}.",
                            "enlace": enlace,
                            "leida": 0,
                            "fecha_creacion": "2026-08-18 10:00:00",
                            "fecha_lectura": None
                        })

        elif sql_norm.startswith("SELECT") and "FROM donacion" in sql_norm and "WHERE d.id_donacion = %s" in sql_norm:
            self._current_donacion = self.donaciones.get(params[0])

        elif sql_norm.startswith("UPDATE donacion SET estado"):
            estado, id_donacion = params
            if id_donacion in self.donaciones:
                self.donaciones[id_donacion]["estado"] = estado
                self.rowcount = 1

        elif sql_norm.startswith("UPDATE notificacion SET leida = 1"):
            id_notif, id_user = params
            actualizada = False
            for n in self.notificaciones:
                if n["id_notificacion"] == id_notif and n["id_usuario"] == id_user:
                    n["leida"] = 1
                    n["fecha_lectura"] = "2026-08-18 11:00:00"
                    actualizada = True
            self.rowcount = 1 if actualizada else 0

        elif "FROM donante" in sql_norm:
            self._current_donacion = {"id_usuario": params[0]}

        elif "FROM publicacion" in sql_norm:
            self._current_donacion = {
                "id_publicacion": params[0],
                "id_intermediario": self.intermediario_id,
                "titulo": "Campaña Ropa",
                "cantidad_necesaria": 100,
                "cantidad_recibida": 20,
                "estado": "activa"
            }

        elif sql_norm.startswith("UPDATE publicacion"):
            self.rowcount = 1

        elif sql_norm.startswith("INSERT INTO donacion"):
            self.lastrowid = 100

    def fetchone(self):
        if "COUNT(*)" in self.last_query:
            id_usuario = self.operaciones[-1][1][0]
            conteo = sum(1 for n in self.notificaciones if n["id_usuario"] == id_usuario and not n["leida"])
            return {"total": conteo}

        if "FROM notificacion" in self.last_query:
            return None

        return self._current_donacion

    def fetchall(self):
        if "FROM notificacion" in self.last_query and "WHERE id_usuario = %s" in self.last_query:
            id_usuario = self.operaciones[-1][1][0]
            return [n for n in self.notificaciones if n["id_usuario"] == id_usuario]

        return []

    def close(self):
        pass


class NotificacionesMockConexion:
    def __init__(self, cursor_mock):
        self.cursor_mock = cursor_mock

    def cursor(self, dictionary=True):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def auth_headers(id_usuario, rol="donante"):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    token = generate_token(id_usuario, rol)
    return {"Authorization": f"Bearer {token}"}


def sample_donacion(id_donacion=1, id_donante=10, estado="pendiente"):
    return {
        "id_donacion": id_donacion,
        "id_donante": id_donante,
        "id_publicacion": 50,
        "id_organizacion": 3,
        "publicacion_titulo": "Campaña Solidaria",
        "estado": estado,
        "fecha_donacion": "2026-08-10"
    }


def test_notifica_donante_cambio_estado_individual():
    donaciones = {1: sample_donacion(1, id_donante=10, estado="pendiente")}
    cursor = NotificacionesMockCursor(donaciones=donaciones)

    resultado, error, codigo = cambiar_estado_donacion(cursor, 1, "recibida")

    assert error is None
    assert codigo == 200
    assert resultado["estado"] == "recibida"
    assert len(cursor.notificaciones) == 1

    notif = cursor.notificaciones[0]
    assert notif["id_usuario"] == 10
    assert notif["tipo"] == "estado_donacion"
    assert notif["titulo"] == "Estado de donación actualizado"
    assert "pendiente a recibida" in notif["mensaje"]
    assert notif["enlace"] == "/donaciones/1"


def test_notifica_donantes_cambio_estado_masivo():
    donaciones = {
        1: sample_donacion(1, id_donante=10, estado="pendiente"),
        2: sample_donacion(2, id_donante=20, estado="pendiente"),
        3: sample_donacion(3, id_donante=30, estado="entregada")
    }
    cursor = NotificacionesMockCursor(donaciones=donaciones)

    actualizadas, omitidas = cambiar_estado_donaciones_masivo(cursor, [1, 2, 3], "recibida")

    assert len(actualizadas) == 2
    assert len(omitidas) == 1
    assert len(cursor.notificaciones) == 2

    usuarios_notificados = [n["id_usuario"] for n in cursor.notificaciones]
    assert usuarios_notificados == [10, 20]


def test_no_notifica_en_transicion_invalida():
    donaciones = {1: sample_donacion(1, id_donante=10, estado="pendiente")}
    cursor = NotificacionesMockCursor(donaciones=donaciones)

    resultado, error, codigo = cambiar_estado_donacion(cursor, 1, "entregada")

    assert resultado is None
    assert codigo == 400
    assert "Transición de estado no permitida" in error
    assert len(cursor.notificaciones) == 0


def test_notificaciones_al_crear_nueva_donacion(client, monkeypatch):
    cursor = NotificacionesMockCursor(donante_id=10, intermediario_id=88)
    conn = NotificacionesMockConexion(cursor)

    monkeypatch.setattr("routes.donacion.get_db_connection", lambda: conn)

    payload = {
        "id_publicacion": 50,
        "descripcion": "Ropa",
        "nombre_contacto": "Carlos Donante",
        "telefono_contacto": "77778888",
        "hora_preferida": "10:00",
        "fecha_donacion": "2026-08-20",
        "cantidad_donada": 5
    }

    response = client.post(
        "/donaciones",
        json=payload,
        headers=auth_headers(id_usuario=10, rol="donante")
    )

    assert response.status_code == 201
    assert len(cursor.notificaciones) == 2

    notif_donante = next(n for n in cursor.notificaciones if n["tipo"] == "donacion_registrada")
    assert notif_donante["id_usuario"] == 10
    assert notif_donante["titulo"] == "Donacion registrada"
    assert "5 unidades" in notif_donante["mensaje"]

    notif_inter = next(n for n in cursor.notificaciones if n["tipo"] == "nueva_donacion")
    assert notif_inter["id_usuario"] == 88
    assert notif_inter["titulo"] == "Nueva donacion recibida"
    assert "Carlos Donante" in notif_inter["mensaje"]


def test_generar_recordatorios_donaciones_pendientes():
    donaciones = {
        1: sample_donacion(1, id_donante=10, estado="pendiente"),
        2: sample_donacion(2, id_donante=10, estado="pendiente")
    }
    cursor = NotificacionesMockCursor(donaciones=donaciones)

    generar_recordatorios_donaciones_pendientes(cursor, 10)

    assert len(cursor.notificaciones) == 2

    for n in cursor.notificaciones:
        assert n["tipo"] == "recordatorio_donacion_pendiente"
        assert n["titulo"] == "Tienes una entrega pendiente"
        assert n["enlace"].startswith("/donaciones/")

    generar_recordatorios_donaciones_pendientes(cursor, 10)
    assert len(cursor.notificaciones) == 2


def test_listar_notificaciones_y_conteo(client, monkeypatch):
    notifs = [
        {
            "id_notificacion": 1,
            "id_usuario": 10,
            "tipo": "estado_donacion",
            "titulo": "Estado actualizado",
            "mensaje": "Aviso",
            "enlace": "/donaciones/1",
            "leida": 0,
            "fecha_creacion": "2026-08-18 09:00:00",
            "fecha_lectura": None
        },
        {
            "id_notificacion": 2,
            "id_usuario": 10,
            "tipo": "donacion_registrada",
            "titulo": "Donacion registrada",
            "mensaje": "Registrada",
            "enlace": "/donaciones/2",
            "leida": 1,
            "fecha_creacion": "2026-08-18 08:00:00",
            "fecha_lectura": "2026-08-18 08:30:00"
        }
    ]
    cursor = NotificacionesMockCursor(notificaciones=notifs)
    conn = NotificacionesMockConexion(cursor)

    monkeypatch.setattr("routes.notificacion.get_db_connection", lambda: conn)

    response = client.get("/notificaciones", headers=auth_headers(id_usuario=10))

    assert response.status_code == 200
    data = response.get_json()
    assert data["total_no_leidas"] == 1
    assert len(data["notificaciones"]) == 2


def test_marcar_notificacion_como_leida_exitoso(client, monkeypatch):
    notifs = [
        {
            "id_notificacion": 5,
            "id_usuario": 10,
            "tipo": "estado_donacion",
            "titulo": "Aviso",
            "mensaje": "Texto",
            "enlace": None,
            "leida": 0,
            "fecha_creacion": "2026-08-18",
            "fecha_lectura": None
        }
    ]
    cursor = NotificacionesMockCursor(notificaciones=notifs)
    conn = NotificacionesMockConexion(cursor)

    monkeypatch.setattr("routes.notificacion.get_db_connection", lambda: conn)

    response = client.patch(
        "/notificaciones/5/leer",
        headers=auth_headers(id_usuario=10)
    )

    assert response.status_code == 200
    assert notifs[0]["leida"] == 1
    assert notifs[0]["fecha_lectura"] is not None


def test_marcar_notificacion_otro_usuario_rechazado(client, monkeypatch):
    notifs = [
        {
            "id_notificacion": 5,
            "id_usuario": 99,
            "tipo": "estado_donacion",
            "titulo": "Aviso",
            "mensaje": "Texto",
            "enlace": None,
            "leida": 0,
            "fecha_creacion": "2026-08-18",
            "fecha_lectura": None
        }
    ]
    cursor = NotificacionesMockCursor(notificaciones=notifs)
    conn = NotificacionesMockConexion(cursor)

    monkeypatch.setattr("routes.notificacion.get_db_connection", lambda: conn)

    response = client.patch(
        "/notificaciones/5/leer",
        headers=auth_headers(id_usuario=10)
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Notificacion no encontrada"

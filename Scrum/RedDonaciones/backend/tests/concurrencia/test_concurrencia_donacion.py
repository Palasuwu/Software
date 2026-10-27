import os
import threading

from app import app
from auth_utils import generate_token

# Prueba de concurrencia para POST /donaciones.
# El mock simula el UPDATE condicional atómico con un threading.Lock.


class EstadoPublicacion:
    def __init__(self):
        self.cantidad_recibida = 90
        self.cantidad_necesaria = 100
        self.estado = "activa"
        self.id_intermediario = 7
        self.titulo = "Campaña de prueba"


class DonacionCursor:
    def __init__(self, estado, row_lock):
        self.estado = estado
        self.row_lock = row_lock
        self._resultado = None
        self._ultimo_id = 0
        self._rowcount = 0
        self.donaciones_creadas = []

    def execute(self, sql, params=None):
        sql_norm = " ".join(sql.split())
        self._rowcount = 0

        if sql_norm.startswith("SELECT id_usuario FROM donante"):
            self._resultado = {"id_usuario": params[0]}

        elif (
            sql_norm.startswith("SELECT")
            and "FROM publicacion" in sql_norm
        ):
            self._resultado = {
                "id_publicacion": params[0],
                "id_intermediario": self.estado.id_intermediario,
                "titulo": self.estado.titulo,
                "cantidad_necesaria": self.estado.cantidad_necesaria,
                "cantidad_recibida": self.estado.cantidad_recibida,
                "estado": self.estado.estado,
            }

        elif sql_norm.startswith("UPDATE publicacion"):
            cantidad = params[0]

            # Simula que el UPDATE condicional de MySQL es atómico.
            with self.row_lock:
                puede_actualizar = (
                    self.estado.estado == "activa"
                    and self.estado.cantidad_recibida + cantidad
                    <= self.estado.cantidad_necesaria
                )

                if puede_actualizar:
                    self.estado.cantidad_recibida += cantidad

                    if (
                        self.estado.cantidad_recibida
                        >= self.estado.cantidad_necesaria
                    ):
                        self.estado.estado = "finalizada"

                    self._rowcount = 1
                else:
                    self._rowcount = 0

            self._resultado = None

        elif sql_norm.startswith("INSERT INTO donacion"):
            self._ultimo_id += 1
            self._rowcount = 1
            self.donaciones_creadas.append(params)
            self._resultado = None

        else:
            self._resultado = None

    def fetchone(self):
        return self._resultado

    @property
    def lastrowid(self):
        return self._ultimo_id

    @property
    def rowcount(self):
        return self._rowcount

    def close(self):
        pass


class DonacionConexion:
    def __init__(self, estado, row_lock):
        self.cursor_mock = DonacionCursor(estado, row_lock)
        self.autocommit = True
        self.commit_count = 0
        self.rollback_count = 0

    def cursor(self, dictionary=False):
        return self.cursor_mock

    def commit(self):
        self.commit_count += 1

    def rollback(self):
        self.rollback_count += 1

    def close(self):
        pass


def headers_donante(id_usuario):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    token = generate_token(id_usuario, "donante")
    return {"Authorization": f"Bearer {token}"}


def payload_donacion(cantidad_donada):
    return {
        "id_publicacion": 1,
        "descripcion": "Ropa de invierno",
        "nombre_contacto": "Donante",
        "telefono_contacto": "12345678",
        "hora_preferida": "10:00",
        "fecha_donacion": "2026-07-26",
        "cantidad_donada": cantidad_donada,
    }


def preparar_donacion(monkeypatch, cantidad_recibida=90):
    estado = EstadoPublicacion()
    estado.cantidad_recibida = cantidad_recibida
    row_lock = threading.Lock()
    conexion = DonacionConexion(estado, row_lock)

    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda id_usuario: {
            "id_usuario": id_usuario,
            "rol": "donante",
            "activo": 1,
        },
    )
    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: conexion,
    )

    return estado, conexion


def test_crear_donacion_actualiza_cantidad_estado_y_confirma_transaccion(
    monkeypatch,
):
    estado, conexion = preparar_donacion(monkeypatch, cantidad_recibida=95)

    response = app.test_client().post(
        "/donaciones",
        json=payload_donacion(5),
        headers=headers_donante(1),
    )

    assert response.status_code == 201
    assert response.get_json()["id_donacion"] == 1
    assert estado.cantidad_recibida == 100
    assert estado.estado == "finalizada"
    assert len(conexion.cursor_mock.donaciones_creadas) == 1
    assert conexion.commit_count == 1
    assert conexion.rollback_count == 0


def test_crear_donacion_mayor_al_cupo_no_inserta_ni_actualiza(
    monkeypatch,
):
    estado, conexion = preparar_donacion(monkeypatch, cantidad_recibida=95)

    response = app.test_client().post(
        "/donaciones",
        json=payload_donacion(6),
        headers=headers_donante(1),
    )

    assert response.status_code == 400
    assert estado.cantidad_recibida == 95
    assert estado.estado == "activa"
    assert conexion.cursor_mock.donaciones_creadas == []
    assert conexion.commit_count == 0


def test_donaciones_concurrentes_no_exceden_la_meta(monkeypatch):
    estado = EstadoPublicacion()
    row_lock = threading.Lock()

    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda id_usuario: {
            "id_usuario": id_usuario,
            "rol": "donante",
            "activo": 1,
        },
    )

    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: DonacionConexion(estado, row_lock)
    )

    app.config["TESTING"] = True

    payload = payload_donacion(10)

    resultados = {}

    def enviar_donacion(nombre_hilo, id_usuario):
        # Un test client por hilo: no es seguro compartirlo entre threads.
        cliente_hilo = app.test_client()
        resultados[nombre_hilo] = cliente_hilo.post(
            "/donaciones",
            json=payload,
            headers=headers_donante(id_usuario)
        )

    hilo_a = threading.Thread(target=enviar_donacion, args=("a", 1))
    hilo_b = threading.Thread(target=enviar_donacion, args=("b", 2))

    hilo_a.start()
    hilo_b.start()
    hilo_a.join()
    hilo_b.join()

    codigos = sorted(r.status_code for r in resultados.values())

    # Solo cabe una donacion de 10 en el cupo restante (90/100); nunca ambas.
    assert codigos == [201, 400]
    assert estado.cantidad_recibida == 100
    assert estado.estado == "finalizada"



def test_donacion_por_debajo_de_meta_mantiene_campana_activa(monkeypatch):
    estado, conexion = preparar_donacion(
        monkeypatch,
        cantidad_recibida=80,
    )

    response = app.test_client().post(
        "/donaciones",
        json=payload_donacion(10),
        headers=headers_donante(1),
    )

    assert response.status_code == 201
    assert estado.cantidad_recibida == 90
    assert estado.estado == "activa"
    assert len(conexion.cursor_mock.donaciones_creadas) == 1
    assert conexion.commit_count == 1
    assert conexion.rollback_count == 0

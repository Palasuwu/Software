import os
import threading
from app import app
from auth_utils import generate_token


class EstadoPublicacion:
    def __init__(self, cantidad_recibida=90, cantidad_necesaria=100, estado="activa"):
        self.cantidad_recibida = cantidad_recibida
        self.cantidad_necesaria = cantidad_necesaria
        self.estado = estado
        self.id_intermediario = 7
        self.titulo = "Campaña de prueba"


class DonacionCursorConcurrente:
    def __init__(self, estado, lock):
        self.estado = estado
        self.lock = lock
        self._resultado = None
        self._ultimo_id = 0
        self.rowcount = 0

    def execute(self, sql, params=None):
        sql_norm = " ".join(sql.split())

        if sql_norm.startswith("SELECT id_usuario FROM donante"):
            self._resultado = {"id_usuario": params[0]}

        elif sql_norm.startswith("SELECT") and "FROM publicacion" in sql_norm and "WHERE id_publicacion = %s" in sql_norm:
            with self.lock:
                self._resultado = {
                    "id_publicacion": params[0],
                    "id_intermediario": self.estado.id_intermediario,
                    "titulo": self.estado.titulo,
                    "cantidad_necesaria": self.estado.cantidad_necesaria,
                    "cantidad_recibida": self.estado.cantidad_recibida,
                    "estado": self.estado.estado,
                }

        elif sql_norm.startswith("UPDATE publicacion"):
            with self.lock:
                cantidad = params[0]
                if self.estado.estado == "activa" and (self.estado.cantidad_recibida + cantidad) <= self.estado.cantidad_necesaria:
                    self.estado.cantidad_recibida += cantidad
                    if self.estado.cantidad_recibida >= self.estado.cantidad_necesaria:
                        self.estado.estado = "finalizada"
                    self.rowcount = 1
                else:
                    self.rowcount = 0
            self._resultado = None

        elif sql_norm.startswith("INSERT INTO donacion"):
            with self.lock:
                self._ultimo_id += 1
            self._resultado = None

        elif "FROM intermediario" in sql_norm:
            self._resultado = {"id_organizacion": 1}

        elif "FROM donacion" in sql_norm:
            self._resultado = {
                "id_donacion": 1,
                "id_donante": 1,
                "id_publicacion": 1,
                "estado": "pendiente",
                "id_organizacion": 1,
                "publicacion_titulo": "Campaña"
            }

        else:
            self._resultado = None
            self.rowcount = 1

    def fetchone(self):
        return self._resultado

    def fetchall(self):
        return [
            {
                "id_donacion": 1,
                "id_publicacion": 1,
                "nombre_contacto": "Contacto",
                "telefono_contacto": "12345678",
                "cantidad_donada": 5,
                "estado": "pendiente",
                "fecha_donacion": "2026-08-01",
                "publicacion_titulo": "Campaña",
                "donante_nombre": "Donante"
            }
        ]

    @property
    def lastrowid(self):
        return self._ultimo_id

    def close(self):
        pass


class DonacionConexionConcurrente:
    def __init__(self, estado, lock):
        self.cursor_mock = DonacionCursorConcurrente(estado, lock)

    def cursor(self, dictionary=False):
        return self.cursor_mock

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def headers_donante(id_usuario):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    token = generate_token(id_usuario, "donante")
    return {"Authorization": f"Bearer {token}"}


def headers_intermediario(id_usuario):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    token = generate_token(id_usuario, "intermediario", 1)
    return {"Authorization": f"Bearer {token}"}


def test_donaciones_concurrentes_no_exceden_la_meta(monkeypatch):
    estado = EstadoPublicacion(cantidad_recibida=90, cantidad_necesaria=100, estado="activa")
    lock = threading.Lock()

    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: DonacionConexionConcurrente(estado, lock)
    )

    payload = {
        "id_publicacion": 1,
        "descripcion": "Ropa de invierno",
        "nombre_contacto": "Donante",
        "telefono_contacto": "12345678",
        "hora_preferida": "10:00",
        "fecha_donacion": "2026-07-26",
        "cantidad_donada": 10
    }

    resultados = {}

    def enviar_donacion(nombre_hilo, id_usuario):
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

    assert codigos == [201, 400]
    assert estado.cantidad_recibida == 100
    assert estado.estado == "finalizada"


def test_multiples_donaciones_concurrentes_respetan_cupo(monkeypatch):
    estado = EstadoPublicacion(cantidad_recibida=70, cantidad_necesaria=100, estado="activa")
    lock = threading.Lock()

    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: DonacionConexionConcurrente(estado, lock)
    )

    payload = {
        "id_publicacion": 1,
        "descripcion": "Ropa de abrigo",
        "nombre_contacto": "Donante",
        "telefono_contacto": "12345678",
        "hora_preferida": "10:00",
        "fecha_donacion": "2026-07-26",
        "cantidad_donada": 10
    }

    resultados = []
    lock_resultados = threading.Lock()

    def enviar(id_usuario):
        cliente = app.test_client()
        res = cliente.post(
            "/donaciones",
            json=payload,
            headers=headers_donante(id_usuario)
        )
        with lock_resultados:
            resultados.append(res.status_code)

    hilos = [threading.Thread(target=enviar, args=(i,)) for i in range(1, 7)]

    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    exitosos = resultados.count(201)
    fallidos = resultados.count(400)

    assert exitosos == 3
    assert fallidos == 3
    assert estado.cantidad_recibida == 100
    assert estado.estado == "finalizada"


def test_consultas_simultaneas_donaciones(monkeypatch):
    estado = EstadoPublicacion()
    lock = threading.Lock()

    monkeypatch.setattr(
        "routes.donacion.get_db_connection",
        lambda: DonacionConexionConcurrente(estado, lock)
    )
    monkeypatch.setattr(
        "routes.intermediario.get_db_connection",
        lambda: DonacionConexionConcurrente(estado, lock)
    )
    monkeypatch.setattr(
        "auth_utils.get_db_connection",
        lambda: DonacionConexionConcurrente(estado, lock)
    )

    respuestas = []
    lock_res = threading.Lock()

    def consultar_mis_donaciones():
        cliente = app.test_client()
        r = cliente.get("/donaciones", headers=headers_donante(1))
        with lock_res:
            respuestas.append(r)

    def consultar_donaciones_intermediario():
        cliente = app.test_client()
        r = cliente.get("/intermediario/donaciones", headers=headers_intermediario(2))
        with lock_res:
            respuestas.append(r)

    def consultar_estado():
        cliente = app.test_client()
        r = cliente.get("/donaciones/1/estado", headers=headers_donante(1))
        with lock_res:
            respuestas.append(r)

    hilos = []
    for _ in range(4):
        hilos.append(threading.Thread(target=consultar_mis_donaciones))
        hilos.append(threading.Thread(target=consultar_donaciones_intermediario))
        hilos.append(threading.Thread(target=consultar_estado))

    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    assert len(respuestas) == 12
    for r in respuestas:
        assert r.status_code == 200
        assert r.get_json() is not None

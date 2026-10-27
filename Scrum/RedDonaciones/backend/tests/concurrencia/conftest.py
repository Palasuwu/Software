# Cada prueba usa una base sin seed dentro del MySQL exclusivo del runner.
import threading
import uuid

import pytest

import db.connection
from tests.mysql_support import temporary_database
from app import app
from auth_utils import generate_token


SECRET = "test-secret-key-with-at-least-32-bytes"
@pytest.fixture
def base_aislada(monkeypatch):
    with temporary_database(monkeypatch, "concurrencia") as nombre:
        monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
        yield nombre


def _insertar(cursor, sql, params=()):
    cursor.execute(sql, params)
    return cursor.lastrowid


@pytest.fixture
def crear_campana(base_aislada, monkeypatch):
    with db.connection.db_cursor(dictionary=False) as (conn, cursor):
        id_categoria = _insertar(cursor, "INSERT INTO categoria_articulo (nombre, descripcion) VALUES ('Ropa', 'Ropa')")
        id_articulo = _insertar(cursor, "INSERT INTO articulo (nombre, descripcion, id_categoria) VALUES ('Abrigos', 'Abrigos', %s)", (id_categoria,))
        id_organizacion = _insertar(
            cursor,
            """
            INSERT INTO organizacion (nombre, descripcion, direccion, departamento, municipio, zona,
                                      telefono, correo, estado_verificacion)
            VALUES ('Organización', 'Organización de prueba', '1 calle 1-1', 'Guatemala', 'Guatemala', '1',
                    '11110000', 'org@concurrencia.test', 'verificada')
            """,
        )
        monkeypatch.setenv("ID_ORGANIZACION_PRINCIPAL", str(id_organizacion))
        id_intermediario = _insertar(
            cursor,
            "INSERT INTO usuario (nombre, correo, password, telefono, rol) "
            "VALUES ('Intermediario', 'inter@concurrencia.test', 'x', '22220000', 'intermediario')",
        )
        cursor.execute(
            "INSERT INTO intermediario (id_usuario, id_organizacion, cargo) VALUES (%s, %s, 'Coordinador')",
            (id_intermediario, id_organizacion),
        )
        conn.commit()

        def crear(cantidad_necesaria=100, cantidad_recibida=90):
            id_publicacion = _insertar(
                cursor,
                """
                INSERT INTO publicacion (id_intermediario, id_organizacion, id_articulo, titulo, descripcion,
                                         cantidad_necesaria, cantidad_recibida, fecha_publicacion, fecha_limite, estado)
                VALUES (%s, %s, %s, 'Campaña cerca de la meta', 'Recolección de abrigos', %s, %s,
                        '2026-01-01', '2099-12-31', 'activa')
                """,
                (id_intermediario, id_organizacion, id_articulo, cantidad_necesaria, cantidad_recibida),
            )
            conn.commit()
            return id_publicacion

        yield crear



@pytest.fixture
def crear_donantes(base_aislada):
    def crear(cantidad):
        with db.connection.db_cursor(dictionary=False) as (conn, cursor):
            ids = []
            for numero in range(cantidad):
                id_usuario = _insertar(
                    cursor,
                    "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES (%s, %s, 'x', %s, 'donante')",
                    (f"Donante {numero + 1}", f"donante{uuid.uuid4().hex[:8]}@concurrencia.test", f"3333{uuid.uuid4().int % 10000:04d}"),
                )
                cursor.execute(
                    "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) "
                    "VALUES (%s, 'Guatemala', 'Guatemala', '1', 'Dirección de prueba')",
                    (id_usuario,),
                )
                ids.append(id_usuario)
            conn.commit()
            return ids

    return crear


class CursorSincronizado:
    def __init__(self, cursor, barrera):
        self._cursor = cursor
        self._barrera = barrera

    def execute(self, sql, params=None):
        # Todos llegan al UPDATE después de haber leído el mismo cupo restante.
        if self._barrera and sql.lstrip().startswith("UPDATE publicacion") and "cantidad_recibida + %s" in sql:
            self._barrera.wait(timeout=15)
        return self._cursor.execute(sql, params)

    def __getattr__(self, nombre):
        return getattr(self._cursor, nombre)


class ConexionSincronizada:
    def __init__(self, conn, barrera):
        object.__setattr__(self, "_conn", conn)
        object.__setattr__(self, "_barrera", barrera)

    def cursor(self, *args, **kwargs):
        return CursorSincronizado(self._conn.cursor(*args, **kwargs), self._barrera)

    def __getattr__(self, nombre):
        return getattr(self._conn, nombre)

    def __setattr__(self, nombre, valor):
        setattr(self._conn, nombre, valor)


@pytest.fixture
def donar_en_paralelo(base_aislada, monkeypatch):
    conexiones = []
    conectar = db.connection.get_db_connection

    def donar(id_publicacion, donaciones, sincronizar=True):
        barrera = threading.Barrier(len(donaciones)) if sincronizar else None
        inicio = threading.Barrier(len(donaciones))
        resultados = [None] * len(donaciones)

        def nueva_conexion():
            conn = conectar()
            conexiones.append(conn.connection_id)
            return ConexionSincronizada(conn, barrera)

        monkeypatch.setattr("routes.donacion.get_db_connection", nueva_conexion)

        def enviar(indice, id_donante, cantidad):
            token = generate_token(id_donante, "donante")
            cliente = app.test_client()
            inicio.wait(timeout=15)
            response = cliente.post(
                "/donaciones",
                json={
                    "id_publicacion": id_publicacion,
                    "descripcion": "Abrigos de invierno",
                    "nombre_contacto": f"Donante {indice + 1}",
                    "telefono_contacto": "12345678",
                    "hora_preferida": "10:00",
                    "fecha_donacion": "2026-09-29",
                    "cantidad_donada": cantidad,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            resultados[indice] = (response.status_code, response.get_json())

        hilos = [
            threading.Thread(target=enviar, args=(indice, id_donante, cantidad))
            for indice, (id_donante, cantidad) in enumerate(donaciones)
        ]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join(timeout=30)

        assert all(resultado is not None for resultado in resultados), "Alguna donación no terminó"
        return resultados

    donar.conexiones = conexiones
    return donar


@pytest.fixture
def consultar(base_aislada):
    def consultar(sql, params=()):
        with db.connection.db_cursor() as (_, cursor):
            cursor.execute(sql, params)
            return cursor.fetchall()

    return consultar

# Los datos de prueba viven en una transacción que se revierte al final,
# así nunca quedan guardados en la base de datos.
import pytest

from auth_utils import generate_token
from db.connection import get_db_connection


SECRET = "test-secret-key-with-at-least-32-bytes"

DONACIONES = [
    ("A1", "ana", "pendiente", "2019-01-01", 5),
    ("A1", "ana", "entregada", "2019-01-15", 10),
    ("A1", "beto", "entregada", "2019-01-31", 3),
    ("A1", "beto", "rechazada", "2019-02-01", 7),
    ("A1", "carla", "recibida", "2019-02-15", 2),
    ("A1", "carla", "en_proceso", "2019-02-15", 4),
    ("B1", "ana", "entregada", "2019-01-20", 100),
    ("B1", "carla", "pendiente", "2019-03-01", 50),
]


class ConexionCompartida:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self, dictionary=False):
        return self.conn.cursor(dictionary=dictionary)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def _insertar(cursor, sql, params):
    cursor.execute(sql, params)
    return cursor.lastrowid


def _crear_usuario(cursor, nombre, rol, numero):
    return _insertar(
        cursor,
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES (%s, %s, 'x', %s, %s)",
        (nombre, f"{nombre.lower().replace(' ', '.')}@reportes.test", f"9999{numero:04d}", rol),
    )


def _crear_organizacion(cursor, nombre, numero):
    return _insertar(
        cursor,
        """
        INSERT INTO organizacion (nombre, descripcion, direccion, departamento, municipio, zona,
                                  telefono, correo, estado_verificacion)
        VALUES (%s, 'Organización de prueba', '1 calle 1-1', 'Guatemala', 'Guatemala', '1', %s, %s, 'verificada')
        """,
        (nombre, f"8888{numero:04d}", f"org{numero}@reportes.test"),
    )


def _crear_campana(cursor, titulo, id_organizacion, id_intermediario, id_articulo):
    return _insertar(
        cursor,
        """
        INSERT INTO publicacion (id_intermediario, id_organizacion, id_articulo, titulo, descripcion,
                                 cantidad_necesaria, cantidad_recibida, fecha_publicacion, fecha_limite, estado)
        VALUES (%s, %s, %s, %s, 'Campaña de prueba', 100, 0, '2019-01-01', '2019-12-31', 'activa')
        """,
        (id_intermediario, id_organizacion, id_articulo, titulo),
    )


@pytest.fixture
def datos_reportes(monkeypatch):
    conn = get_db_connection()
    conn.start_transaction()
    cursor = conn.cursor(dictionary=True)

    try:
        id_categoria = _insertar(
            cursor,
            "INSERT INTO categoria_articulo (nombre, descripcion) VALUES ('Reportes prueba', 'Categoría de prueba')",
            (),
        )
        id_articulo = _insertar(
            cursor,
            "INSERT INTO articulo (nombre, descripcion, id_categoria) VALUES ('Artículo reportes', 'Artículo de prueba', %s)",
            (id_categoria,),
        )

        organizaciones = {
            "A": _crear_organizacion(cursor, "Organización Reportes A", 1),
            "B": _crear_organizacion(cursor, "Organización Reportes B", 2),
        }

        intermediarios = {}
        for numero, letra in enumerate(organizaciones, start=1):
            id_usuario = _crear_usuario(cursor, f"Intermediario Reportes {letra}", "intermediario", numero)
            cursor.execute(
                "INSERT INTO intermediario (id_usuario, id_organizacion, cargo) VALUES (%s, %s, 'Coordinador')",
                (id_usuario, organizaciones[letra]),
            )
            intermediarios[letra] = id_usuario

        donantes = {}
        for numero, nombre in enumerate(("Ana", "Beto", "Carla"), start=10):
            id_usuario = _crear_usuario(cursor, f"{nombre} Reportes", "donante", numero)
            cursor.execute(
                "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) "
                "VALUES (%s, 'Guatemala', 'Guatemala', '1', 'Dirección de prueba')",
                (id_usuario,),
            )
            donantes[nombre.lower()] = id_usuario

        campanas = {
            "A1": _crear_campana(cursor, "Reportes A1 Abrigos", organizaciones["A"], intermediarios["A"], id_articulo),
            "A2": _crear_campana(cursor, "Reportes A2 Sin donaciones", organizaciones["A"], intermediarios["A"], id_articulo),
            "B1": _crear_campana(cursor, "Reportes B1 Víveres", organizaciones["B"], intermediarios["B"], id_articulo),
        }

        donaciones = []
        for campana, donante, estado, fecha, cantidad in DONACIONES:
            donaciones.append(_insertar(
                cursor,
                """
                INSERT INTO donacion (id_donante, id_publicacion, descripcion, nombre_contacto, telefono_contacto,
                                      hora_preferida, cantidad_donada, fecha_donacion, estado)
                VALUES (%s, %s, 'Donación de prueba', 'Contacto', '00000000', '10:00:00', %s, %s, %s)
                """,
                (donantes[donante], campanas[campana], cantidad, fecha, estado),
            ))

        compartida = ConexionCompartida(conn)
        monkeypatch.setattr("routes.reporte.get_db_connection", lambda: compartida)

        yield {
            "organizaciones": organizaciones,
            "campanas": campanas,
            "donantes": donantes,
            "donaciones": donaciones,
        }
    finally:
        conn.rollback()
        cursor.close()
        conn.close()


@pytest.fixture
def sesion(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)

    def iniciar(rol, id_usuario=10, id_organizacion=None, organizacion_verificada=True):
        usuario = {"id_usuario": id_usuario, "rol": rol, "activo": 1}
        monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: usuario)
        monkeypatch.setattr("routes.reporte._obtener_organizacion_actual_intermediario", lambda _: id_organizacion)
        monkeypatch.setattr("routes.reporte._organizacion_verificada", lambda _: organizacion_verificada)
        token = generate_token(id_usuario, rol, id_organizacion)
        return {"Authorization": f"Bearer {token}"}

    return iniciar

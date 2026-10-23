# Base común de las pruebas de integración y regresión (Tarea 5).
# Cada prueba corre contra MySQL real: se crea una base temporal con el mismo esquema
# que la base del proyecto (DB_NAME) y se borra al terminar, así no se tocan datos reales.
import os
import uuid

import pytest

import db.connection
from app import app
from auth_utils import generate_token


SECRET = "test-secret-key-with-at-least-32-bytes"

if not os.getenv("DB_HOST"):
    pytest.skip("Estas pruebas necesitan MySQL (variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)", allow_module_level=True)


@pytest.fixture
def base_aislada(monkeypatch):
    nombre_real = os.getenv("DB_NAME")
    nombre = f"{nombre_real}_auto_{uuid.uuid4().hex[:8]}"
    conn = db.connection.get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(f"CREATE DATABASE `{nombre}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute(f"SHOW FULL TABLES FROM `{nombre_real}` WHERE Table_type = 'BASE TABLE'")
        tablas = [fila[0] for fila in cursor.fetchall()]
        cursor.execute(f"USE `{nombre}`")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        for tabla in tablas:
            cursor.execute(f"SHOW CREATE TABLE `{nombre_real}`.`{tabla}`")
            cursor.execute(cursor.fetchone()[1])
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        cursor.execute(f"USE `{nombre_real}`")

        monkeypatch.setenv("DB_NAME", nombre)
        monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
        app.config["TESTING"] = True
        yield nombre
    finally:
        cursor.execute(f"DROP DATABASE IF EXISTS `{nombre}`")
        cursor.close()
        conn.close()


@pytest.fixture
def client(base_aislada):
    with app.test_client() as cliente:
        yield cliente


@pytest.fixture
def consultar(base_aislada):
    """Lee directo de MySQL para comprobar lo que la API dejó guardado."""
    def _consultar(sql, params=()):
        conn = db.connection.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    return _consultar


def _insertar(cursor, sql, params=()):
    cursor.execute(sql, params)
    return cursor.lastrowid


@pytest.fixture
def escenario(base_aislada):
    """Organización verificada con ubicación, su intermediario, un donante y un creador de campañas."""
    conn = db.connection.get_db_connection()
    cursor = conn.cursor()

    id_categoria = _insertar(cursor, "INSERT INTO categoria_articulo (nombre, descripcion) VALUES ('Ropa', 'Ropa')")
    id_articulo = _insertar(
        cursor,
        "INSERT INTO articulo (nombre, descripcion, id_categoria) VALUES ('Bufandas', 'Bufandas y gorros', %s)",
        (id_categoria,),
    )
    id_organizacion = _insertar(
        cursor,
        """
        INSERT INTO organizacion (nombre, descripcion, direccion, departamento, municipio, zona,
                                  latitud, longitud, telefono, correo, estado_verificacion)
        VALUES ('Hogar de Prueba', 'Organización de prueba', '6a avenida 5-10', 'Guatemala',
                'Ciudad de Guatemala', '1', 14.6349000, -90.5069000, '22220000', 'hogar@prueba.test', 'verificada')
        """,
    )
    id_intermediario = _insertar(
        cursor,
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) "
        "VALUES ('Intermediario Prueba', 'inter@prueba.test', 'x', '22221111', 'intermediario')",
    )
    cursor.execute(
        "INSERT INTO intermediario (id_usuario, id_organizacion, cargo) VALUES (%s, %s, 'Coordinador')",
        (id_intermediario, id_organizacion),
    )
    id_donante = _insertar(
        cursor,
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) "
        "VALUES ('Donante Prueba', 'donante@prueba.test', 'x', '33330000', 'donante')",
    )
    cursor.execute(
        "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) "
        "VALUES (%s, 'Guatemala', 'Guatemala', '1', 'Dirección de prueba 1-1')",
        (id_donante,),
    )
    conn.commit()

    def crear_campana(cantidad_necesaria=10, cantidad_recibida=0, titulo="Bufandas de invierno", ubicacion=None):
        columnas = ""
        valores = ""
        params = [id_intermediario, id_organizacion, id_articulo, titulo, cantidad_necesaria, cantidad_recibida]
        if ubicacion:
            columnas = ", departamento, municipio, zona, direccion_detalle, latitud, longitud"
            valores = ", %s, %s, %s, %s, %s, %s"
            params += [
                ubicacion["departamento"], ubicacion["municipio"], ubicacion["zona"],
                ubicacion["direccion_detalle"], ubicacion["latitud"], ubicacion["longitud"],
            ]
        id_publicacion = _insertar(
            cursor,
            f"""
            INSERT INTO publicacion (id_intermediario, id_organizacion, id_articulo, titulo, descripcion,
                                     cantidad_necesaria, cantidad_recibida, fecha_publicacion, fecha_limite,
                                     estado{columnas})
            VALUES (%s, %s, %s, %s, 'Campaña de prueba', %s, %s, '2026-01-01', '2099-12-31', 'activa'{valores})
            """,
            params,
        )
        conn.commit()
        return id_publicacion

    datos = {
        "id_organizacion": id_organizacion,
        "id_intermediario": id_intermediario,
        "id_donante": id_donante,
        "token_donante": generate_token(id_donante, "donante"),
        "token_intermediario": generate_token(id_intermediario, "intermediario", id_organizacion),
        "crear_campana": crear_campana,
    }
    yield datos
    cursor.close()
    conn.close()


@pytest.fixture
def datos_donacion():
    def _datos(id_publicacion, cantidad):
        return {
            "id_publicacion": id_publicacion,
            "descripcion": "Bufandas en buen estado",
            "nombre_contacto": "Ana López",
            "telefono_contacto": "55551234",
            "hora_preferida": "10:00",
            "fecha_donacion": "2099-01-15",
            "cantidad_donada": cantidad,
        }

    return _datos


@pytest.fixture
def auth():
    return lambda token: {"Authorization": f"Bearer {token}"}

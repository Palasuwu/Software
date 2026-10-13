# Pruebas de integracion contra MySQL real; el dataset se inserta y se revierte en una transaccion.
import pytest

from db.connection import get_db_connection
from services.reporte_service import (
    contar_donaciones_por_estado,
    contar_donantes_unicos,
    contar_donaciones_por_campana,
)

FECHA_INICIO = "2020-01-01"
FECHA_FIN = "2020-01-31"
ID_ORGANIZACION = 1


@pytest.fixture
def dataset_conocido():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES "
            "('Donante Reporte A', 'reporte.a@test.local', 'x', '00000000', 'donante'), "
            "('Donante Reporte B', 'reporte.b@test.local', 'x', '00000001', 'donante')"
        )
        id_donante_a = cursor.lastrowid
        id_donante_b = id_donante_a + 1

        cursor.execute(
            "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) VALUES "
            "(%s, 'Guatemala', 'Guatemala', '1', 'Direccion de prueba'), "
            "(%s, 'Guatemala', 'Guatemala', '1', 'Direccion de prueba')",
            (id_donante_a, id_donante_b),
        )

        cursor.execute(
            """
            INSERT INTO publicacion (
                id_intermediario, id_organizacion, id_articulo, titulo, descripcion,
                cantidad_necesaria, cantidad_recibida, fecha_publicacion, fecha_limite, estado
            ) VALUES (2, %s, 1, 'TEST_CAMPANA_REPORTE', 'Campaña de prueba para reportes',
                      100, 0, '2020-01-01', '2020-12-31', 'activa')
            """,
            (ID_ORGANIZACION,),
        )
        id_publicacion = cursor.lastrowid

        # cantidad_donada varia a proposito para distinguir COUNT (numero de donaciones) de SUM (piezas donadas).
        donaciones = [
            (id_donante_a, id_publicacion, "pendiente", "2020-01-05", 5),
            (id_donante_a, id_publicacion, "entregada", "2020-01-10", 10),
            (id_donante_b, id_publicacion, "entregada", "2020-01-15", 3),
            (id_donante_b, id_publicacion, "rechazada", "2020-02-01", 7),
        ]
        for id_donante, pub, estado, fecha, cantidad in donaciones:
            cursor.execute(
                """
                INSERT INTO donacion (
                    id_donante, id_publicacion, descripcion, nombre_contacto,
                    telefono_contacto, hora_preferida, cantidad_donada, fecha_donacion, estado
                ) VALUES (%s, %s, 'Donacion de prueba', 'Contacto', '00000000', '10:00:00', %s, %s, %s)
                """,
                (id_donante, pub, cantidad, fecha, estado),
            )

        yield cursor, id_publicacion
    finally:
        conn.rollback()
        cursor.close()
        conn.close()


def test_donaciones_por_estado_con_dataset_conocido(dataset_conocido):
    cursor, _ = dataset_conocido

    resultado = contar_donaciones_por_estado(
        cursor, fecha_inicio=FECHA_INICIO, fecha_fin=FECHA_FIN, id_organizacion=ID_ORGANIZACION
    )
    por_estado = {fila["estado"]: fila for fila in resultado}

    assert por_estado["pendiente"]["total"] == 1
    assert por_estado["pendiente"]["total_donado"] == 5
    assert por_estado["entregada"]["total"] == 2
    assert por_estado["entregada"]["total_donado"] == 13  # 10 + 3
    assert por_estado["rechazada"]["total"] == 0  # la del 2020-02-01 queda fuera del rango
    assert por_estado["rechazada"]["total_donado"] == 0
    assert por_estado["recibida"]["total"] == 0
    assert por_estado["en_proceso"]["total"] == 0


def test_donantes_unicos_con_dataset_conocido(dataset_conocido):
    cursor, _ = dataset_conocido

    total = contar_donantes_unicos(
        cursor, fecha_inicio=FECHA_INICIO, fecha_fin=FECHA_FIN, id_organizacion=ID_ORGANIZACION
    )

    assert total == 2


def test_donaciones_por_campana_con_dataset_conocido(dataset_conocido):
    cursor, id_publicacion = dataset_conocido

    resultado = contar_donaciones_por_campana(cursor, id_organizacion=ID_ORGANIZACION)
    fila = next(f for f in resultado if f["id_publicacion"] == id_publicacion)

    assert fila["titulo"] == "TEST_CAMPANA_REPORTE"
    assert fila["total_donaciones"] == 4  # sin filtro de fecha: las 4 donaciones de prueba
    assert fila["total_donado"] == 25  # 5 + 10 + 3 + 7

# Pruebas reales con datos propios y eliminación de la base al finalizar.
import pytest

from services.reporte_service import (
    contar_donaciones_por_estado,
    contar_donantes_unicos,
    contar_donaciones_por_campana,
)

FECHA_INICIO = "2020-01-01"
FECHA_FIN = "2020-01-31"


@pytest.fixture
def dataset_conocido(contexto_reportes):
    ctx = contexto_reportes
    data = ctx["data"]
    pub = data.campaign(ctx["organizacion"], ctx["intermediario"], ctx["articulo"], "TEST_CAMPANA_REPORTE")
    a, b = ctx["donantes"]
    for donor, state, date, amount in [
        (a, "pendiente", "2020-01-05", 5), (a, "entregada", "2020-01-10", 10),
        (b, "entregada", "2020-01-15", 3), (b, "rechazada", "2020-02-01", 7),
    ]:
        data.insert("INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,"
                    "telefono_contacto,hora_preferida,cantidad_donada,fecha_donacion,estado) "
                    "VALUES (%s,%s,'Donación de prueba','Contacto','00000000','10:00:00',%s,%s,%s)",
                    (donor, pub, amount, date, state))
    data.conn.commit()
    return data.cursor, pub, ctx["organizacion"]


def test_donaciones_por_estado_con_dataset_conocido(dataset_conocido):
    cursor, _, id_organizacion = dataset_conocido

    resultado = contar_donaciones_por_estado(
        cursor, fecha_inicio=FECHA_INICIO, fecha_fin=FECHA_FIN, id_organizacion=id_organizacion
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
    cursor, _, id_organizacion = dataset_conocido

    total = contar_donantes_unicos(
        cursor, fecha_inicio=FECHA_INICIO, fecha_fin=FECHA_FIN, id_organizacion=id_organizacion
    )

    assert total == 2


def test_donaciones_por_campana_con_dataset_conocido(dataset_conocido):
    cursor, id_publicacion, id_organizacion = dataset_conocido

    resultado = contar_donaciones_por_campana(cursor, id_organizacion=id_organizacion)
    fila = next(f for f in resultado if f["id_publicacion"] == id_publicacion)

    assert fila["titulo"] == "TEST_CAMPANA_REPORTE"
    assert fila["total_donaciones"] == 4  # sin filtro de fecha: las 4 donaciones de prueba
    assert fila["total_donado"] == 25  # 5 + 10 + 3 + 7

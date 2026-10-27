import pytest

from db.connection import get_db_connection


pytestmark = [pytest.mark.integracion, pytest.mark.regresion]


def test_recorrer_historial_completo_sin_duplicados_y_filtrar_en_mysql(
    client, escenario, consultar, auth
):
    activa = escenario["crear_campana"](cantidad_necesaria=1000)
    finalizada = escenario["crear_campana"](cantidad_necesaria=1000)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE publicacion SET estado = 'finalizada' WHERE id_publicacion = %s", (finalizada,))
        cursor.execute(
            "INSERT INTO usuario (nombre, correo, password, telefono, rol) "
            "VALUES ('Otro donante', 'otro@prueba.test', 'x', '55556666', 'donante')"
        )
        otro_donante = cursor.lastrowid
        cursor.execute(
            "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) "
            "VALUES (%s, 'Guatemala', 'Guatemala', '1', 'Dirección de prueba')",
            (otro_donante,)
        )
        filas = [(escenario["id_donante"], activa if i < 42 else finalizada) for i in range(61)]
        filas += [(otro_donante, activa)] * 3
        cursor.executemany(
            """
            INSERT INTO donacion (id_donante, id_publicacion, descripcion, nombre_contacto,
                telefono_contacto, hora_preferida, cantidad_donada, fecha_donacion)
            VALUES (%s, %s, 'Aporte de prueba', 'Ana López', '55551234', '10:00', 1, '2026-10-24')
            """, filas
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    headers = auth(escenario["token_donante"])
    esperados = consultar(
        "SELECT id_donacion FROM donacion WHERE id_donante = %s "
        "ORDER BY fecha_donacion DESC, id_donacion DESC", (escenario["id_donante"],)
    )
    encontrados = []
    for pagina in range(1, 8):
        respuesta = client.get(f"/donaciones?page={pagina}&per_page=10", headers=headers)
        assert respuesta.status_code == 200
        datos = respuesta.get_json()
        assert datos["total"] == 61
        assert datos["total_pages"] == 7
        assert datos["resumen"] == {"total": 61, "activas": 42, "finalizadas": 19}
        assert len(datos["donaciones"]) == (10 if pagina < 7 else 1)
        encontrados.extend(fila["id_donacion"] for fila in datos["donaciones"])
    assert encontrados == [fila["id_donacion"] for fila in esperados]
    assert len(set(encontrados)) == 61

    filtrada = client.get(
        "/donaciones?page=2&per_page=10&estado_publicacion=finalizada", headers=headers
    ).get_json()
    assert filtrada["total"] == 19
    assert filtrada["total_pages"] == 2
    assert len(filtrada["donaciones"]) == 9
    assert all(fila["publicacion_estado"] == "finalizada" for fila in filtrada["donaciones"])
    assert filtrada["resumen"]["total"] == 61
    assert client.get(f"/donaciones?id_donante={otro_donante}&page=1", headers=headers).status_code == 403


def test_historial_vacio_en_mysql(client, escenario, auth):
    respuesta = client.get("/donaciones?page=1", headers=auth(escenario["token_donante"]))
    assert respuesta.status_code == 200
    assert respuesta.get_json() == {
        "donaciones": [], "page": 1, "per_page": 10, "total": 0, "total_pages": 0,
        "resumen": {"total": 0, "activas": 0, "finalizadas": 0}
    }

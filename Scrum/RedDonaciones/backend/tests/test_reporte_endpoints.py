# Tests de integracion de /reportes/* contra MySQL real (necesitan Docker).
# El dataset se inserta con COMMIT (cada request abre su propia conexion) y se
# borra explicitamente al final, en vez de usar rollback como test_reporte_service.py.
import os

import pytest

from auth_utils import generate_token
from db.connection import get_db_connection

SECRET = "test-secret-key-with-at-least-32-bytes"
ID_ORGANIZACION = 1


def token_usuario(id_usuario, rol):
    os.environ["JWT_SECRET_KEY"] = SECRET
    return generate_token(id_usuario, rol)


def auth_usuario(monkeypatch, id_usuario, rol, activo=1):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda _: {"id_usuario": id_usuario, "rol": rol, "activo": activo},
    )


@pytest.fixture
def dataset_reportes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES "
        "('Donante Endpoint A', 'endpoint.a@test.local', 'x', '00000010', 'donante'), "
        "('Donante Endpoint B', 'endpoint.b@test.local', 'x', '00000011', 'donante')"
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
        ) VALUES (2, %s, 1, 'TEST_CAMPANA_ENDPOINT', 'Campaña de prueba para endpoints',
                  100, 0, '2020-01-01', '2020-12-31', 'activa')
        """,
        (ID_ORGANIZACION,),
    )
    id_publicacion = cursor.lastrowid

    ids_donacion = []
    for id_donante, estado, fecha in [
        (id_donante_a, "pendiente", "2020-01-05"),
        (id_donante_a, "entregada", "2020-01-10"),
        (id_donante_b, "entregada", "2020-01-15"),
        (id_donante_b, "rechazada", "2020-01-20"),
    ]:
        cursor.execute(
            """
            INSERT INTO donacion (
                id_donante, id_publicacion, descripcion, nombre_contacto,
                telefono_contacto, hora_preferida, cantidad_donada, fecha_donacion, estado
            ) VALUES (%s, %s, 'Donacion de prueba', 'Contacto', '00000000', '10:00:00', 1, %s, %s)
            """,
            (id_donante, id_publicacion, fecha, estado),
        )
        ids_donacion.append(cursor.lastrowid)
    conn.commit()

    try:
        yield {"id_publicacion": id_publicacion}
    finally:
        cursor.execute("DELETE FROM donacion WHERE id_donacion IN (%s,%s,%s,%s)", ids_donacion)
        cursor.execute("DELETE FROM publicacion WHERE id_publicacion = %s", (id_publicacion,))
        cursor.execute("DELETE FROM donante WHERE id_usuario IN (%s,%s)", (id_donante_a, id_donante_b))
        cursor.execute("DELETE FROM usuario WHERE id_usuario IN (%s,%s)", (id_donante_a, id_donante_b))
        conn.commit()
        cursor.close()
        conn.close()


def test_resumen_requiere_login(client):
    response = client.get("/reportes/resumen")
    assert response.status_code == 401


def test_resumen_donante_denegado(client, monkeypatch):
    auth_usuario(monkeypatch, 1, "donante")
    token = token_usuario(1, "donante")

    response = client.get("/reportes/resumen", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_resumen_admin_con_dataset_conocido(client, monkeypatch, dataset_reportes):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")

    response = client.get(
        "/reportes/resumen?fecha_inicio=2020-01-01&fecha_fin=2020-01-31&id_organizacion=1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.get_json()
    por_estado = {f["estado"]: f for f in body["por_estado"]}
    assert por_estado["pendiente"]["total"] == 1
    assert por_estado["entregada"]["total"] == 2
    assert por_estado["rechazada"]["total"] == 1
    assert body["donantes_unicos"] == 2

    # total_donado debe ser un numero real en el JSON, no un string (Decimal mal serializado).
    for fila in body["por_estado"]:
        assert isinstance(fila["total_donado"], int)
    for fila in body["por_campana"]:
        assert isinstance(fila["total_donado"], int)


def test_resumen_fecha_invalida(client, monkeypatch):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")

    response = client.get(
        "/reportes/resumen?fecha_inicio=05-01-2020",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_detalle_paginacion(client, monkeypatch, dataset_reportes):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")
    id_publicacion = dataset_reportes["id_publicacion"]

    response = client.get(
        f"/reportes/detalle?id_publicacion={id_publicacion}&page=1&page_size=2",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["total"] == 4
    assert body["total_paginas"] == 2
    assert len(body["items"]) == 2
    assert body["items"][0]["fecha_donacion"] == "2020-01-20"  # ISO, no formato GMT crudo de MySQL

    response_pagina2 = client.get(
        f"/reportes/detalle?id_publicacion={id_publicacion}&page=2&page_size=2",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(response_pagina2.get_json()["items"]) == 2


def test_detalle_estado_invalido(client, monkeypatch):
    auth_usuario(monkeypatch, 3, "administrador")
    token = token_usuario(3, "administrador")

    response = client.get(
        "/reportes/detalle?estado=no_existe",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_intermediario_ignora_id_organizacion_ajeno(client, monkeypatch, dataset_reportes):
    auth_usuario(monkeypatch, 2, "intermediario")
    monkeypatch.setattr("routes.reporte._obtener_organizacion_actual_intermediario", lambda _: 1)
    monkeypatch.setattr("routes.reporte._organizacion_verificada", lambda _: True)
    token = token_usuario(2, "intermediario")

    # Pide datos de la organizacion 999, pero la resolucion del intermediario
    # debe ignorar ese parametro y usar su propia organizacion (1).
    response = client.get(
        "/reportes/resumen?id_organizacion=999&fecha_inicio=2020-01-01&fecha_fin=2020-01-31",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["donantes_unicos"] == 2

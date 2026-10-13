from unittest.mock import Mock

import pytest
from auth_utils import generate_token
from routes import landing

SECRET = "test-carrusel-landing-con-al-menos-32-bytes"
IMAGEN = {"id_imagen": 4, "url_imagen": "/api/uploads/a.jpg", "alt_text": "Entrega de víveres", "orden": 1}


@pytest.fixture
def bd(monkeypatch):
    conn = Mock()
    cursor = conn.cursor.return_value
    cursor.fetchone.return_value = IMAGEN
    cursor.lastrowid = 4
    monkeypatch.setattr(landing, "get_db_connection", lambda: conn)
    monkeypatch.setattr("db.connection.get_db_connection", lambda: conn)
    return conn, cursor


def headers(monkeypatch, rol="administrador", id_usuario=1):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda uid: {"id_usuario": uid, "rol": rol, "activo": 1})
    return {"Authorization": f"Bearer {generate_token(id_usuario, rol)}"}


def sql_ejecutados(cursor):
    return [c.args[0] for c in cursor.execute.call_args_list]


def test_carrusel_es_publico_y_sale_ordenado(client, bd):
    _, cursor = bd
    cursor.fetchall.return_value = [IMAGEN]
    response = client.get("/carrusel")
    assert response.status_code == 200
    assert response.get_json() == [IMAGEN]
    assert "ORDER BY orden ASC" in sql_ejecutados(cursor)[0]


def test_error_al_listar_no_expone_detalles(client, bd):
    _, cursor = bd
    cursor.execute.side_effect = RuntimeError("tabla landing_carousel no existe")
    response = client.get("/carrusel")
    assert response.status_code == 500
    assert "landing_carousel" not in response.get_data(as_text=True)


@pytest.mark.parametrize("method,url", [("post", "/carrusel"), ("put", "/carrusel/4"), ("delete", "/carrusel/4")])
def test_modificar_carrusel_requiere_sesion(client, bd, method, url):
    conn, _ = bd
    assert getattr(client, method)(url, json=IMAGEN).status_code == 401
    conn.cursor.assert_not_called()


@pytest.mark.parametrize("rol", ["donante", "intermediario"])
@pytest.mark.parametrize("method,url", [("post", "/carrusel"), ("put", "/carrusel/4"), ("delete", "/carrusel/4")])
def test_solo_el_admin_modifica_el_carrusel(client, bd, monkeypatch, rol, method, url):
    conn, _ = bd
    response = getattr(client, method)(url, json=IMAGEN, headers=headers(monkeypatch, rol, 9))
    assert response.status_code == 403
    conn.cursor.assert_not_called()
    conn.commit.assert_not_called()


def test_admin_agrega_imagen_con_datos_limpios(client, bd, monkeypatch):
    conn, cursor = bd
    datos = {"url_imagen": "  /api/uploads/a.jpg ", "alt_text": " Entrega de víveres ", "orden": "1"}
    response = client.post("/carrusel", json=datos, headers=headers(monkeypatch))
    assert response.status_code == 201
    assert response.get_json()["imagen"] == IMAGEN
    insert = next(c for c in cursor.execute.call_args_list if "INSERT INTO landing_carousel" in c.args[0])
    assert insert.args[1] == ("/api/uploads/a.jpg", "Entrega de víveres", 1)
    conn.commit.assert_called_once()


def test_orden_no_numerico_queda_en_cero(client, bd, monkeypatch):
    _, cursor = bd
    client.post("/carrusel", json={**IMAGEN, "orden": "primero"}, headers=headers(monkeypatch))
    insert = next(c for c in cursor.execute.call_args_list if "INSERT INTO" in c.args[0])
    assert insert.args[1][2] == 0


@pytest.mark.parametrize("cambios,campo", [
    ({"url_imagen": ""}, "url_imagen"),
    ({"url_imagen": "   "}, "url_imagen"),
    ({"url_imagen": "/x" * 251}, "url_imagen"),
    ({"alt_text": ""}, "alt_text"),
    ({"alt_text": "a" * 256}, "alt_text"),
], ids=["url-vacia", "url-espacios", "url-larga", "alt-vacio", "alt-largo"])
@pytest.mark.parametrize("method,url", [("post", "/carrusel"), ("put", "/carrusel/4")])
def test_datos_invalidos_no_se_guardan(client, bd, monkeypatch, cambios, campo, method, url):
    conn, _ = bd
    response = getattr(client, method)(url, json={**IMAGEN, **cambios}, headers=headers(monkeypatch))
    assert response.status_code == 400
    assert campo in response.get_json()["campos"]
    conn.cursor.assert_not_called()


def test_admin_actualiza_imagen(client, bd, monkeypatch):
    conn, cursor = bd
    response = client.put("/carrusel/4", json={**IMAGEN, "orden": 3}, headers=headers(monkeypatch))
    assert response.status_code == 200
    update = next(c for c in cursor.execute.call_args_list if "UPDATE landing_carousel" in c.args[0])
    assert update.args[1] == (IMAGEN["url_imagen"], IMAGEN["alt_text"], 3, 4)
    conn.commit.assert_called_once()


@pytest.mark.parametrize("method", ["put", "delete"])
def test_imagen_inexistente_da_404_sin_cambios(client, bd, monkeypatch, method):
    conn, cursor = bd
    cursor.fetchone.return_value = None
    response = getattr(client, method)("/carrusel/99", json=IMAGEN, headers=headers(monkeypatch))
    assert response.status_code == 404
    assert not any(sql.startswith(("UPDATE", "DELETE")) for sql in sql_ejecutados(cursor))
    conn.commit.assert_not_called()


def test_admin_elimina_imagen(client, bd, monkeypatch):
    conn, cursor = bd
    response = client.delete("/carrusel/4", headers=headers(monkeypatch))
    assert response.status_code == 200
    borrado = next(c for c in cursor.execute.call_args_list if c.args[0].startswith("DELETE"))
    assert borrado.args[1] == (4,)
    conn.commit.assert_called_once()


def test_fallo_al_guardar_hace_rollback_y_cierra(client, bd, monkeypatch):
    conn, cursor = bd

    def execute(sql, params=None):
        if "INSERT INTO" in sql:
            raise RuntimeError("se cayó la conexión")

    cursor.execute.side_effect = execute
    response = client.post("/carrusel", json=IMAGEN, headers=headers(monkeypatch))
    assert response.status_code == 500
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    cursor.close.assert_called_once()
    conn.close.assert_called_once()

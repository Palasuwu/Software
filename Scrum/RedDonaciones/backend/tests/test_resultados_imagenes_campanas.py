import os
import pytest
from auth_utils import generate_token


class MockResultadoCursor:
    def __init__(self, publicacion=None, resultado=None, org_intermediario=1):
        self.publicacion = publicacion or {
            "id_publicacion": 10,
            "id_organizacion": 1,
            "id_intermediario": 2,
            "titulo": "Útiles escolares",
            "descripcion": "Campaña de útiles",
            "cantidad_necesaria": 50,
            "cantidad_recibida": 50,
            "estado": "finalizada",
            "imagen_url": "https://ejemplo.com/portada.jpg",
        }
        self.resultado = resultado
        self.org_intermediario = org_intermediario
        self.queries = []
        self.last_query = ""
        self.resultado_guardado = None

    def execute(self, sql, params=None):
        self.last_query = " ".join(sql.split())
        self.queries.append((self.last_query, params))

        if self.last_query.startswith("INSERT INTO resultado_campana"):
            self.resultado_guardado = {
                "id_publicacion": params[0],
                "id_usuario": params[1],
                "resumen": params[2],
                "personas_beneficiadas": params[3],
                "imagen_url": params[4],
            }
            # Simular que ahora la campaña tiene resultado asociado
            self.resultado = {
                "id_resultado": 1,
                "id_publicacion": params[0],
                "resumen": params[2],
                "personas_beneficiadas": params[3],
                "imagen_url": params[4],
                "fecha_publicacion": "2026-09-08",
                "fecha_actualizacion": None,
                "publicado_por": "Intermediario Demo",
            }

    def fetchone(self):
        if "FROM intermediario" in self.last_query:
            if self.org_intermediario == self.publicacion.get("id_organizacion"):
                return {"1": 1}
            return None

        if "FROM publicacion WHERE id_publicacion" in self.last_query or "FROM publicacion p" in self.last_query:
            if not self.publicacion:
                return None
            pub_copy = dict(self.publicacion)
            if self.resultado:
                pub_copy["resultado_resumen"] = self.resultado.get("resumen")
                pub_copy["resultado_personas_beneficiadas"] = self.resultado.get("personas_beneficiadas")
                pub_copy["resultado_imagen_url"] = self.resultado.get("imagen_url")
                pub_copy["resultado_fecha_publicacion"] = self.resultado.get("fecha_publicacion")
            else:
                pub_copy["resultado_resumen"] = None
                pub_copy["resultado_personas_beneficiadas"] = None
                pub_copy["resultado_imagen_url"] = None
                pub_copy["resultado_fecha_publicacion"] = None
            return pub_copy

        if "FROM resultado_campana r" in self.last_query:
            return self.resultado

        return None

    def fetchall(self):
        if "FROM publicacion_articulo" in self.last_query:
            return [{
                "articulo": "Cuadernos",
                "categoria": "Educación",
                "descripcion_detalle": "Cuadernos espirales",
                "cantidad": 50,
            }]
        return []

    def close(self):
        pass


class MockResultadoConexion:
    def __init__(self, cursor_mock):
        self.cursor_mock = cursor_mock
        self.committed = False

    def cursor(self, dictionary=True):
        return self.cursor_mock

    def commit(self):
        self.committed = True

    def rollback(self):
        pass

    def close(self):
        pass


def auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    token = generate_token(id_usuario, rol, id_organizacion)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_autenticacion(monkeypatch):
    monkeypatch.setattr(
        "auth_utils._obtener_usuario_actual",
        lambda id_usuario: {
            "id_usuario": id_usuario,
            "rol": "intermediario" if id_usuario == 2 else ("administrador" if id_usuario == 1 else "donante"),
            "activo": 1,
        },
    )


# 1. Consultar resultado existente de campaña finalizada
def test_consultar_resultado_campana_existente(client, monkeypatch):
    res_data = {
        "id_resultado": 1,
        "id_publicacion": 10,
        "resumen": "Se entregaron 50 paquetes escolares a la escuela rural.",
        "personas_beneficiadas": 45,
        "imagen_url": "https://ejemplo.com/entrega.jpg",
        "fecha_publicacion": "2026-09-08",
        "fecha_actualizacion": None,
        "publicado_por": "Juan Intermediario",
    }
    cursor = MockResultadoCursor(resultado=res_data)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    response = client.get("/publicaciones/10/resultado")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id_publicacion"] == 10
    assert data["resumen"] == "Se entregaron 50 paquetes escolares a la escuela rural."
    assert data["personas_beneficiadas"] == 45
    assert data["imagen_url"] == "https://ejemplo.com/entrega.jpg"
    assert data["publicado_por"] == "Juan Intermediario"


# 2. Consultar resultado cuando la campaña aún no tiene resultados publicados (404)
def test_consultar_resultado_campana_no_publicado_404(client, monkeypatch):
    cursor = MockResultadoCursor(resultado=None)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    response = client.get("/publicaciones/10/resultado")
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "Resultado no publicado"


# 3. Publicar resultado con imagen exitosamente por el intermediario de la organización
def test_publicar_resultado_exitoso_intermediario(client, monkeypatch):
    cursor = MockResultadoCursor(org_intermediario=1)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    payload = {
        "resumen": "Entregamos mochilas y cuadernos a todos los niños.",
        "personas_beneficiadas": 50,
        "imagen_url": "https://ejemplo.com/fotos_entrega.jpg",
    }

    response = client.post(
        "/publicaciones/10/resultado",
        json=payload,
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1),
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Resultados publicados correctamente"
    assert cursor.resultado_guardado["resumen"] == "Entregamos mochilas y cuadernos a todos los niños."
    assert cursor.resultado_guardado["personas_beneficiadas"] == 50
    assert cursor.resultado_guardado["imagen_url"] == "https://ejemplo.com/fotos_entrega.jpg"
    assert conn.committed is True


# 4. Publicar resultado con imagen exitosamente por el administrador
def test_publicar_resultado_exitoso_administrador(client, monkeypatch):
    cursor = MockResultadoCursor()
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    payload = {
        "resumen": "Publicación de resultados validada por el administrador.",
        "personas_beneficiadas": 30,
        "imagen_url": "https://ejemplo.com/admin_evidencia.jpg",
    }

    response = client.post(
        "/publicaciones/10/resultado",
        json=payload,
        headers=auth_headers(id_usuario=1, rol="administrador"),
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Resultados publicados correctamente"
    assert cursor.resultado_guardado["imagen_url"] == "https://ejemplo.com/admin_evidencia.jpg"
    assert conn.committed is True


# 5. Rechazo al publicar resultado si la campaña NO está finalizada (409)
def test_rechazo_publicar_resultado_campana_no_finalizada(client, monkeypatch):
    pub_activa = {
        "id_publicacion": 11,
        "id_organizacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña en curso",
        "estado": "activa",  # No está finalizada
    }
    cursor = MockResultadoCursor(publicacion=pub_activa, org_intermediario=1)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    payload = {
        "resumen": "Intento de publicar resultados antes de finalizar",
        "personas_beneficiadas": 10,
        "imagen_url": "https://ejemplo.com/img.jpg",
    }

    response = client.post(
        "/publicaciones/11/resultado",
        json=payload,
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1),
    )

    assert response.status_code == 409
    data = response.get_json()
    assert data["error"] == "Solo se pueden publicar resultados de campañas finalizadas"
    assert cursor.resultado_guardado is None


# 6. Rechazo al publicar resultado si el intermediario no pertenece a la organización (403)
def test_rechazo_publicar_resultado_intermediario_otra_organizacion(client, monkeypatch):
    # Publicación pertenece a org 1, pero intermediario pertenece a org 2
    cursor = MockResultadoCursor(org_intermediario=2)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    payload = {
        "resumen": "Resultados de otra organización",
        "personas_beneficiadas": 20,
    }

    response = client.post(
        "/publicaciones/10/resultado",
        json=payload,
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=2),
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["error"] == "No tienes permiso para publicar este resultado"
    assert cursor.resultado_guardado is None


# 7. Rechazo al publicar resultado si el usuario tiene rol donante (403)
def test_rechazo_publicar_resultado_donante_no_autorizado(client, monkeypatch):
    cursor = MockResultadoCursor()
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    payload = {
        "resumen": "Intento de publicación por donante",
    }

    response = client.post(
        "/publicaciones/10/resultado",
        json=payload,
        headers=auth_headers(id_usuario=5, rol="donante"),
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["error"] == "No tienes permiso para publicar este resultado"
    assert cursor.resultado_guardado is None


# 8. Rechazo al publicar resultado con datos inválidos (400)
def test_rechazo_publicar_resultado_datos_invalidos(client, monkeypatch):
    cursor = MockResultadoCursor()
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.resultado_campana.get_db_connection", lambda: conn)

    # Resumen vacío y personas beneficiadas negativas
    payload = {
        "resumen": "   ",
        "personas_beneficiadas": -5,
        "imagen_url": "https://ejemplo.com/foto.jpg",
    }

    response = client.post(
        "/publicaciones/10/resultado",
        json=payload,
        headers=auth_headers(id_usuario=2, rol="intermediario", id_organizacion=1),
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "errors" in data
    assert "resumen" in data["errors"]
    assert cursor.resultado_guardado is None


# 9. Consulta pública de publicación incluye campos de resultado e imagen
def test_detalle_publicacion_incluye_resultado_e_imagen(client, monkeypatch):
    res_data = {
        "id_resultado": 1,
        "id_publicacion": 10,
        "resumen": "Resultados comprobados y publicados.",
        "personas_beneficiadas": 60,
        "imagen_url": "https://ejemplo.com/evidencia_final.jpg",
        "fecha_publicacion": "2026-09-08",
        "fecha_actualizacion": None,
        "publicado_por": "Admin",
    }
    pub = {
        "id_publicacion": 10,
        "id_organizacion": 1,
        "id_intermediario": 2,
        "titulo": "Campaña Útiles Concluida",
        "descripcion": "Descripción",
        "cantidad_necesaria": 50,
        "cantidad_recibida": 50,
        "estado": "finalizada",
        "imagen_url": "https://ejemplo.com/hero.jpg",
        "fecha_publicacion": "2026-08-01",
        "fecha_limite": "2026-09-01",
        "organizacion": "Org Educativa",
        "direccion": "Ciudad",
        "categoria": "Educación",
    }
    cursor = MockResultadoCursor(publicacion=pub, resultado=res_data)
    conn = MockResultadoConexion(cursor)
    monkeypatch.setattr("routes.publicacion.get_db_connection", lambda: conn)

    response = client.get("/publicaciones/10")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    item = data[0]
    assert item["resultado_resumen"] == "Resultados comprobados y publicados."
    assert item["resultado_personas_beneficiadas"] == 60
    assert item["resultado_imagen_url"] == "https://ejemplo.com/evidencia_final.jpg"
    assert item["resultado_fecha_publicacion"] == "2026-09-08"

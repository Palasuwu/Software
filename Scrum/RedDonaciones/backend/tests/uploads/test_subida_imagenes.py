from io import BytesIO

import pytest
from PIL import Image
from auth_utils import generate_token
from routes import upload
from tests.helpers import crear_conexion_mock

SECRET = "test-subida-imagenes-con-al-menos-32-bytes"


@pytest.fixture
def carpeta(tmp_path, monkeypatch):
    monkeypatch.setattr(upload, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(upload, "get_db_connection", lambda: crear_conexion_mock(resultado_fetchall=[]))
    return tmp_path


def headers(monkeypatch, rol):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    monkeypatch.setattr("routes.upload._obtener_organizacion_actual_intermediario", lambda _: 1)
    monkeypatch.setattr("routes.upload._organizacion_verificada", lambda _: True)
    monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda uid: {"id_usuario": uid, "rol": rol, "activo": 1})
    return {"Authorization": f"Bearer {generate_token(5, rol)}"}


def imagen(formato="PNG", tamano=(1600, 1200), modo="RGB"):
    buffer = BytesIO()
    Image.new(modo, tamano, "blue").save(buffer, format=formato)
    buffer.seek(0)
    return buffer


def test_subir_imagen_requiere_sesion(client, carpeta):
    response = client.post("/upload", data={"file": (imagen(), "foto.png")})
    assert response.status_code == 401
    assert list(carpeta.iterdir()) == []


def test_donante_no_puede_subir_imagenes(client, carpeta, monkeypatch):
    response = client.post("/upload", headers=headers(monkeypatch, "donante"), data={"file": (imagen(), "foto.png")})
    assert response.status_code == 403
    assert list(carpeta.iterdir()) == []


@pytest.mark.parametrize("rol", ["administrador", "intermediario"])
def test_imagen_se_reduce_y_se_guarda_como_jpg(client, carpeta, monkeypatch, rol):
    response = client.post(
        "/upload",
        headers=headers(monkeypatch, rol),
        data={"file": (imagen(modo="RGBA"), "campaña.PNG")},
    )
    assert response.status_code == 201
    url = response.get_json()["url"]
    assert url.startswith("/api/uploads/") and url.endswith(".jpg")

    guardada = carpeta / url.rsplit("/", 1)[1]
    with Image.open(guardada) as resultado:
        assert resultado.format == "JPEG"
        assert resultado.mode == "RGB"
        assert resultado.size == (800, 600)


def test_imagen_pequena_no_se_agranda(client, carpeta, monkeypatch):
    response = client.post("/upload", headers=headers(monkeypatch, "intermediario"), data={"file": (imagen(tamano=(300, 200)), "a.png")})
    nombre = response.get_json()["url"].rsplit("/", 1)[1]
    with Image.open(carpeta / nombre) as resultado:
        assert resultado.size == (300, 200)


def test_cada_subida_usa_un_nombre_distinto(client, carpeta, monkeypatch):
    h = headers(monkeypatch, "administrador")
    primera = client.post("/upload", headers=h, data={"file": (imagen(), "foto.png")}).get_json()["url"]
    segunda = client.post("/upload", headers=h, data={"file": (imagen(), "foto.png")}).get_json()["url"]
    assert primera != segunda
    assert len(list(carpeta.iterdir())) == 2


@pytest.mark.parametrize("data", [
    {},
    {"file": (BytesIO(b""), "")},
    {"file": (imagen(), "foto.bmp")},
    {"file": (imagen(), "sin_extension")},
    {"file": (BytesIO(b"%PDF-1.4"), "documento.pdf")},
    {"file": (BytesIO(b"x" * (5 * 1024 * 1024 + 1)), "grande.png")},
    {"file": (BytesIO(b"esto no es una imagen"), "falsa.png")},
], ids=["sin-archivo", "sin-nombre", "bmp", "sin-extension", "pdf", "supera-5mb", "contenido-invalido"])
def test_archivos_invalidos_se_rechazan_sin_guardar(client, carpeta, monkeypatch, data):
    response = client.post("/upload", headers=headers(monkeypatch, "administrador"), data=data)
    assert response.status_code == 400
    assert "error" in response.get_json()
    assert list(carpeta.iterdir()) == []


def test_imagen_subida_se_puede_consultar(client, carpeta, monkeypatch):
    url = client.post("/upload", headers=headers(monkeypatch, "administrador"), data={"file": (imagen(), "a.png")}).get_json()["url"]
    # Un upload aún sin asociar solo puede ser consultado por administrador.
    assert client.get(url.replace("/api", "", 1)).status_code == 404
    response = client.get(url.replace("/api", "", 1), headers=headers(monkeypatch, "administrador"))
    assert response.status_code == 200
    assert response.mimetype == "image/jpeg"


def test_no_se_pueden_leer_archivos_fuera_de_la_carpeta(client, carpeta):
    (carpeta.parent / "secreto.txt").write_text("no deberia verse")
    response = client.get("/uploads/..%2Fsecreto.txt")
    assert response.status_code == 404

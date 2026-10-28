# Imágenes que quedan sin uso al cancelar, reemplazar o fallar un guardado, y la limpieza
# que las borra sin tocar las que algún registro todavía usa. Carpeta temporal y MySQL real.
import io
import os
from datetime import datetime, timedelta

import pytest
from PIL import Image

from auth_utils import generate_token
from routes import upload
from scripts import limpiar_uploads
from services.archivo_service import referencias_archivo
from services.limpieza_uploads import borrar_candidatos, inventario, nombres_en_uso

DENTRO_DE_8_DIAS = datetime.now() + timedelta(days=8)


@pytest.fixture
def entorno(mysql_case, tmp_path, monkeypatch):
    data = mysql_case
    monkeypatch.setattr(upload, "UPLOAD_FOLDER", str(tmp_path))
    org = data.organization("Organización imágenes")
    data.principal(org)
    admin = data.user("Administrador imágenes", "administrador")
    inter = data.user("Intermediario imágenes", "intermediario", org)
    campana = data.campaign(org, inter, data.article(), "Campaña con imagen")
    data.conn.commit()
    return dict(data=data, carpeta=tmp_path, org=org, admin=admin, campana=campana,
                headers={"Authorization": f"Bearer {generate_token(admin, 'administrador')}"})


def subir(client, entorno):
    imagen = io.BytesIO()
    Image.new("RGB", (40, 30), "green").save(imagen, format="PNG")
    imagen.seek(0)
    respuesta = client.post("/upload", data={"file": (imagen, "foto.png")}, headers=entorno["headers"],
                            content_type="multipart/form-data")
    assert respuesta.status_code == 201
    return respuesta.get_json()["url"]


def archivo(url):
    return url.rsplit("/", 1)[-1]


def archivo_viejo(carpeta, nombre, dias=10):
    ruta = carpeta / nombre
    ruta.write_bytes(b"jpg")
    momento = (datetime.now() - timedelta(days=dias)).timestamp()
    os.utime(ruta, (momento, momento))
    return nombre


def clasificar(entorno, ahora=None):
    inv = inventario(entorno["data"].cursor, entorno["carpeta"], ahora=ahora)
    return {grupo: {a["nombre"] for a in archivos} for grupo, archivos in inv.items()}


def usar(entorno, sql, *params):
    entorno["data"].cursor.execute(sql, params)
    entorno["data"].conn.commit()


# --- Reproducción con el flujo real: la imagen se sube antes de guardar el formulario ---

def test_cancelar_el_formulario_deja_la_imagen_sin_referencia(client, entorno):
    nombre = archivo(subir(client, entorno))

    assert nombre in clasificar(entorno)["recientes"]
    assert nombre in clasificar(entorno, DENTRO_DE_8_DIAS)["candidatos"]


def test_reemplazar_la_imagen_deja_la_anterior_sin_uso(client, entorno):
    primera = subir(client, entorno)
    creada = client.post("/carrusel", json={"url_imagen": primera, "alt_text": "Jornada", "orden": 1}, headers=entorno["headers"])
    assert creada.status_code == 201
    id_imagen = creada.get_json()["imagen"]["id_imagen"]

    segunda = subir(client, entorno)
    editada = client.put(f"/carrusel/{id_imagen}", json={"url_imagen": segunda, "alt_text": "Jornada", "orden": 1},
                         headers=entorno["headers"])
    assert editada.status_code == 200

    grupos = clasificar(entorno, DENTRO_DE_8_DIAS)
    assert archivo(primera) in grupos["candidatos"]
    assert archivo(segunda) in grupos["en_uso"]


def test_si_falla_el_guardado_la_imagen_queda_sin_referencia(client, entorno):
    url = subir(client, entorno)
    fallida = client.post("/carrusel", json={"url_imagen": url, "alt_text": "", "orden": 1}, headers=entorno["headers"])

    assert fallida.status_code == 400
    assert archivo(url) in clasificar(entorno, DENTRO_DE_8_DIAS)["candidatos"]


def test_borrar_el_registro_deja_su_imagen_sin_uso(client, entorno):
    url = subir(client, entorno)
    id_imagen = client.post("/carrusel", json={"url_imagen": url, "alt_text": "Jornada", "orden": 1},
                            headers=entorno["headers"]).get_json()["imagen"]["id_imagen"]
    assert client.delete(f"/carrusel/{id_imagen}", headers=entorno["headers"]).status_code == 200

    assert archivo(url) in clasificar(entorno, DENTRO_DE_8_DIAS)["candidatos"]


# --- Lo que la limpieza nunca debe borrar ---

@pytest.mark.parametrize("columna", ["logo", "portada", "campana", "resultado", "carrusel"])
def test_no_borra_imagenes_usadas_en_ninguna_de_las_cinco_columnas(entorno, columna):
    nombre = archivo_viejo(entorno["carpeta"], "a" * 32 + ".jpg", dias=400)
    url = f"/api/uploads/{nombre}"
    if columna == "logo":
        usar(entorno, "UPDATE organizacion SET url_logo = %s WHERE id_organizacion = %s", url, entorno["org"])
    elif columna == "portada":
        usar(entorno, "UPDATE organizacion SET imagen_portada = %s WHERE id_organizacion = %s", url, entorno["org"])
    elif columna == "campana":
        usar(entorno, "UPDATE publicacion SET imagen_url = %s WHERE id_publicacion = %s", url, entorno["campana"])
    elif columna == "resultado":
        usar(entorno, "INSERT INTO resultado_campana (id_publicacion, id_usuario_publicador, resumen, imagen_url) "
                      "VALUES (%s, %s, 'Se entregó todo', %s)", entorno["campana"], entorno["admin"], url)
    else:
        usar(entorno, "INSERT INTO landing_carousel (url_imagen, alt_text, orden) VALUES (%s, 'Foto', 1)", url)

    inv = inventario(entorno["data"].cursor, entorno["carpeta"])
    resultado = borrar_candidatos(entorno["data"].cursor, entorno["carpeta"], inv["candidatos"])

    assert [a["nombre"] for a in inv["en_uso"]] == [nombre]
    assert resultado["borrados"] == []
    assert (entorno["carpeta"] / nombre).exists()


def test_una_imagen_compartida_sigue_en_uso_si_otro_registro_la_usa(client, entorno):
    url = subir(client, entorno)
    usar(entorno, "UPDATE publicacion SET imagen_url = %s WHERE id_publicacion = %s", url, entorno["campana"])
    id_imagen = client.post("/carrusel", json={"url_imagen": url, "alt_text": "Jornada", "orden": 1},
                            headers=entorno["headers"]).get_json()["imagen"]["id_imagen"]
    client.delete(f"/carrusel/{id_imagen}", headers=entorno["headers"])

    inv = inventario(entorno["data"].cursor, entorno["carpeta"], ahora=DENTRO_DE_8_DIAS)
    borrar_candidatos(entorno["data"].cursor, entorno["carpeta"], inv["candidatos"])

    assert archivo(url) in {a["nombre"] for a in inv["en_uso"]}
    assert (entorno["carpeta"] / archivo(url)).exists()


def test_cuenta_las_dos_formas_de_url_pero_no_una_externa_con_el_mismo_nombre(entorno):
    con_api = archivo_viejo(entorno["carpeta"], "b" * 32 + ".jpg")
    sin_api = archivo_viejo(entorno["carpeta"], "c" * 32 + ".jpg")
    externo = archivo_viejo(entorno["carpeta"], "d" * 32 + ".jpg")
    for url in (f"/api/uploads/{con_api}", f"/uploads/{sin_api}", f"https://otro.sitio/uploads/{externo}"):
        usar(entorno, "INSERT INTO landing_carousel (url_imagen, alt_text, orden) VALUES (%s, 'Foto', 1)", url)

    grupos = clasificar(entorno)

    assert grupos["en_uso"] == {con_api, sin_api}
    assert grupos["candidatos"] == {externo}


def test_solo_considera_los_nombres_que_genera_la_subida(entorno):
    carpeta = entorno["carpeta"]
    for nombre in ("leeme.txt", "foto.jpg", "A" * 32 + ".jpg", "e" * 32 + ".png"):
        archivo_viejo(carpeta, nombre)
    (carpeta / ("f" * 32 + ".jpg")).mkdir()

    inv = inventario(entorno["data"].cursor, carpeta)

    assert inv["candidatos"] == [] and inv["en_uso"] == []
    assert len(inv["ignorados"]) == 5
    # Aunque alguien le pase un nombre así a mano, no lo borra.
    assert borrar_candidatos(entorno["data"].cursor, carpeta, [{"nombre": "leeme.txt"}])["borrados"] == []
    assert (carpeta / "leeme.txt").exists()


def test_respeta_los_siete_dias_de_conservacion(entorno):
    casi = archivo_viejo(entorno["carpeta"], "1" * 32 + ".jpg", dias=6.9)
    pasado = archivo_viejo(entorno["carpeta"], "2" * 32 + ".jpg", dias=7.1)

    grupos = clasificar(entorno)

    assert grupos["recientes"] == {casi}
    assert grupos["candidatos"] == {pasado}


# --- Ejecuciones repetidas y cambios mientras se limpia ---

def test_si_se_empieza_a_usar_entre_el_inventario_y_el_borrado_no_se_borra(entorno):
    nombre = archivo_viejo(entorno["carpeta"], "3" * 32 + ".jpg")
    inv = inventario(entorno["data"].cursor, entorno["carpeta"])
    usar(entorno, "UPDATE publicacion SET imagen_url = %s WHERE id_publicacion = %s", f"/api/uploads/{nombre}", entorno["campana"])

    resultado = borrar_candidatos(entorno["data"].cursor, entorno["carpeta"], inv["candidatos"])

    assert resultado["conservados"] == [nombre]
    assert (entorno["carpeta"] / nombre).exists()


def test_si_otra_ejecucion_ya_lo_borro_no_falla(entorno):
    nombre = archivo_viejo(entorno["carpeta"], "4" * 32 + ".jpg")
    inv = inventario(entorno["data"].cursor, entorno["carpeta"])
    os.remove(entorno["carpeta"] / nombre)

    resultado = borrar_candidatos(entorno["data"].cursor, entorno["carpeta"], inv["candidatos"])

    assert resultado == {"borrados": [], "conservados": [], "ya_no_estaban": [nombre]}


def test_ejecutar_dos_veces_da_el_mismo_resultado(entorno):
    usado = archivo_viejo(entorno["carpeta"], "5" * 32 + ".jpg")
    sobrante = archivo_viejo(entorno["carpeta"], "6" * 32 + ".jpg")
    usar(entorno, "INSERT INTO landing_carousel (url_imagen, alt_text, orden) VALUES (%s, 'Foto', 1)", f"/api/uploads/{usado}")

    for _ in range(2):
        inv = inventario(entorno["data"].cursor, entorno["carpeta"])
        borrar_candidatos(entorno["data"].cursor, entorno["carpeta"], inv["candidatos"])

    assert sorted(os.listdir(entorno["carpeta"])) == [usado]
    assert inventario(entorno["data"].cursor, entorno["carpeta"])["candidatos"] == []
    assert sobrante not in os.listdir(entorno["carpeta"])


def test_nombres_en_uso_coincide_con_las_referencias_que_usa_la_descarga(entorno):
    # Si se agrega una columna de imagen en archivo_service y no aquí, la limpieza la borraría.
    urls = {}
    for i, columna in enumerate(("logo", "portada", "campana", "resultado", "carrusel")):
        urls[columna] = f"/api/uploads/{str(i) * 32}.jpg"
    usar(entorno, "UPDATE organizacion SET url_logo = %s, imagen_portada = %s WHERE id_organizacion = %s",
         urls["logo"], urls["portada"], entorno["org"])
    usar(entorno, "UPDATE publicacion SET imagen_url = %s WHERE id_publicacion = %s", urls["campana"], entorno["campana"])
    usar(entorno, "INSERT INTO resultado_campana (id_publicacion, id_usuario_publicador, resumen, imagen_url) "
                  "VALUES (%s, %s, 'Se entregó todo', %s)", entorno["campana"], entorno["admin"], urls["resultado"])
    usar(entorno, "INSERT INTO landing_carousel (url_imagen, alt_text, orden) VALUES (%s, 'Foto', 1)", urls["carrusel"])

    cursor = entorno["data"].cursor
    en_uso = nombres_en_uso(cursor)
    for url in urls.values():
        nombre = archivo(url)
        assert nombre in en_uso
        assert referencias_archivo(cursor, nombre)


# --- Script manual ---

def test_el_script_sin_aplicar_solo_lista(entorno, capsys):
    nombre = archivo_viejo(entorno["carpeta"], "7" * 32 + ".jpg")

    assert limpiar_uploads.main(["--carpeta", str(entorno["carpeta"])]) == 0

    salida = capsys.readouterr().out
    assert nombre in salida and "No se borró nada" in salida
    assert (entorno["carpeta"] / nombre).exists()


def test_el_script_con_aplicar_borra_solo_los_candidatos(entorno, capsys):
    sobrante = archivo_viejo(entorno["carpeta"], "8" * 32 + ".jpg")
    reciente = archivo_viejo(entorno["carpeta"], "9" * 32 + ".jpg", dias=1)

    limpiar_uploads.main(["--carpeta", str(entorno["carpeta"]), "--aplicar"])

    assert "Borrados: 1" in capsys.readouterr().out
    assert not (entorno["carpeta"] / sobrante).exists()
    assert (entorno["carpeta"] / reciente).exists()


def test_el_script_no_acepta_menos_dias_que_los_acordados(entorno):
    with pytest.raises(SystemExit):
        limpiar_uploads.main(["--carpeta", str(entorno["carpeta"]), "--dias", "3"])

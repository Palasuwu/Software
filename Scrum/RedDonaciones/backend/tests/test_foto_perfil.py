import base64
from io import BytesIO
from unittest.mock import Mock

import pytest
from PIL import Image
from auth_utils import generate_token
from routes import foto_perfil


@pytest.fixture
def foto_db(monkeypatch):
    monkeypatch.setenv('JWT_SECRET_KEY', 'test-foto-perfil')
    monkeypatch.setattr('auth_utils._obtener_usuario_actual', lambda uid: {'id_usuario': uid, 'rol': 'donante', 'activo': 1})
    conn = Mock()
    cursor = conn.cursor.return_value
    cursor.fetchone.return_value = None
    monkeypatch.setattr(foto_perfil, 'get_db_connection', lambda: conn)
    return conn, cursor, {'Authorization': 'Bearer ' + generate_token(7, 'donante')}


def archivo(formato='PNG'):
    buffer = BytesIO()
    Image.new('RGB', (640, 480), 'red').save(buffer, format=formato)
    buffer.seek(0)
    return buffer


def test_donante_guarda_foto_y_la_recupera(client, foto_db):
    conn, cursor, headers = foto_db
    response = client.put('/usuarios/7/foto', headers=headers, data={'file': (archivo(), 'foto.png')})
    assert response.status_code == 200
    datos = response.get_json()
    imagen = base64.b64decode(datos['foto_url'].split(',')[1])
    with Image.open(BytesIO(imagen)) as resultado:
        assert resultado.format == 'JPEG'
        assert resultado.size == (320, 240)
    conn.commit.assert_called_once()
    escritura = next(call for call in cursor.execute.call_args_list if 'INSERT INTO' in call.args[0])
    assert escritura.args[1] == (7, imagen)
    cursor.fetchone.return_value = {'imagen': imagen}
    lectura = client.get('/usuarios/7/foto', headers=headers)
    assert lectura.get_json() == datos
    assert lectura.headers['Cache-Control'] == 'no-store'


def test_sin_foto_devuelve_null(client, foto_db):
    _, _, headers = foto_db
    assert client.get('/usuarios/7/foto', headers=headers).get_json() == {'foto_url': None}


@pytest.mark.parametrize('method', ['get', 'put'])
def test_no_permite_foto_de_otro_usuario(client, foto_db, method):
    conn, _, headers = foto_db
    assert getattr(client, method)('/usuarios/8/foto', headers=headers).status_code == 403
    conn.cursor.assert_not_called()


def test_foto_requiere_sesion(client):
    assert client.get('/usuarios/7/foto').status_code == 401
    assert client.put('/usuarios/7/foto').status_code == 401


@pytest.mark.parametrize('contenido,nombre', [(b'no es una imagen', 'foto.jpg'), (b'x' * (5 * 1024 * 1024 + 1), 'foto.png'), (b'', 'foto.jpg')], ids=['contenido-invalido', 'supera-5mb', 'vacio'])
def test_rechaza_archivo_invalido_sin_escribir(client, foto_db, contenido, nombre):
    conn, _, headers = foto_db
    response = client.put('/usuarios/7/foto', headers=headers, data={'file': (BytesIO(contenido), nombre)})
    assert response.status_code == 400
    conn.commit.assert_not_called()
    conn.cursor.assert_not_called()


def test_fallo_de_escritura_hace_rollback(client, foto_db):
    conn, cursor, headers = foto_db
    def execute(sql, params=None):
        if 'INSERT INTO' in sql:
            raise RuntimeError('fallo de escritura')
    cursor.execute.side_effect = execute
    response = client.put('/usuarios/7/foto', headers=headers, data={'file': (archivo(), 'foto.png')})
    assert response.status_code == 500
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    cursor.close.assert_called_once()
    conn.close.assert_called_once()


def test_rechaza_formato_no_permitido_aunque_se_llame_jpg(client, foto_db):
    conn, _, headers = foto_db
    response = client.put('/usuarios/7/foto', headers=headers, data={'file': (archivo('BMP'), 'foto.jpg')})
    assert response.status_code == 400
    conn.commit.assert_not_called()


def test_quita_transparencia_y_metadatos_de_la_foto(client, foto_db):
    _, _, headers = foto_db
    buffer = BytesIO()
    imagen = Image.new('RGBA', (10, 10), (0, 0, 0, 0))
    imagen.save(buffer, format='PNG')
    buffer.seek(0)
    response = client.put('/usuarios/7/foto', headers=headers, data={'file': (buffer, 'foto.png')})
    assert response.status_code == 200
    contenido = base64.b64decode(response.get_json()['foto_url'].split(',')[1])
    with Image.open(BytesIO(contenido)) as resultado:
        assert resultado.mode == 'RGB'
        assert resultado.getpixel((0, 0)) == (255, 255, 255)
        assert not resultado.getexif()

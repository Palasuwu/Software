"""Descarga local con asociaciones y permisos reales, sin base de desarrollo."""
import pytest
from db.connection import db_cursor
from tests.seguridad.test_organizaciones_mysql import escenario, estado

pytestmark = pytest.mark.mysql


@pytest.fixture
def archivos(escenario, tmp_path, monkeypatch):
    monkeypatch.setattr('routes.upload.UPLOAD_FOLDER', str(tmp_path))
    (tmp_path / 'imagen.jpg').write_bytes(b'contenido institucional privado')
    (tmp_path / 'sin.jpg').write_bytes(b'sin referencia')
    return escenario


def asociar(ctx, tipo, url='/api/uploads/imagen.jpg'):
    with db_cursor() as (conn, cursor):
        if tipo == 'organizacion':
            cursor.execute('UPDATE organizacion SET url_logo=%s WHERE id_organizacion=%s', (url, ctx['org']))
        elif tipo == 'campana':
            cursor.execute('UPDATE publicacion SET imagen_url=%s WHERE id_publicacion=%s', (url, ctx['campana']))
        elif tipo == 'resultado':
            cursor.execute('UPDATE resultado_campana SET imagen_url=%s WHERE id_publicacion=%s', (url, ctx['finalizada']))
        elif tipo == 'carrusel':
            cursor.execute("INSERT INTO landing_carousel (url_imagen,alt_text,orden) VALUES (%s,'Imagen global',1)", (url,))
        conn.commit()


def descargar(client, ctx, actor, codigo, ruta='/uploads/imagen.jpg', **kwargs):
    response = client.get(ruta, headers=ctx['headers'][actor], **kwargs)
    assert response.status_code == codigo, response.get_data(as_text=True)
    assert response.headers['Cache-Control'] == 'private, no-store'
    assert 'Authorization' in response.vary
    if codigo != 200:
        assert b'contenido institucional privado' not in response.data
    return response


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada'])
@pytest.mark.parametrize('actor', ['publico', 'admin', 'propio', 'ajeno', 'donante'])
@pytest.mark.parametrize('tipo', ['organizacion', 'campana', 'resultado'])
def test_descarga_segun_recurso_estado_y_actor(client, archivos, valor, actor, tipo):
    ctx = archivos
    asociar(ctx, tipo)
    estado(ctx, valor)
    permitido = valor == 'verificada' or actor == 'admin' or (valor == 'archivada' and actor == 'propio')
    descargar(client, ctx, actor, 200 if permitido else 404)


@pytest.mark.parametrize('actor', ['publico', 'admin', 'propio', 'ajeno', 'donante'])
@pytest.mark.parametrize('tipo', ['campana', 'resultado'])
@pytest.mark.parametrize('privacidad', ['cancelada', 'vencida'])
def test_campana_privada_y_archivo_huerfano(client, archivos, actor, tipo, privacidad):
    ctx = archivos
    asociar(ctx, tipo)
    with db_cursor() as (conn, cursor):
        destino = ctx['campana'] if tipo == 'campana' else ctx['finalizada']
        if privacidad == 'cancelada':
            cursor.execute("UPDATE publicacion SET estado='cancelada' WHERE id_publicacion=%s", (destino,))
        else:
            cursor.execute("UPDATE publicacion SET estado='activa', fecha_limite='2020-01-01' WHERE id_publicacion=%s", (destino,))
        conn.commit()
    descargar(client, ctx, actor, 200 if actor in ('admin', 'propio') else 404)
    descargar(client, ctx, actor, 200 if actor == 'admin' else 404, '/uploads/sin.jpg')


@pytest.mark.parametrize('actor', ['publico', 'admin', 'propio', 'ajeno', 'donante'])
def test_carrusel_exclusivo_y_conflicto_institucional(client, archivos, actor):
    ctx = archivos
    asociar(ctx, 'carrusel')
    descargar(client, ctx, actor, 200)
    asociar(ctx, 'organizacion')
    estado(ctx, 'archivada')
    descargar(client, ctx, actor, 200 if actor in ('admin', 'propio') else 404)
    # La misma URL ahora también pertenece a otra organización archivada.
    with db_cursor() as (conn, cursor):
        cursor.execute("UPDATE organizacion SET url_logo='/uploads/imagen.jpg', estado_verificacion='archivada' WHERE id_organizacion=%s", (ctx['otra'],))
        conn.commit()
    descargar(client, ctx, actor, 200 if actor == 'admin' else 404)


@pytest.mark.parametrize('url,asociada', [
    ('/api/uploads/imagen.jpg', True), ('/uploads/imagen.jpg', True),
    ('/api/uploads/%69magen.jpg?version=2#foto', True),
    ('https://externo.test/api/uploads/imagen.jpg', False),
    ('//externo.test/uploads/imagen.jpg', False),
    ('/otra/imagen.jpg', False), ('/api/uploads/x/../imagen.jpg', False),
])
def test_urls_exactas_y_normalizadas(client, archivos, url, asociada):
    asociar(archivos, 'organizacion', url)
    descargar(client, archivos, 'publico', 200 if asociada else 404)


def test_misma_url_y_jwt_reflejan_estado_y_pertenencia(client, archivos):
    ctx = archivos
    asociar(ctx, 'organizacion')
    publico = descargar(client, ctx, 'publico', 200)
    estado(ctx, 'archivada')
    descargar(client, ctx, 'publico', 404)
    descargar(client, ctx, 'propio', 200)
    with db_cursor() as (conn, cursor):
        cursor.execute('UPDATE intermediario SET id_organizacion=%s WHERE id_usuario=%s', (ctx['otra'], ctx['propio']))
        conn.commit()
    descargar(client, ctx, 'propio', 404)
    # No devolver 304 a quien perdió autorización aunque tenga el ETag anterior.
    response = client.get('/uploads/imagen.jpg', headers={**ctx['headers']['propio'], 'If-None-Match': publico.headers['ETag']})
    assert response.status_code == 404
    assert response.headers['Cache-Control'] == 'private, no-store'


@pytest.mark.parametrize('metodo,extra', [('HEAD', {}), ('GET', {'Range': 'bytes=0-3'}),
                                        ('GET', {'If-None-Match': '*'}),
                                        ('GET', {'If-Modified-Since': 'Wed, 01 Jan 2099 00:00:00 GMT'})])
def test_no_hay_bytes_ni_condicionales_sin_autorizacion(client, archivos, metodo, extra):
    asociar(archivos, 'organizacion')
    estado(archivos, 'archivada')
    response = client.open('/uploads/imagen.jpg', method=metodo, headers=extra)
    assert response.status_code == 404
    assert b'contenido institucional privado' not in response.data
    assert response.headers['Cache-Control'] == 'private, no-store'
    assert 'Authorization' in response.vary


@pytest.mark.parametrize('ruta', ['/uploads/no-existe.jpg', '/uploads/..%2Fsecreto.txt', '/uploads/%252e%252e%252fsecreto.txt'])
def test_inexistentes_y_traversal(client, archivos, ruta):
    descargar(client, archivos, 'admin', 404, ruta)


def test_rangos_y_condicionales_autorizados(client, archivos):
    asociar(archivos, 'organizacion')
    estado(archivos, 'archivada')
    h = archivos['headers']['propio']
    response = client.get('/uploads/imagen.jpg', headers={**h, 'Range': 'bytes=0-3'})
    assert response.status_code == 206
    assert response.data == b'cont'
    etag = client.get('/uploads/imagen.jpg', headers=h).headers['ETag']
    response = client.get('/uploads/imagen.jpg', headers={**h, 'If-None-Match': etag})
    assert response.status_code == 304
    assert response.headers['Cache-Control'] == 'private, no-store'


def test_token_invalido_no_revela_referencias(client, archivos):
    asociar(archivos, 'organizacion')
    estado(archivos, 'archivada')
    response = client.get('/uploads/imagen.jpg', headers={'Authorization': 'Bearer invalido'})
    assert response.status_code == 401
    assert response.headers['Cache-Control'] == 'private, no-store'
    assert 'Authorization' in response.vary

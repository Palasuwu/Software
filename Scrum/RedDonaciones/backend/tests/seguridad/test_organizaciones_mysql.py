"""Restricciones institucionales con SQL real y tokens emitidos antes del cambio."""
from concurrent.futures import ThreadPoolExecutor
import threading

import pytest

from auth_utils import generate_token
from db.connection import db_cursor, get_db_connection

pytestmark = pytest.mark.mysql


@pytest.fixture
def escenario(mysql_case, reloj_jwt):
    data = mysql_case
    org = data.organization("Institución principal")
    otra = data.organization("Otra institución")
    admin = data.user("Administrador", "administrador")
    propio = data.user("Intermediario propio", "intermediario", org)
    ajeno = data.user("Intermediario ajeno", "intermediario", otra)
    donante = data.user("Donante", "donante")
    articulo = data.article()
    campana = data.campaign(org, propio, articulo, "Campaña institucional")
    finalizada = data.campaign(org, propio, articulo, "Campaña finalizada")
    data.cursor.execute("UPDATE publicacion SET estado='finalizada' WHERE id_publicacion=%s", (finalizada,))
    data.cursor.execute("INSERT INTO resultado_campana (id_publicacion,id_usuario_publicador,resumen) VALUES (%s,%s,'Entrega realizada')", (finalizada, propio))
    donacion = data.insert("INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,telefono_contacto,hora_preferida,cantidad_donada,fecha_donacion) VALUES (%s,%s,'Aporte','Donante','22223333','10:00',1,'2026-01-01')", (donante, campana))
    data.principal(org)
    data.conn.commit()
    ids = dict(org=org, otra=otra, admin=admin, propio=propio, ajeno=ajeno, donante=donante,
               campana=campana, finalizada=finalizada, donacion=donacion)
    ids['headers'] = {
        actor: {'Authorization': 'Bearer ' + generate_token(ids[actor], rol, org)}
        for actor, rol in [('admin', 'administrador'), ('propio', 'intermediario'),
                           ('ajeno', 'intermediario'), ('donante', 'donante')]
    }
    ids['headers']['publico'] = {}
    ids['data'] = data
    return ids


def estado(ctx, valor):
    with db_cursor() as (conn, cursor):
        cursor.execute("UPDATE organizacion SET estado_verificacion=%s WHERE id_organizacion=%s", (valor, ctx['org']))
        conn.commit()


def aporte(ctx):
    return dict(id_publicacion=ctx['campana'], descripcion='Aporte', nombre_contacto='Donante',
                telefono_contacto='22223333', hora_preferida='10:00', fecha_donacion='2026-10-27', cantidad_donada=2)


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada'])
@pytest.mark.parametrize('actor', ['publico', 'donante', 'propio', 'ajeno', 'admin'])
def test_visibilidad_listados_y_detalles(client, escenario, valor, actor):
    ctx = escenario
    estado(ctx, valor)  # El JWT ya fue emitido con organización y estado anteriores.
    headers = ctx['headers'][actor]
    publico = valor == 'verificada'
    privado = actor == 'admin' or (actor == 'propio' and valor == 'archivada')
    permitido = publico or privado
    for ruta in [f"/organizaciones/{ctx['org']}", '/organizaciones/principal',
                 f"/publicaciones/{ctx['campana']}", f"/publicaciones/{ctx['finalizada']}",
                 f"/publicaciones/{ctx['finalizada']}/resultado"]:
        response = client.get(ruta, headers=headers)
        assert response.status_code == (200 if permitido else 404), (ruta, response.get_json())
        if not permitido:
            assert 'Institución principal' not in response.get_data(as_text=True)
            assert 'Entrega realizada' not in response.get_data(as_text=True)
    for ruta, campo, identificador in [('/organizaciones', 'id_organizacion', ctx['org']),
                                      ('/publicaciones', 'id_publicacion', ctx['finalizada'])]:
        response = client.get(ruta, headers=headers)
        assert response.status_code == 200
        assert any(fila[campo] == identificador for fila in response.get_json()) == publico
    if actor == 'admin':
        for ruta in ['/organizaciones?vista=admin', '/publicaciones?vista=admin']:
            assert client.get(ruta, headers=headers).status_code == 200


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada'])
def test_lecturas_operativas_y_escrituras_propias(client, escenario, valor):
    ctx = escenario
    estado(ctx, valor)
    h = ctx['headers']['propio']
    for ruta in ['/intermediario/organizacion', '/intermediario/publicaciones', '/intermediario/usuarios',
                 '/intermediario/donaciones', '/reportes/resumen', '/reportes/detalle']:
        response = client.get(ruta, headers=h)
        assert response.status_code == (403 if valor == 'pendiente' else 200), (ruta, response.get_json())
    for ruta in [f"/donaciones/{ctx['donacion']}", f"/donaciones/{ctx['donacion']}/estado"]:
        assert client.get(ruta, headers=h).status_code == (404 if valor == 'pendiente' else 200)
        assert client.get(ruta, headers=ctx['headers']['ajeno']).status_code == 404
        for actor in ['donante', 'admin']:
            assert client.get(ruta, headers=ctx['headers'][actor]).status_code == 200
    # El historial personal se conserva, incluso para pendientes y archivadas.
    assert client.get('/donaciones', headers=ctx['headers']['donante']).get_json()[0]['id_donacion'] == ctx['donacion']
    resultado = dict(resumen='Resultado actualizado', personas_beneficiadas=5)
    if valor != 'verificada':
        for metodo, ruta, body in [
            ('put', '/intermediario/organizacion', {}),
            ('post', '/intermediario/publicaciones', {}),
            ('put', f"/intermediario/publicaciones/{ctx['campana']}", {}),
            ('put', f"/intermediario/publicaciones/{ctx['campana']}/estado", {'estado': 'finalizada'}),
            ('put', f"/donaciones/{ctx['donacion']}/estado", {'estado': 'recibida'}),
            ('put', '/intermediario/donaciones/estado', {'ids_donacion': [ctx['donacion']], 'estado': 'recibida'}),
            ('post', f"/publicaciones/{ctx['finalizada']}/resultado", resultado),
            ('put', f"/publicaciones/{ctx['finalizada']}/resultado", resultado),
            ('post', '/upload', None),
        ]:
            response = getattr(client, metodo)(ruta, json=body, headers=h)
            assert response.status_code == 403, (ruta, response.get_json())
    else:
        assert client.put(f"/publicaciones/{ctx['finalizada']}/resultado", json=resultado, headers=h).status_code == 200
    with db_cursor() as (_, cursor):
        cursor.execute('SELECT estado,cantidad_recibida FROM publicacion WHERE id_publicacion=%s', (ctx['campana'],))
        assert cursor.fetchone() == {'estado': 'activa', 'cantidad_recibida': 0}
        cursor.execute('SELECT estado FROM donacion WHERE id_donacion=%s', (ctx['donacion'],))
        assert cursor.fetchone()['estado'] == 'pendiente'
        cursor.execute('SELECT resumen FROM resultado_campana WHERE id_publicacion=%s', (ctx['finalizada'],))
        assert cursor.fetchone()['resumen'] == ('Resultado actualizado' if valor == 'verificada' else 'Entrega realizada')


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada', 'rechazada', 'inactiva'])
def test_nuevas_donaciones_segun_estado_actual(client, escenario, valor):
    ctx = escenario
    estado(ctx, valor)
    response = client.post('/donaciones', json=aporte(ctx), headers=ctx['headers']['donante'])
    permitido = valor not in ('pendiente', 'archivada')
    assert response.status_code == (201 if permitido else 400)
    with db_cursor() as (_, cursor):
        cursor.execute('SELECT COUNT(*) AS total FROM donacion')
        assert cursor.fetchone()['total'] == (2 if permitido else 1)
        cursor.execute('SELECT cantidad_recibida FROM publicacion WHERE id_publicacion=%s', (ctx['campana'],))
        assert cursor.fetchone()['cantidad_recibida'] == (2 if permitido else 0)
        cursor.execute('SELECT COUNT(*) AS total FROM notificacion')
        assert cursor.fetchone()['total'] == (2 if permitido else 0)


def test_jwt_no_conserva_pertenencia_anterior(client, escenario):
    ctx = escenario
    estado(ctx, 'archivada')
    h = ctx['headers']['propio']
    ruta = f"/publicaciones/{ctx['finalizada']}/resultado"
    assert client.get(ruta, headers=h).status_code == 200
    with db_cursor() as (conn, cursor):
        cursor.execute('UPDATE intermediario SET id_organizacion=%s WHERE id_usuario=%s', (ctx['otra'], ctx['propio']))
        conn.commit()
    for ruta in [ruta, f"/organizaciones/{ctx['org']}", f"/publicaciones/{ctx['finalizada']}", f"/donaciones/{ctx['donacion']}"]:
        assert client.get(ruta, headers=h).status_code == 404


@pytest.mark.parametrize('valor', ['pendiente', 'archivada'])
def test_donacion_espera_cambio_institucional_y_no_escribe(client, escenario, valor, monkeypatch):
    ctx = escenario
    encontro = threading.Event()
    conectar = get_db_connection

    class Cursor:
        def __init__(self, cursor):
            self.cursor = cursor
        def execute(self, sql, params=None):
            if 'FROM organizacion' in sql and 'FOR SHARE' in sql:
                encontro.set()
            return self.cursor.execute(sql, params)
        def __getattr__(self, name):
            return getattr(self.cursor, name)

    class Conexion:
        def __init__(self):
            object.__setattr__(self, 'conn', conectar())
        def cursor(self, *args, **kwargs):
            return Cursor(self.conn.cursor(*args, **kwargs))
        def __getattr__(self, name):
            return getattr(self.conn, name)
        def __setattr__(self, name, value):
            setattr(self.conn, name, value)

    monkeypatch.setattr('routes.donacion.get_db_connection', Conexion)
    with db_cursor() as (conn, cursor), ThreadPoolExecutor(max_workers=1) as pool:
        cursor.execute('UPDATE organizacion SET estado_verificacion=%s WHERE id_organizacion=%s', (valor, ctx['org']))
        def donar():
            from app import app
            with app.test_client() as otro_cliente:
                return otro_cliente.post('/donaciones', json=aporte(ctx), headers=ctx['headers']['donante']).status_code
        futuro = pool.submit(donar)
        try:
            assert encontro.wait(10), 'La donación debe bloquear la organización antes de escribir'
            assert not futuro.done()
        finally:
            conn.commit()
        assert futuro.result(timeout=10) == 400
        cursor.execute('SELECT COUNT(*) AS total FROM donacion')
        assert cursor.fetchone()['total'] == 1
        cursor.execute('SELECT cantidad_recibida FROM publicacion WHERE id_publicacion=%s', (ctx['campana'],))
        assert cursor.fetchone()['cantidad_recibida'] == 0


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada'])
def test_admin_conserva_gestion_y_cuenta_personal_no_depende_del_estado(client, escenario, valor):
    import bcrypt
    ctx = escenario
    estado(ctx, valor)
    with db_cursor() as (conn, cursor):
        cursor.execute('UPDATE usuario SET password=%s WHERE id_usuario=%s', (bcrypt.hashpw(b'clave1234', bcrypt.gensalt()).decode(), ctx['propio']))
        cursor.execute('SELECT correo FROM usuario WHERE id_usuario=%s', (ctx['propio'],))
        correo = cursor.fetchone()['correo']
        conn.commit()
    assert client.post('/login', json={'correo': correo, 'password': 'clave1234'}).status_code == 200
    h = ctx['headers']['propio']
    assert client.get(f"/usuarios/{ctx['propio']}", headers=h).status_code == 200
    assert client.get(f"/usuarios/{ctx['propio']}/foto", headers=h).status_code == 200
    assert client.put(f"/usuarios/{ctx['propio']}", headers=h, json=dict(
        nombre='Intermediario Propio', correo=correo, telefono='22223333', cargo='Coordinador')).status_code == 200
    h = ctx['headers']['admin']
    assert client.put(f"/publicaciones/{ctx['finalizada']}/resultado", headers=h,
                      json={'resumen': 'Actualización administrativa'}).status_code == 200
    assert client.put(f"/donaciones/{ctx['donacion']}/estado", headers=h, json={'estado': 'recibida'}).status_code == 200
    assert client.put(f"/publicaciones/{ctx['campana']}/estado", headers=h, json={'estado': 'finalizada'}).status_code == 200
    # La verificación administrativa sigue disponible mediante el PUT existente.
    with db_cursor() as (_, cursor):
        cursor.execute('SELECT * FROM organizacion WHERE id_organizacion=%s', (ctx['org'],))
        org = cursor.fetchone()
    org['estado_verificacion'] = 'verificada'
    org['telefono'] = '22221111'
    org['latitud'], org['longitud'] = float(org['latitud']), float(org['longitud'])
    assert client.put(f"/organizaciones/{ctx['org']}", headers=h, json=org).status_code == 200
    assert client.get('/intermediario/publicaciones', headers=ctx['headers']['propio']).status_code == 200


@pytest.mark.parametrize('actor,codigo', [('publico', 404), ('donante', 404), ('propio', 200), ('ajeno', 404), ('admin', 200)])
def test_resultado_respeta_privacidad_actual_de_campana_cancelada(client, escenario, actor, codigo):
    ctx = escenario
    with db_cursor() as (conn, cursor):
        cursor.execute("UPDATE publicacion SET estado='cancelada' WHERE id_publicacion=%s", (ctx['finalizada'],))
        conn.commit()
    assert client.get(f"/publicaciones/{ctx['finalizada']}/resultado", headers=ctx['headers'][actor]).status_code == codigo


@pytest.mark.parametrize('valor', ['rechazada', 'inactiva'])
def test_estados_ajenos_al_alcance_conservan_consultas_existentes(client, escenario, valor):
    ctx = escenario
    estado(ctx, valor)
    assert client.get(f"/organizaciones/{ctx['org']}", headers=ctx['headers']['admin']).status_code == 404
    assert client.get('/intermediario/publicaciones', headers=ctx['headers']['propio']).status_code == 403
    assert client.get(f"/donaciones/{ctx['donacion']}/estado", headers=ctx['headers']['propio']).status_code == 200
    # No cambiar por suposición el GET legado de resultados en otros estados.
    assert client.get(f"/publicaciones/{ctx['finalizada']}/resultado").status_code == 200


@pytest.mark.parametrize('valor', ['pendiente', 'verificada', 'archivada'])
@pytest.mark.parametrize('actor', ['propio', 'admin', 'donante'])
def test_upload_institucional_con_archivo_valido(client, escenario, valor, actor, tmp_path, monkeypatch):
    from io import BytesIO
    from PIL import Image
    ctx = escenario
    estado(ctx, valor)
    monkeypatch.setattr('routes.upload.UPLOAD_FOLDER', str(tmp_path))
    archivo = BytesIO()
    Image.new('RGB', (8, 8), 'blue').save(archivo, 'PNG')
    archivo.seek(0)
    response = client.post('/upload', headers=ctx['headers'][actor], data={'file': (archivo, 'imagen.png')})
    permitido = actor == 'admin' or (actor == 'propio' and valor == 'verificada')
    assert response.status_code == (201 if permitido else 403)
    assert len(list(tmp_path.iterdir())) == int(permitido)


def test_cambio_institucional_espera_commit_de_donacion(escenario, monkeypatch):
    ctx = escenario
    bloqueo_adquirido = threading.Event()
    continuar = threading.Event()
    cambio_iniciado = threading.Event()
    conectar = get_db_connection

    class Cursor:
        def __init__(self, cursor):
            self.cursor = cursor
        def execute(self, sql, params=None):
            resultado = self.cursor.execute(sql, params)
            if 'FROM organizacion' in sql and 'FOR SHARE' in sql:
                bloqueo_adquirido.set()
                if not continuar.wait(10):
                    raise AssertionError('No se liberó la donación de prueba')
            return resultado
        def __getattr__(self, name):
            return getattr(self.cursor, name)

    class Conexion:
        def __init__(self):
            object.__setattr__(self, 'conn', conectar())
        def cursor(self, *args, **kwargs):
            return Cursor(self.conn.cursor(*args, **kwargs))
        def __getattr__(self, name):
            return getattr(self.conn, name)
        def __setattr__(self, name, value):
            setattr(self.conn, name, value)

    monkeypatch.setattr('routes.donacion.get_db_connection', Conexion)
    def donar():
        from app import app
        with app.test_client() as client:
            return client.post('/donaciones', json=aporte(ctx), headers=ctx['headers']['donante']).status_code
    def archivar():
        with db_cursor() as (conn, cursor):
            cambio_iniciado.set()
            cursor.execute("UPDATE organizacion SET estado_verificacion='archivada' WHERE id_organizacion=%s", (ctx['org'],))
            conn.commit()
    with ThreadPoolExecutor(max_workers=2) as pool:
        donacion = pool.submit(donar)
        try:
            assert bloqueo_adquirido.wait(10)
            cambio = pool.submit(archivar)
            assert cambio_iniciado.wait(10)
            assert not cambio.done()
        finally:
            continuar.set()
        assert donacion.result(timeout=10) == 201
        cambio.result(timeout=10)
    with db_cursor() as (_, cursor):
        cursor.execute('SELECT cantidad_recibida FROM publicacion WHERE id_publicacion=%s', (ctx['campana'],))
        assert cursor.fetchone()['cantidad_recibida'] == 2
        cursor.execute('SELECT estado_verificacion FROM organizacion WHERE id_organizacion=%s', (ctx['org'],))
        assert cursor.fetchone()['estado_verificacion'] == 'archivada'

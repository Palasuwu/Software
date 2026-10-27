import os
import uuid
import pytest
from auth_utils import generate_token
from db.connection import db_cursor

pytestmark = pytest.mark.skipif(os.getenv('SPRINT9_MYSQL_INTEGRATION') != '1', reason='Habilitar SPRINT9_MYSQL_INTEGRATION=1 en el servidor de pruebas')


@pytest.fixture
def contexto_intermediario(mysql_case):
    org = mysql_case.organization()
    mysql_case.principal(org)
    admin = mysql_case.user("Administrador de prueba", "administrador")
    mysql_case.conn.commit()
    return {"organizacion": org, "admin": admin}


def test_alta_administrativa_login_y_permisos_mysql(client, contexto_intermediario):
    assert os.environ['TEST_DB_NAME'].startswith('test_case_')
    correo = f"inter-{uuid.uuid4().hex}@test.local"
    datos = { 'nombre': 'Ana Perez', 'correo': correo, 'telefono': '22223333', 'password': 'clave1234', 'rol': 'intermediario', 'id_organizacion': contexto_intermediario['organizacion'], 'cargo': 'Coordinadora' }
    headers = {'Authorization': f"Bearer {generate_token(contexto_intermediario['admin'], 'administrador')}"}
    response = client.post('/usuarios', json=datos, headers=headers)
    assert response.status_code == 201
    id_usuario = response.get_json()['usuario']['id_usuario']
    with db_cursor() as (_, cursor):
        cursor.execute('SELECT id_organizacion, cargo FROM intermediario WHERE id_usuario = %s', (id_usuario,))
        assert cursor.fetchone() == {'id_organizacion': contexto_intermediario['organizacion'], 'cargo': 'Coordinadora'}
    login = client.post('/login', json={'correo': correo, 'password': 'clave1234'})
    assert login.status_code == 200
    token = login.get_json()['token']
    headers_inter = {'Authorization': f'Bearer {token}'}
    assert client.get('/intermediario/publicaciones', headers=headers_inter).status_code == 200
    assert client.post('/usuarios', json={**datos, 'correo': 'otro@test.local'}, headers=headers_inter).status_code == 403
    assert client.put(f'/usuarios/{id_usuario}', json={**datos, 'rol': 'administrador'}, headers=headers_inter).status_code == 400


def test_organizacion_inexistente_no_deja_cuenta_parcial_mysql(client, contexto_intermediario):
    assert os.environ['TEST_DB_NAME'].startswith('test_case_')
    correo = f"invalid-{uuid.uuid4().hex}@test.local"
    response = client.post('/usuarios', json={ 'nombre': 'Ana Perez', 'correo': correo, 'telefono': '22223333', 'password': 'clave1234', 'rol': 'intermediario', 'id_organizacion': 99999999, 'cargo': 'Coordinadora' }, headers={'Authorization': f"Bearer {generate_token(contexto_intermediario['admin'], 'administrador')}"})
    assert response.status_code == 400
    with db_cursor(dictionary=False) as (_, cursor):
        cursor.execute('SELECT COUNT(*) FROM usuario WHERE correo = %s', (correo,))
        assert cursor.fetchone()[0] == 0

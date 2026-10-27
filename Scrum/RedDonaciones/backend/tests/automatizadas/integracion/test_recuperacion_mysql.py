from urllib.parse import parse_qs, urlparse

import bcrypt
import pytest

from db.connection import get_db_connection
from routes import password_reset as ruta


pytestmark = [pytest.mark.integracion, pytest.mark.regresion]


def test_correo_restablecimiento_login_y_reutilizacion_con_mysql(client, escenario, consultar, monkeypatch):
    id_usuario = escenario['id_donante']
    vieja, nueva = 'ClaveAnterior123', 'ClaveNueva456'
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE usuario SET password = %s, intentos_fallidos = 4, "
            "bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_usuario = %s",
            (bcrypt.hashpw(vieja.encode(), bcrypt.gensalt()).decode(), id_usuario)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    enviados = []
    monkeypatch.setenv('SMTP_HOST', 'smtp.example.test')
    monkeypatch.setenv('FRONTEND_URL', 'https://donaciones.example.test')
    monkeypatch.setattr(ruta, 'enviar_correo', lambda *args: enviados.append(args))
    ruta._ultima_solicitud.clear()
    try:
        correo = consultar('SELECT correo FROM usuario WHERE id_usuario = %s', (id_usuario,))[0]['correo']
        solicitud = client.post('/password/olvide', json={'correo': correo})
        assert solicitud.status_code == 200
        assert len(enviados) == 1
        enlace = next(linea for linea in enviados[0][2].splitlines() if linea.startswith('https://'))
        token = parse_qs(urlparse(enlace).query)['token'][0]

        cambio = client.post('/password/restablecer', json={'token': token, 'password': nueva})
        assert cambio.status_code == 200
        guardado = consultar(
            'SELECT password, intentos_fallidos, bloqueado_hasta FROM usuario WHERE id_usuario = %s',
            (id_usuario,)
        )[0]
        assert bcrypt.checkpw(nueva.encode(), guardado['password'].encode())
        assert guardado['intentos_fallidos'] == 0
        assert guardado['bloqueado_hasta'] is None
        assert client.post('/login', json={'correo': correo, 'password': vieja}).status_code == 401
        login = client.post('/login', json={'correo': correo, 'password': nueva})
        assert login.status_code == 200
        assert login.get_json()['token']

        reutilizado = client.post('/password/restablecer', json={'token': token, 'password': 'OtraClave789'})
        assert reutilizado.status_code == 400
        assert 'ya se usó' in reutilizado.get_json()['error']
        assert consultar('SELECT password FROM usuario WHERE id_usuario = %s', (id_usuario,))[0]['password'] == guardado['password']
    finally:
        ruta._ultima_solicitud.clear()

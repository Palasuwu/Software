"""Token firmado para restablecer la contrasena, sin tabla nueva.

El enlace que llega al correo lleva un JWT corto firmado con JWT_SECRET_KEY.
No se guarda nada en la base de datos: el token se valida solo con su firma.

Para que sea de un solo uso sin tabla, el token incluye una huella del hash
de la contrasena vigente al momento de emitirlo. Al restablecerla el hash
cambia, la huella deja de coincidir y todos los enlaces emitidos antes
quedan muertos. Lo mismo pasa si el usuario cambia su contrasena por otra
via: cualquier enlace pendiente se invalida solo.

El token NO sirve como sesion: usa la clave "id_reset" en lugar de
"id_usuario", asi que auth_utils._autenticar_request lo rechaza al no
encontrar los campos que espera de un token de sesion.
"""
import hashlib
import os
from datetime import datetime, timedelta, timezone

import jwt

TIPO = "reset_password"
VIGENCIA_MINUTOS = 30


class TokenResetInvalido(ValueError):
    """El token no es valido, expiro o ya se uso."""


def _clave():
    clave = os.environ.get("JWT_SECRET_KEY")
    if not clave:
        raise ValueError("JWT_SECRET_KEY es obligatoria y no puede estar vacia")
    return clave


def huella_de(hash_password):
    """Huella corta del hash bcrypt almacenado.

    Va dentro del token para detectar que la contrasena ya cambio. Es un
    derivado del hash, nunca de la contrasena en claro.
    """
    material = (hash_password or "").encode("utf-8")
    return hashlib.sha256(material).hexdigest()[:16]


def crear_token(id_usuario, correo, hash_password):
    """Emite el token que viaja en el enlace del correo."""
    ahora = datetime.now(timezone.utc)

    payload = {
        "tipo": TIPO,
        "id_reset": id_usuario,
        "correo": correo,
        "huella": huella_de(hash_password),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=VIGENCIA_MINUTOS),
    }

    return jwt.encode(payload, _clave(), algorithm="HS256")


def verificar_token(token):
    """Decodifica el token del enlace.

    :returns: dict con id_reset, correo y huella.
    :raises TokenResetInvalido: ausente, mal firmado, expirado o de otro tipo.
    """
    if not token or not isinstance(token, str):
        raise TokenResetInvalido("No se recibió el token")

    try:
        payload = jwt.decode(token, _clave(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise TokenResetInvalido("El enlace venció. Solicita uno nuevo")
    except jwt.InvalidTokenError:
        raise TokenResetInvalido("El enlace no es válido")

    # Un token de sesion esta firmado con la misma clave: sin esta
    # comprobacion serviria para cambiar la contrasena de su dueno.
    if payload.get("tipo") != TIPO:
        raise TokenResetInvalido("El enlace no es válido")

    if not payload.get("id_reset") or not payload.get("huella"):
        raise TokenResetInvalido("El enlace no es válido")

    return payload

"""Verificacion de los ID token que emite Firebase al iniciar sesion con Google.

Firebase aqui solo responde una pregunta: "este correo es de quien dice ser".
El rol y los permisos siguen saliendo de la tabla usuario en cada peticion
(ver auth_utils._autenticar_request), asi que no se usan custom claims ni se
delega autorizacion al proveedor.

Credenciales: GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la cuenta
de servicio, o FIREBASE_CREDENTIALS_JSON con su contenido. Sin credenciales el
modulo no rompe el arranque: solo falla el endpoint de Google.
"""
import json
import logging
import os
import threading

_lock = threading.Lock()
_app = None
_error_inicializacion = None


class FirebaseNoConfigurado(RuntimeError):
    """Falta la credencial de servicio o la libreria firebase-admin."""


class TokenGoogleInvalido(ValueError):
    """El ID token no es valido, expiro o no corresponde a este proyecto."""


def _inicializar():
    """Inicializa firebase-admin una sola vez, de forma diferida."""
    global _app, _error_inicializacion

    if _app is not None:
        return _app
    if _error_inicializacion is not None:
        raise FirebaseNoConfigurado(_error_inicializacion)

    with _lock:
        if _app is not None:
            return _app

        try:
            import firebase_admin
            from firebase_admin import credentials
        except ImportError:
            _error_inicializacion = (
                "firebase-admin no esta instalado. Agregalo a requirements.txt"
            )
            raise FirebaseNoConfigurado(_error_inicializacion)

        credencial_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        ruta_credencial = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

        try:
            if credencial_json:
                cred = credentials.Certificate(json.loads(credencial_json))
            elif ruta_credencial and os.path.exists(ruta_credencial):
                cred = credentials.Certificate(ruta_credencial)
            else:
                _error_inicializacion = (
                    "Falta la credencial de Firebase: define "
                    "FIREBASE_CREDENTIALS_JSON o GOOGLE_APPLICATION_CREDENTIALS"
                )
                raise FirebaseNoConfigurado(_error_inicializacion)

            # Si otro modulo ya inicializo la app por defecto, se reutiliza.
            try:
                _app = firebase_admin.get_app()
            except ValueError:
                _app = firebase_admin.initialize_app(cred)

        except FirebaseNoConfigurado:
            raise
        except Exception as error:
            _error_inicializacion = f"No se pudo inicializar Firebase: {error}"
            logging.exception("Error al inicializar Firebase")
            raise FirebaseNoConfigurado(_error_inicializacion)

    return _app


def verificar_id_token(id_token):
    """Devuelve los datos de identidad del ID token de Firebase.

    :returns: dict con correo, nombre y uid.
    :raises FirebaseNoConfigurado: falta credencial o libreria.
    :raises TokenGoogleInvalido: token ausente, invalido o sin correo verificado.
    """
    if not id_token or not isinstance(id_token, str):
        raise TokenGoogleInvalido("No se recibio el token de Google")

    _inicializar()
    from firebase_admin import auth as firebase_auth

    try:
        # check_revoked: una sesion revocada en Firebase deja de servir aqui.
        decodificado = firebase_auth.verify_id_token(id_token, check_revoked=True)
    except Exception as error:
        logging.warning("ID token de Google rechazado: %s", error)
        raise TokenGoogleInvalido("El token de Google no es valido o expiro")

    correo = (decodificado.get("email") or "").strip().lower()
    if not correo:
        raise TokenGoogleInvalido("La cuenta de Google no expone un correo")

    # Sin esta comprobacion, alguien podria reclamar un correo ajeno con un
    # proveedor que no lo valide.
    if not decodificado.get("email_verified"):
        raise TokenGoogleInvalido("El correo de la cuenta de Google no esta verificado")

    return {
        "correo": correo,
        "nombre": (decodificado.get("name") or "").strip(),
        "uid": decodificado.get("uid"),
    }

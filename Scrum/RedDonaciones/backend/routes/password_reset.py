"""Recuperacion de contrasena por correo.

Flujo:
  POST /password/olvide        -> {correo}: manda el enlace si la cuenta existe.
  POST /password/restablecer   -> {token, password}: fija la contrasena nueva.

Las contrasenas siguen viviendo en usuario.password como hash bcrypt: esto no
cambia el login ni agrega tablas. El enlace lleva un token firmado (ver
services/password_reset) que se invalida solo al cambiar la contrasena.

/password/olvide responde siempre lo mismo, exista o no el correo. Si
contestara distinto, cualquiera podria usarlo para averiguar quien tiene
cuenta en la plataforma.
"""
import logging
import os
import time
from html import escape

import bcrypt
from flask import Blueprint, jsonify, request

from db.connection import get_db_connection
from db.intentos_login import (
    asegurar_columnas_intentos_login,
    reiniciar_intentos_login,
)
from services.correo import CorreoNoConfigurado, enviar_correo, smtp_configurado
from services.password_reset import (
    VIGENCIA_MINUTOS,
    TokenResetInvalido,
    crear_token,
    huella_de,
    verificar_token,
)
from routes.usuario import validar_password_registro

password_reset_bp = Blueprint("password_reset", __name__)

# Respuesta unica de /password/olvide: no revela si el correo esta registrado.
RESPUESTA_GENERICA = (
    "Si el correo está registrado, en unos minutos llegará "
    "un enlace para restablecer la contraseña."
)

SEGUNDOS_ENTRE_SOLICITUDES = 60

# Evita que alguien inunde el buzon de otra persona repitiendo la solicitud.
# Vive en memoria del proceso: con varios workers el limite es por worker,
# suficiente para el abuso casual que es lo que interesa frenar aqui.
_ultima_solicitud = {}


def _demasiado_pronto(correo):
    ahora = time.monotonic()

    for clave, momento in list(_ultima_solicitud.items()):
        if ahora - momento > SEGUNDOS_ENTRE_SOLICITUDES:
            del _ultima_solicitud[clave]

    anterior = _ultima_solicitud.get(correo)
    if anterior is not None and ahora - anterior < SEGUNDOS_ENTRE_SOLICITUDES:
        return True

    _ultima_solicitud[correo] = ahora
    return False


def _url_frontend():
    return (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")


def _cuerpo_correo(nombre, enlace):
    texto = (
        f"Hola {nombre},\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta "
        "en Liga Juvenil Donaciones.\n\n"
        f"Abre este enlace para elegir una nueva:\n{enlace}\n\n"
        f"El enlace vence en {VIGENCIA_MINUTOS} minutos y solo se puede usar "
        "una vez.\n\n"
        "Si no fuiste tú, puedes ignorar este correo: tu contraseña actual "
        "sigue funcionando.\n\n"
        "Liga Juvenil Donaciones"
    )

    nombre_seguro = escape(nombre)
    enlace_seguro = escape(enlace, quote=True)
    html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;color:#1f2937;font-family:Arial,sans-serif">
<table role="presentation" style="width:100%;max-width:560px;margin:auto;border-spacing:0;background:#fff;border-radius:16px">
<tr><td style="padding:24px;background:#1e3a8a;color:#fff;border-radius:16px 16px 0 0;font-size:18px;font-weight:bold">
Liga Juvenil · Donaciones</td></tr>
<tr><td style="padding:24px;line-height:1.6;font-size:16px">
<h1 style="font-size:24px;margin:0 0 20px">Restablece tu contraseña</h1>
<p>Hola {nombre_seguro},</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
<p style="margin:28px 0"><a href="{enlace_seguro}" style="display:inline-block;padding:14px 20px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
Elegir una nueva contraseña</a></p>
<p style="padding:16px;background:#eff6ff;border-radius:8px">El enlace vence en
<strong>{VIGENCIA_MINUTOS} minutos</strong> y solo se puede usar una vez.</p>
<p>Si no fuiste tú, puedes ignorar este correo: tu contraseña actual sigue funcionando.</p>
<p style="font-size:13px;color:#475569">Si el botón no abre, copia este enlace en tu navegador:</p>
<p style="font-size:12px;word-break:break-all"><a href="{enlace_seguro}">{enlace_seguro}</a></p>
</td></tr></table></body></html>"""

    return texto, html


@password_reset_bp.route("/password/olvide", methods=["POST"])
def solicitar_restablecimiento():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Los datos deben ser un objeto JSON"}), 400
    correo = data.get("correo", "")
    if not isinstance(correo, str):
        return jsonify({"error": "El correo debe ser texto"}), 400
    correo = correo.strip().lower()

    if not correo:
        return jsonify({"error": "El correo es obligatorio"}), 400

    # Condicion del entorno, no de la cuenta: decirlo no filtra nada.
    if not smtp_configurado():
        logging.warning("Se pidio recuperar contraseña sin SMTP configurado")
        return jsonify({
            "error": "El envío de correo no está disponible en este entorno"
        }), 503

    if _demasiado_pronto(correo):
        return jsonify({"message": RESPUESTA_GENERICA}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_usuario, nombre, correo, password, activo
            FROM usuario
            WHERE correo = %s
            """,
            (correo,),
        )
        usuario = cursor.fetchone()

        # Una cuenta desactivada tampoco recibe enlace: reactivarla es
        # decision del administrador, no de quien pide el correo.
        if usuario and usuario.get("activo") == 1:
            token = crear_token(
                usuario["id_usuario"], usuario["correo"], usuario["password"]
            )
            enlace = f"{_url_frontend()}/restablecer?token={token}"
            texto, html = _cuerpo_correo(
                usuario["nombre"] or "", enlace
            )

            try:
                enviar_correo(
                    usuario["correo"],
                    "Restablece tu contraseña - Liga Juvenil Donaciones",
                    texto,
                    html,
                )
            except CorreoNoConfigurado:
                logging.exception("SMTP dejo de estar disponible")
            except Exception:
                # Se responde igual que siempre: un 500 aqui solo ocurriria
                # con correos registrados y delataria cuales lo estan.
                logging.exception(
                    "No se pudo enviar el correo de recuperación al usuario %s",
                    usuario["id_usuario"],
                )
        else:
            logging.info("Solicitud de recuperación para un correo sin cuenta activa")

        return jsonify({"message": RESPUESTA_GENERICA}), 200

    except Exception:
        logging.exception("Error al procesar la solicitud de recuperación")
        return jsonify({"error": "No se pudo procesar la solicitud"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@password_reset_bp.route("/password/restablecer", methods=["POST"])
def restablecer_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Los datos deben ser un objeto JSON"}), 400
    password = data.get("password")

    try:
        payload = verificar_token(data.get("token"))
    except TokenResetInvalido as error:
        return jsonify({"error": str(error)}), 400

    error_password = validar_password_registro(password)
    if error_password:
        return jsonify({"error": error_password}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_usuario, password, activo
            FROM usuario
            WHERE id_usuario = %s
            """,
            (payload["id_reset"],),
        )
        usuario = cursor.fetchone()

        if not usuario or usuario.get("activo") != 1:
            return jsonify({"error": "El enlace no es válido"}), 400

        # La huella del token no coincide: la contrasena ya cambio desde que
        # se emitio, asi que este enlace esta gastado.
        if payload["huella"] != huella_de(usuario["password"]):
            return jsonify({
                "error": "Este enlace ya se usó. Solicita uno nuevo"
            }), 400

        hash_nuevo = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            "UPDATE usuario SET password = %s WHERE id_usuario = %s",
            (hash_nuevo, usuario["id_usuario"]),
        )

        # Quien olvido la contrasena probablemente fallo varios intentos y
        # quedo bloqueado; sin esto tendria que esperar el castigo igual.
        asegurar_columnas_intentos_login(cursor)
        reiniciar_intentos_login(cursor, usuario["id_usuario"])
        conn.commit()

        return jsonify({
            "message": "Contraseña actualizada. Ya puedes iniciar sesión"
        }), 200

    except Exception:
        if conn:
            conn.rollback()
        logging.exception("Error al restablecer la contraseña")
        return jsonify({"error": "No se pudo restablecer la contraseña"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

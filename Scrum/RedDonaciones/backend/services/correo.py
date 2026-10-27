"""Envio de correo por SMTP.

Mismo criterio que services/firebase_auth: la falta de configuracion no rompe
el arranque, solo falla el endpoint que la necesita. Un entorno sin SMTP
levanta igual y el resto de la aplicacion no se entera.

Variables de entorno:
  SMTP_HOST       servidor (obligatoria; sin ella el envio esta deshabilitado)
  SMTP_PORT       puerto, por omision 587
  SMTP_USER       usuario; vacio para servidores sin autenticacion (MailHog)
  SMTP_PASSWORD   contrasena del usuario
  SMTP_FROM       remitente, por omision SMTP_USER
  SMTP_TLS        "false" para desactivar STARTTLS (MailHog no lo ofrece)

Con MailHog basta SMTP_HOST y SMTP_PORT. Con Gmail hacen falta usuario y
contrasena de aplicacion, no la del correo.
"""
import logging
import os
import smtplib
from email.message import EmailMessage

TIEMPO_LIMITE_SEGUNDOS = 15


class CorreoNoConfigurado(RuntimeError):
    """Falta SMTP_HOST: este entorno no puede enviar correo."""


def _entero(nombre, valor_por_omision):
    try:
        return int(os.environ.get(nombre) or valor_por_omision)
    except ValueError:
        logging.warning("%s no es un número; se usa %s", nombre, valor_por_omision)
        return valor_por_omision


def _booleano(nombre, valor_por_omision=True):
    valor = (os.environ.get(nombre) or "").strip().lower()
    if not valor:
        return valor_por_omision
    return valor not in ("0", "false", "no", "off")


def smtp_configurado():
    """True si este entorno puede enviar correo."""
    return bool((os.environ.get("SMTP_HOST") or "").strip())


def enviar_correo(destino, asunto, texto, html=None):
    """Envia un correo. Lanza CorreoNoConfigurado si falta SMTP_HOST.

    Cualquier otro fallo (servidor caido, credenciales rechazadas) sube como
    la excepcion original de smtplib para que quien llama decida que hacer.
    """
    host = (os.environ.get("SMTP_HOST") or "").strip()
    if not host:
        raise CorreoNoConfigurado(
            "Falta SMTP_HOST: define el servidor de correo en el .env"
        )

    puerto = _entero("SMTP_PORT", 587)
    usuario = (os.environ.get("SMTP_USER") or "").strip()
    contrasena = os.environ.get("SMTP_PASSWORD") or ""
    remitente = (os.environ.get("SMTP_FROM") or "").strip() or usuario or f"no-reply@{host}"

    # Queda en la bitacora a donde se entrego de verdad. Es la diferencia
    # entre "el correo salio" y "el correo quedo en el buzon de desarrollo",
    # que de otro modo se ven igual desde la aplicacion.
    logging.info(
        "Enviando correo a %s via %s:%s%s",
        destino,
        host,
        puerto,
        "" if usuario else "  (sin autenticación: buzon local de desarrollo)",
    )

    mensaje = EmailMessage()
    mensaje["From"] = remitente
    mensaje["To"] = destino
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")

    # 465 es SMTPS (cifrado desde el saludo); 587 usa STARTTLS despues.
    if puerto == 465:
        with smtplib.SMTP_SSL(host, puerto, timeout=TIEMPO_LIMITE_SEGUNDOS) as servidor:
            if usuario:
                servidor.login(usuario, contrasena)
            servidor.send_message(mensaje)
        return

    with smtplib.SMTP(host, puerto, timeout=TIEMPO_LIMITE_SEGUNDOS) as servidor:
        if _booleano("SMTP_TLS", valor_por_omision=bool(usuario)):
            servidor.starttls()
        if usuario:
            servidor.login(usuario, contrasena)
        servidor.send_message(mensaje)

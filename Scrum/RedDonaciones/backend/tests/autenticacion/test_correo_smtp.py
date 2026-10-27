from unittest.mock import MagicMock

import pytest

from services import correo


@pytest.mark.parametrize("puerto,tls", [(587, True), (465, False), (1025, False)])
def test_transporte_y_contenido_sin_enviar_correos_reales(monkeypatch, puerto, tls):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("SMTP_PORT", str(puerto))
    monkeypatch.setenv("SMTP_TLS", str(tls))
    monkeypatch.setenv("SMTP_USER", "cuenta@example.test")
    monkeypatch.setenv("SMTP_PASSWORD", "solo-pruebas")
    monkeypatch.setenv("SMTP_FROM", "Liga Juvenil <cuenta@example.test>")
    normal, seguro = MagicMock(), MagicMock()
    monkeypatch.setattr(correo.smtplib, "SMTP", normal)
    monkeypatch.setattr(correo.smtplib, "SMTP_SSL", seguro)

    correo.enviar_correo("ana@example.test", "Restablece tu contraseña", "Texto con ñ", "<p>Contraseña</p>")

    transporte, otro = (seguro, normal) if puerto == 465 else (normal, seguro)
    otro.assert_not_called()
    transporte.assert_called_once_with("smtp.example.test", puerto, timeout=15)
    servidor = transporte.return_value.__enter__.return_value
    assert servidor.starttls.call_count == (1 if tls else 0)
    servidor.login.assert_called_once_with("cuenta@example.test", "solo-pruebas")
    mensaje = servidor.send_message.call_args.args[0]
    assert mensaje["To"] == "ana@example.test"
    assert mensaje["Subject"] == "Restablece tu contraseña"
    assert "Texto con ñ" in mensaje.get_body(preferencelist=("plain",)).get_content()
    assert "Contraseña" in mensaje.get_body(preferencelist=("html",)).get_content()


def test_sin_configuracion_no_abre_una_conexion(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    smtp = MagicMock()
    monkeypatch.setattr(correo.smtplib, "SMTP", smtp)
    with pytest.raises(correo.CorreoNoConfigurado):
        correo.enviar_correo("ana@example.test", "Prueba", "Texto")
    smtp.assert_not_called()

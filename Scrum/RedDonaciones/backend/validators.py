import re

# Politica de password: minimo 8 caracteres, al menos una letra y un digito.
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validar_password(password):
    """Valida la fortaleza del password. Retorna None si es valido o un mensaje de error."""
    if not isinstance(password, str):
        return "El password es invalido"
    if len(password) < 8:
        return "El password debe tener al menos 8 caracteres"
    if not _PASSWORD_RE.match(password):
        return "El password debe incluir al menos una letra y un numero"
    return None


def validar_correo(correo):
    """Valida que el correo tenga un formato basico valido."""
    if not isinstance(correo, str) or not _EMAIL_RE.match(correo):
        return "El correo no tiene un formato valido"
    return None

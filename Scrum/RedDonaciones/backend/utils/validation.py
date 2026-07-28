import re

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_REGEX = re.compile(r"^[0-9+\-()\s]{8,20}$")
NAME_REGEX = re.compile(r"^[A-Za-zÀ-ÿ' -]+$")


def limpiar_espacios(value):
    return re.sub(r"\s+", " ", (value or "").strip())


def telefono_valido(value):
    telefono = (value or "").strip()
    return bool(PHONE_REGEX.match(telefono)) and len(re.findall(r"\d", telefono)) >= 8


def correo_valido(value):
    correo = (value or "").strip().lower()
    return bool(EMAIL_REGEX.match(correo))

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


def validar_coordenadas(latitud, longitud):
    """Valida lat/lng como par opcional (van juntas o ninguna); retorna (lat, lng, error)."""
    tiene_lat = latitud not in (None, "")
    tiene_lng = longitud not in (None, "")

    if not tiene_lat and not tiene_lng:
        return None, None, None
    if tiene_lat != tiene_lng:
        return None, None, "La latitud y la longitud deben indicarse juntas"

    try:
        lat = float(latitud)
        lng = float(longitud)
    except (TypeError, ValueError):
        return None, None, "Las coordenadas deben ser numericas"

    if not (-90 <= lat <= 90):
        return None, None, "La latitud debe estar entre -90 y 90"
    if not (-180 <= lng <= 180):
        return None, None, "La longitud debe estar entre -180 y 180"

    return lat, lng, None

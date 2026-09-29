from decimal import Decimal

import pytest

from utils.validation import normalizar_fila_coordenadas, validar_coordenadas


@pytest.mark.parametrize("latitud, longitud", [
    (90, 180),
    (-90, -180),
    (0, 0),
    ("14.6349", "-90.5069"),
    (" 14.6 ", "-90.5"),
])
def test_acepta_limites_cero_y_texto_numerico(latitud, longitud):
    lat, lng, error = validar_coordenadas(latitud, longitud)

    assert error is None
    assert lat == float(latitud)
    assert lng == float(longitud)


@pytest.mark.parametrize("latitud, longitud", [
    (90.0000001, 0),
    (0, -180.0000001),
    ("nan", 0),
    (0, "inf"),
    ("-inf", 0),
    ("14,6", "-90,5"),
    ("abc", "1"),
])
def test_rechaza_fuera_de_rango_y_valores_no_numericos(latitud, longitud):
    lat, lng, error = validar_coordenadas(latitud, longitud)

    assert error is not None
    assert lat is None
    assert lng is None


def test_el_cero_cuenta_como_valor_y_exige_su_pareja():
    _, _, error = validar_coordenadas(0, None)

    assert error == "La latitud y la longitud deben indicarse juntas"


def test_convierte_decimal_de_mysql_a_float():
    fila = normalizar_fila_coordenadas({
        "nombre": "Centro de acopio",
        "latitud": Decimal("14.6349000"),
        "longitud": Decimal("-90.5069000"),
    })

    assert fila == {"nombre": "Centro de acopio", "latitud": 14.6349, "longitud": -90.5069}
    assert isinstance(fila["latitud"], float)
    assert isinstance(fila["longitud"], float)


def test_conserva_el_cero_al_convertir():
    fila = normalizar_fila_coordenadas({"latitud": Decimal("0E-7"), "longitud": Decimal("0E-7")})

    assert fila == {"latitud": 0.0, "longitud": 0.0}


def test_deja_igual_las_filas_sin_coordenadas():
    assert normalizar_fila_coordenadas(None) is None
    assert normalizar_fila_coordenadas({"latitud": None, "longitud": None}) == {"latitud": None, "longitud": None}
    assert normalizar_fila_coordenadas({"nombre": "Sin ubicación"}) == {"nombre": "Sin ubicación"}

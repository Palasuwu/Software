from utils.validation import validar_coordenadas


def test_ninguna_coordenada_es_valido_sin_error():
    lat, lng, error = validar_coordenadas(None, None)
    assert (lat, lng, error) == (None, None, None)


def test_ambas_coordenadas_validas():
    lat, lng, error = validar_coordenadas("14.6349", "-90.5069")
    assert error is None
    assert lat == 14.6349
    assert lng == -90.5069


def test_solo_latitud_es_invalido():
    lat, lng, error = validar_coordenadas("14.6349", None)
    assert lat is None and lng is None
    assert "juntas" in error


def test_solo_longitud_es_invalido():
    lat, lng, error = validar_coordenadas("", "-90.5069")
    assert lat is None and lng is None
    assert "juntas" in error


def test_coordenadas_no_numericas():
    lat, lng, error = validar_coordenadas("abc", "def")
    assert lat is None and lng is None
    assert "numericas" in error


def test_latitud_fuera_de_rango():
    lat, lng, error = validar_coordenadas("200", "0")
    assert lat is None and lng is None
    assert "latitud" in error


def test_longitud_fuera_de_rango():
    lat, lng, error = validar_coordenadas("0", "200")
    assert lat is None and lng is None
    assert "longitud" in error

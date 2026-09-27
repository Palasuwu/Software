from services.publicacion_service import validar_publicacion_payload


def _payload_base(**overrides):
    data = {
        "id_intermediario": 1,
        "id_organizacion": 1,
        "id_articulo": 1,
        "titulo": "Campaña de prueba",
        "descripcion": "Descripcion de prueba con suficiente longitud",
        "cantidad_necesaria": 10,
        "fecha_publicacion": "2026-01-01",
        "fecha_limite": "2026-01-31",
        "estado": "activa",
    }
    data.update(overrides)
    return data


def test_sin_campos_de_ubicacion_hereda_de_la_organizacion():
    valido, errores, payload = validar_publicacion_payload(_payload_base())

    assert valido is True
    assert errores is None
    assert payload["departamento"] is None
    assert payload["municipio"] is None
    assert payload["zona"] is None
    assert payload["direccion_detalle"] is None
    assert payload["latitud"] is None
    assert payload["longitud"] is None


def test_con_ubicacion_propia_completa_es_valido():
    data = _payload_base(
        departamento="Guatemala",
        municipio="Ciudad de Guatemala",
        zona="1",
        direccion_detalle="Centro de acopio principal",
    )

    valido, errores, payload = validar_publicacion_payload(data)

    assert valido is True
    assert payload["departamento"] == "Guatemala"
    assert payload["zona"] == "1"
    assert payload["latitud"] is None
    assert payload["longitud"] is None


def test_ubicacion_propia_parcial_es_invalido():
    # Solo manda departamento: activa el modo "ubicacion propia" pero le
    # faltan los demas campos obligatorios de ese grupo.
    data = _payload_base(departamento="Guatemala")

    valido, errores, payload = validar_publicacion_payload(data)

    assert valido is False
    assert any("municipio" in e for e in errores)
    assert any("zona" in e for e in errores)
    assert any("direccion_detalle" in e for e in errores)


def test_ubicacion_propia_con_coordenadas_validas():
    data = _payload_base(
        departamento="Guatemala",
        municipio="Ciudad de Guatemala",
        zona="1",
        direccion_detalle="Centro de acopio principal",
        latitud="14.6349",
        longitud="-90.5069",
    )

    valido, errores, payload = validar_publicacion_payload(data)

    assert valido is True
    assert payload["latitud"] == 14.6349
    assert payload["longitud"] == -90.5069


def test_ubicacion_propia_con_coordenadas_invalidas():
    data = _payload_base(
        departamento="Guatemala",
        municipio="Ciudad de Guatemala",
        zona="1",
        direccion_detalle="Centro de acopio principal",
        latitud="200",
        longitud="0",
    )

    valido, errores, payload = validar_publicacion_payload(data)

    assert valido is False
    assert any("latitud" in e for e in errores)


def test_zona_invalida_con_ubicacion_propia():
    data = _payload_base(
        departamento="Guatemala",
        municipio="Ciudad de Guatemala",
        zona="abc",
        direccion_detalle="Centro de acopio principal",
    )

    valido, errores, payload = validar_publicacion_payload(data)

    assert valido is False
    assert any("zona" in e for e in errores)

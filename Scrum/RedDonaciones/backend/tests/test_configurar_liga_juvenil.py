# Protege la migracion contra bases con organizaciones ajenas a los datos iniciales.
import pytest
from scripts.configurar_liga_juvenil import DATOS, validar_destino


@pytest.mark.parametrize("nombre", ["Hogar de Ninos La Esperanza", "Liga Juvenil Nacional"])
def test_acepta_base_inicial_y_repeticion(nombre):
    assert validar_destino([{"id_organizacion": 1, "nombre": nombre}], 1)


@pytest.mark.parametrize("filas, principal", [
    ([], 1),
    ([{"id_organizacion": 1, "nombre": "Otra entidad"}], 1),
    ([{"id_organizacion": 1, "nombre": "Liga Juvenil Nacional"}], 2),
    ([{"id_organizacion": 1, "nombre": "Liga Juvenil Nacional"}, {"id_organizacion": 2, "nombre": "Otra entidad"}], 1),
    ([{"id_organizacion": 1, "nombre": "Liga Juvenil Nacional"}, {"id_organizacion": 3, "nombre": "Otra entidad"}], 1),
])
def test_rechaza_bases_no_reconocidas(filas, principal):
    with pytest.raises(ValueError):
        validar_destino(filas, principal)


def test_no_inventa_contacto_ni_coordenadas():
    assert DATOS["telefono"] == DATOS["correo"] == DATOS["direccion"] == DATOS["zona"] == ""
    assert DATOS["latitud"] is None and DATOS["longitud"] is None


def test_perfil_pendiente_es_valido_sin_aceptar_datos_incorrectos():
    from routes.organizacion import normalizar_organizacion_payload
    _, errores = normalizar_organizacion_payload({**DATOS, "estado_verificacion": "verificada"})
    assert errores == {}
    _, errores = normalizar_organizacion_payload({**DATOS, "telefono": "abc", "correo": "incorrecto", "zona": "xx", "direccion": "abc"})
    assert {"telefono", "correo", "zona", "direccion"} <= errores.keys()

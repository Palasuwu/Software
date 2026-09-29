import pytest


def estado_campana(consultar, id_publicacion):
    return consultar(
        "SELECT cantidad_recibida, cantidad_necesaria, estado FROM publicacion WHERE id_publicacion = %s",
        (id_publicacion,),
    )[0]


def donaciones_guardadas(consultar, id_publicacion):
    return consultar(
        "SELECT id_donacion, id_donante, cantidad_donada FROM donacion WHERE id_publicacion = %s ORDER BY id_donacion",
        (id_publicacion,),
    )


def codigos(resultados):
    return sorted(codigo for codigo, _ in resultados)


def test_dos_donaciones_que_completan_la_meta_solo_acepta_una(crear_campana, crear_donantes, donar_en_paralelo, consultar):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    ana, beto = crear_donantes(2)

    resultados = donar_en_paralelo(id_publicacion, [(ana, 10), (beto, 10)])

    assert codigos(resultados) == [201, 400]
    rechazada = next(body for codigo, body in resultados if codigo == 400)
    assert rechazada["error"] == "La cantidad supera lo restante disponible o la campaña ya finalizó"
    assert estado_campana(consultar, id_publicacion) == {
        "cantidad_recibida": 100,
        "cantidad_necesaria": 100,
        "estado": "finalizada",
    }
    guardadas = donaciones_guardadas(consultar, id_publicacion)
    aceptada = next(body for codigo, body in resultados if codigo == 201)
    assert [fila["id_donacion"] for fila in guardadas] == [aceptada["id_donacion"]]


def test_cada_donacion_usa_su_propia_conexion(crear_campana, crear_donantes, donar_en_paralelo):
    id_publicacion = crear_campana()
    ana, beto = crear_donantes(2)

    donar_en_paralelo(id_publicacion, [(ana, 10), (beto, 10)])

    assert len(donar_en_paralelo.conexiones) == 2
    assert len(set(donar_en_paralelo.conexiones)) == 2


def test_la_donacion_rechazada_no_deja_rastro(crear_campana, crear_donantes, donar_en_paralelo, consultar):
    id_publicacion = crear_campana()
    ana, beto = crear_donantes(2)

    resultados = donar_en_paralelo(id_publicacion, [(ana, 10), (beto, 10)])

    ids_donantes = {ana: 0, beto: 1}
    rechazado = next(d for d, i in ids_donantes.items() if resultados[i][0] == 400)
    assert consultar("SELECT COUNT(*) AS total FROM donacion WHERE id_donante = %s", (rechazado,))[0]["total"] == 0
    assert consultar("SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = %s", (rechazado,))[0]["total"] == 0
    assert consultar("SELECT COUNT(*) AS total FROM notificacion")[0]["total"] == 2


def test_si_ambas_caben_se_aceptan_las_dos(crear_campana, crear_donantes, donar_en_paralelo, consultar):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    ana, beto = crear_donantes(2)

    resultados = donar_en_paralelo(id_publicacion, [(ana, 5), (beto, 5)])

    assert codigos(resultados) == [201, 201]
    assert estado_campana(consultar, id_publicacion)["cantidad_recibida"] == 100
    assert estado_campana(consultar, id_publicacion)["estado"] == "finalizada"
    assert len(donaciones_guardadas(consultar, id_publicacion)) == 2


def test_si_juntas_se_pasan_de_la_meta_solo_entra_una(crear_campana, crear_donantes, donar_en_paralelo, consultar):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    ana, beto = crear_donantes(2)

    resultados = donar_en_paralelo(id_publicacion, [(ana, 6), (beto, 5)])

    assert codigos(resultados) == [201, 400]
    campana = estado_campana(consultar, id_publicacion)
    guardadas = donaciones_guardadas(consultar, id_publicacion)
    assert len(guardadas) == 1
    assert campana["cantidad_recibida"] == 90 + guardadas[0]["cantidad_donada"]
    assert campana["estado"] == "activa"


def test_varios_donantes_a_la_vez_nunca_superan_la_meta(crear_campana, crear_donantes, donar_en_paralelo, consultar):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    donantes = crear_donantes(5)

    resultados = donar_en_paralelo(id_publicacion, [(id_donante, 3) for id_donante in donantes])

    assert codigos(resultados) == [201, 201, 201, 400, 400]
    campana = estado_campana(consultar, id_publicacion)
    assert campana["cantidad_recibida"] == 99
    assert campana["estado"] == "activa"
    assert sum(fila["cantidad_donada"] for fila in donaciones_guardadas(consultar, id_publicacion)) == 9


@pytest.mark.parametrize("ronda", range(10))
def test_sin_forzar_el_orden_el_resultado_es_consistente(crear_campana, crear_donantes, donar_en_paralelo, consultar, ronda):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    ana, beto = crear_donantes(2)

    resultados = donar_en_paralelo(id_publicacion, [(ana, 10), (beto, 10)], sincronizar=False)

    assert codigos(resultados) == [201, 400]
    campana = estado_campana(consultar, id_publicacion)
    guardadas = donaciones_guardadas(consultar, id_publicacion)
    assert campana["cantidad_recibida"] == 100
    assert campana["estado"] == "finalizada"
    assert sum(fila["cantidad_donada"] for fila in guardadas) == 10

import services.donacion_service


def test_si_falla_la_notificacion_no_queda_la_donacion_a_medias(
    crear_campana, crear_donantes, donar_en_paralelo, consultar, monkeypatch
):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    (ana,) = crear_donantes(1)
    crear_notificacion = services.donacion_service.crear_notificacion
    llamadas = []

    def falla_la_segunda(cursor, id_usuario, *args, **kwargs):
        llamadas.append(id_usuario)
        if len(llamadas) == 2:
            raise RuntimeError("Error al notificar al intermediario")
        return crear_notificacion(cursor, id_usuario, *args, **kwargs)

    monkeypatch.setattr("services.donacion_service.crear_notificacion", falla_la_segunda)

    [(codigo, body)] = donar_en_paralelo(id_publicacion, [(ana, 5)], sincronizar=False)

    assert codigo == 500
    assert body["error"] == "Error al registrar la donación"
    campana = consultar("SELECT cantidad_recibida, estado FROM publicacion WHERE id_publicacion = %s", (id_publicacion,))[0]
    assert campana == {"cantidad_recibida": 90, "estado": "activa"}
    assert consultar("SELECT COUNT(*) AS total FROM donacion")[0]["total"] == 0
    assert consultar("SELECT COUNT(*) AS total FROM notificacion")[0]["total"] == 0


def test_despues_de_un_fallo_se_puede_donar_normalmente(
    crear_campana, crear_donantes, donar_en_paralelo, consultar, monkeypatch
):
    id_publicacion = crear_campana(cantidad_necesaria=100, cantidad_recibida=90)
    (ana,) = crear_donantes(1)
    crear_notificacion = services.donacion_service.crear_notificacion
    fallos = []

    def falla_una_vez(cursor, id_usuario, *args, **kwargs):
        if not fallos:
            fallos.append(id_usuario)
            raise RuntimeError("Error al notificar")
        return crear_notificacion(cursor, id_usuario, *args, **kwargs)

    monkeypatch.setattr("services.donacion_service.crear_notificacion", falla_una_vez)

    [(primero, _)] = donar_en_paralelo(id_publicacion, [(ana, 10)], sincronizar=False)
    [(reintento, _)] = donar_en_paralelo(id_publicacion, [(ana, 10)], sincronizar=False)

    assert (primero, reintento) == (500, 201)
    campana = consultar("SELECT cantidad_recibida, estado FROM publicacion WHERE id_publicacion = %s", (id_publicacion,))[0]
    assert campana == {"cantidad_recibida": 100, "estado": "finalizada"}
    assert consultar("SELECT COUNT(*) AS total FROM donacion")[0]["total"] == 1

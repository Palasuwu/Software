from services.donacion_service import (
    _aplicar_cambio_estado,
    cambiar_estado_donacion,
    cambiar_estado_donaciones_masivo,
    crear_notificaciones_nueva_donacion,
)


class CursorEstadoDonacion:
    def __init__(self, donaciones):
        self.donaciones = donaciones
        self.donacion_actual = None
        self.operaciones = []
        self.rowcount = 0

    def execute(self, sql, params=None):
        consulta = " ".join(sql.split())
        self.operaciones.append((consulta, params))

        if consulta.startswith("SELECT"):
            self.donacion_actual = self.donaciones.get(params[0])
        elif consulta.startswith("UPDATE donacion"):
            # UPDATE condicionado: solo aplica si el estado leido sigue vigente
            nuevo_estado, id_donacion, estado_esperado = params
            if self.donaciones[id_donacion]["estado"] == estado_esperado:
                self.donaciones[id_donacion]["estado"] = nuevo_estado
                self.rowcount = 1
            else:
                self.rowcount = 0

    def fetchone(self):
        return self.donacion_actual


def donacion(id_donacion, estado="pendiente", cantidad_donada=4):
    return {
        "id_donacion": id_donacion,
        "id_donante": 21,
        "id_publicacion": 8,
        "id_organizacion": 3,
        "publicacion_titulo": "Campaña de alimentos",
        "estado": estado,
        "cantidad_donada": cantidad_donada,
    }


def notificaciones_creadas(cursor):
    return [
        operacion for operacion in cursor.operaciones
        if operacion[0].startswith("INSERT INTO notificacion")
    ]


def test_notifica_al_donante_al_cambiar_estado():
    cursor = CursorEstadoDonacion({4: donacion(4)})

    resultado, error, codigo = cambiar_estado_donacion(
        cursor, 4, "recibida"
    )

    assert error is None
    assert codigo == 200
    assert resultado["estado"] == "recibida"

    notificaciones = notificaciones_creadas(cursor)
    assert len(notificaciones) == 1
    assert notificaciones[0][1] == (
        21,
        "estado_donacion",
        "Donación recibida",
        "La organización confirmó que recibió tu donación para Campaña de alimentos.",
        "/donaciones/4",
    )


def test_notifica_al_intermediario_cuando_se_registra_una_donacion():
    cursor = CursorEstadoDonacion({})

    crear_notificaciones_nueva_donacion(
        cursor,
        {
            "id_intermediario": 14,
            "titulo": "Campaña de alimentos",
        },
        id_donante=21,
        id_donacion=9,
        nombre_contacto="Ana Pérez",
        cantidad_donada=4,
    )

    notificaciones = notificaciones_creadas(cursor)
    assert len(notificaciones) == 2
    assert notificaciones[0][1] == (
        21,
        "donacion_registrada",
        "Donación registrada",
        "Tu aporte de 4 unidades para Campaña de alimentos fue registrado.",
        "/donaciones/9",
    )
    assert notificaciones[1][1] == (
        14,
        "nueva_donacion",
        "Nueva donación recibida",
        "Ana Pérez donó 4 unidades para Campaña de alimentos.",
        "/intermediario",
    )


def test_no_notifica_si_la_transicion_es_invalida():
    cursor = CursorEstadoDonacion({4: donacion(4)})

    resultado, error, codigo = cambiar_estado_donacion(
        cursor, 4, "entregada"
    )

    assert resultado is None
    assert codigo == 400
    assert "Transición de estado no permitida" in error
    assert notificaciones_creadas(cursor) == []


def test_actualizacion_masiva_notifica_cada_cambio_valido():
    cursor = CursorEstadoDonacion({
        4: donacion(4),
        5: donacion(5, "recibida"),
    })

    actualizadas, omitidas = cambiar_estado_donaciones_masivo(
        cursor,
        [4, 5],
        "recibida",
        id_organizacion=3,
    )

    assert [item["id_donacion"] for item in actualizadas] == [4]
    assert [item["id_donacion"] for item in omitidas] == [5]
    assert len(notificaciones_creadas(cursor)) == 1


def actualizaciones_publicacion(cursor):
    return [
        operacion for operacion in cursor.operaciones
        if operacion[0].startswith("UPDATE publicacion")
    ]


def test_rechazar_donacion_descuenta_el_contador_de_la_campana():
    cursor = CursorEstadoDonacion({4: donacion(4, "recibida", cantidad_donada=7)})

    resultado, error, codigo = cambiar_estado_donacion(cursor, 4, "rechazada")

    assert error is None
    assert codigo == 200
    descuentos = actualizaciones_publicacion(cursor)
    assert len(descuentos) == 1
    assert descuentos[0][1] == (7, 7, 8, 7)  # cantidad, cantidad, id_publicacion, cantidad


def test_no_se_descuenta_el_contador_en_otras_transiciones():
    cursor = CursorEstadoDonacion({4: donacion(4, "pendiente")})

    cambiar_estado_donacion(cursor, 4, "recibida")

    assert actualizaciones_publicacion(cursor) == []


def test_cambio_de_estado_detecta_conflicto_de_concurrencia():
    # Simula que otra conexion ya cambio la donacion a "recibida" despues
    # de que esta solicitud leyo el estado "pendiente".
    cursor = CursorEstadoDonacion({4: donacion(4, estado="recibida")})
    lectura_desactualizada = donacion(4, estado="pendiente")

    aplicado = _aplicar_cambio_estado(cursor, lectura_desactualizada, "rechazada")

    assert aplicado is False
    assert cursor.donaciones[4]["estado"] == "recibida"  # no se sobrescribio el cambio real
    assert actualizaciones_publicacion(cursor) == []  # tampoco se toco el contador


def test_actualizacion_masiva_omite_donacion_con_conflicto_de_concurrencia(monkeypatch):
    cursor = CursorEstadoDonacion({4: donacion(4, "pendiente")})

    # Entre la lectura y la escritura, otra solicitud ya cambio el estado real
    original_execute = cursor.execute

    def execute_con_carrera(sql, params=None):
        consulta = " ".join(sql.split())
        if consulta.startswith("UPDATE donacion"):
            cursor.donaciones[4]["estado"] = "recibida"
        original_execute(sql, params)

    monkeypatch.setattr(cursor, "execute", execute_con_carrera)

    actualizadas, omitidas = cambiar_estado_donaciones_masivo(cursor, [4], "recibida")

    assert actualizadas == []
    assert [item["id_donacion"] for item in omitidas] == [4]
    assert "cambió de estado" in omitidas[0]["motivo"]

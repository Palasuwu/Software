from services.donacion_service import (
    cambiar_estado_donacion,
    cambiar_estado_donaciones_masivo,
)


class CursorEstadoDonacion:
    def __init__(self, donaciones):
        self.donaciones = donaciones
        self.donacion_actual = None
        self.operaciones = []

    def execute(self, sql, params=None):
        consulta = " ".join(sql.split())
        self.operaciones.append((consulta, params))

        if consulta.startswith("SELECT"):
            self.donacion_actual = self.donaciones.get(params[0])
        elif consulta.startswith("UPDATE donacion"):
            estado, id_donacion = params
            self.donaciones[id_donacion]["estado"] = estado

    def fetchone(self):
        return self.donacion_actual


def donacion(id_donacion, estado="pendiente"):
    return {
        "id_donacion": id_donacion,
        "id_donante": 21,
        "id_publicacion": 8,
        "id_organizacion": 3,
        "publicacion_titulo": "Campaña de alimentos",
        "estado": estado,
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
        "Estado de donación actualizado",
        (
            "Tu donación para Campaña de alimentos "
            "cambió de pendiente a recibida."
        ),
        "/donaciones/4",
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

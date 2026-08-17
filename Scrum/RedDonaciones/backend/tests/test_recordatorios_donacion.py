from services.notificacion_service import (
    generar_recordatorios_donaciones_pendientes,
)


class CursorRecordatorio:
    def __init__(self):
        self.consulta = ""
        self.parametros = None

    def execute(self, sql, params=None):
        self.consulta = " ".join(sql.split())
        self.parametros = params


def test_recordatorio_busca_entregas_pendientes_sin_duplicarlas():
    cursor = CursorRecordatorio()

    generar_recordatorios_donaciones_pendientes(cursor, 14)

    assert cursor.consulta.startswith("INSERT INTO notificacion")
    assert "d.estado = 'pendiente'" in cursor.consulta
    assert "d.fecha_donacion <= CURDATE()" in cursor.consulta
    assert "NOT EXISTS" in cursor.consulta
    assert "recordatorio_donacion_pendiente" in cursor.consulta
    assert cursor.parametros == (14,)

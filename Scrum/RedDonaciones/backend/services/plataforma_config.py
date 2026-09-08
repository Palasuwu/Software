# Configuracion global de la plataforma (no ligada a una organizacion en particular)
import os


def obtener_id_organizacion_principal():
    return int(os.environ.get("ID_ORGANIZACION_PRINCIPAL", "1"))

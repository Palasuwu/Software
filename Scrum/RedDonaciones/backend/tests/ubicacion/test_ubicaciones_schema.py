from db.ubicaciones_schema import asegurar_columnas_ubicacion


class CursorFalsoUbicacion:
    def __init__(self, resultados_fetchone):
        self.resultados = list(resultados_fetchone)
        self.consultas_ejecutadas = []

    def execute(self, sql, params=None):
        self.consultas_ejecutadas.append(" ".join(sql.split()))

    def fetchone(self):
        return self.resultados.pop(0)


def test_agrega_columnas_de_coordenadas_si_no_existen():
    resultados = [
        {"total": 0}, {"total": 0}, {"total": 0}, {"total": 0},
        {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"},
    ]
    cursor = CursorFalsoUbicacion(resultados)

    asegurar_columnas_ubicacion(cursor)

    alters = [q for q in cursor.consultas_ejecutadas if q.startswith("ALTER TABLE") and "ADD COLUMN" in q]
    assert len(alters) == 4
    assert "ALTER TABLE organizacion ADD COLUMN latitud" in alters[0]
    assert "ALTER TABLE organizacion ADD COLUMN longitud" in alters[1]
    assert "ALTER TABLE publicacion ADD COLUMN latitud" in alters[2]
    assert "ALTER TABLE publicacion ADD COLUMN longitud" in alters[3]


def test_no_repite_alter_si_las_columnas_de_coordenadas_ya_existen():
    resultados = [
        {"total": 1}, {"total": 1}, {"total": 1}, {"total": 1},
        {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"},
    ]
    cursor = CursorFalsoUbicacion(resultados)

    asegurar_columnas_ubicacion(cursor)

    alters = [q for q in cursor.consultas_ejecutadas if "ADD COLUMN" in q]
    assert alters == []


def test_relaja_not_null_de_ubicacion_de_campana_si_hace_falta():
    resultados = [
        {"total": 1}, {"total": 1}, {"total": 1}, {"total": 1},
        {"nullable": "NO"}, {"nullable": "NO"}, {"nullable": "NO"}, {"nullable": "NO"},
    ]
    cursor = CursorFalsoUbicacion(resultados)

    asegurar_columnas_ubicacion(cursor)

    modifies = [q for q in cursor.consultas_ejecutadas if "MODIFY COLUMN" in q]
    assert len(modifies) == 4
    assert any("departamento" in q for q in modifies)
    assert any("municipio" in q for q in modifies)
    assert any("zona" in q for q in modifies)
    assert any("direccion_detalle" in q for q in modifies)


def test_no_repite_modify_si_ya_son_nullable():
    resultados = [
        {"total": 1}, {"total": 1}, {"total": 1}, {"total": 1},
        {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"}, {"nullable": "YES"},
    ]
    cursor = CursorFalsoUbicacion(resultados)

    asegurar_columnas_ubicacion(cursor)

    modifies = [q for q in cursor.consultas_ejecutadas if "MODIFY COLUMN" in q]
    assert modifies == []

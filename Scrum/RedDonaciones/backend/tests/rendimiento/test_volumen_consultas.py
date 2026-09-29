import os
from collections import Counter
from datetime import date

import pytest

from medicion import RESULTADOS, encabezados, explicar, medir


pytestmark = pytest.mark.skipif(
    os.getenv("RENDIMIENTO") != "1",
    reason="Pruebas de volumen: ejecutar con RENDIMIENTO=1",
)

LIMITE_MS = float(os.getenv("RENDIMIENTO_LIMITE_MS", "2000"))


def donaciones_de(volumen, filtro=lambda fila: True):
    return [fila for fila in volumen["donaciones"] if filtro(fila)]


def test_listado_publico_de_campanas(cliente, volumen):
    body, tiempo = medir(cliente, volumen, "GET /publicaciones", "/publicaciones")

    assert len(body) == volumen["campanas"]
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_detalle_de_una_campana(cliente, volumen):
    body, tiempo = medir(cliente, volumen, "GET /publicaciones/<id>", f"/publicaciones/{volumen['campana']}")

    esperado = sum(fila[6] for fila in donaciones_de(volumen, lambda fila: fila[1] == volumen["campana"]))
    assert body[0]["cantidad_recibida"] == esperado
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_listado_de_organizaciones(cliente, volumen):
    body, tiempo = medir(cliente, volumen, "GET /organizaciones", "/organizaciones")

    assert len(body) == 5
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_historial_de_un_donante(cliente, volumen):
    headers = encabezados(volumen["donante"], "donante")

    body, tiempo = medir(cliente, volumen, "GET /donaciones (donante)", "/donaciones", headers)

    esperado = len(donaciones_de(volumen, lambda fila: fila[0] == volumen["donante"]))
    assert len(body) == min(esperado, 50)
    assert {fila["id_donante"] for fila in body} == {volumen["donante"]}
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_donaciones_recibidas_por_una_organizacion(cliente, volumen):
    headers = encabezados(volumen["intermediario"], "intermediario")

    body, tiempo = medir(cliente, volumen, "GET /intermediario/donaciones", "/intermediario/donaciones", headers)

    organizacion = volumen["organizacion_de_campana"]
    esperado = donaciones_de(volumen, lambda fila: organizacion[fila[1]] == volumen["organizacion"])
    assert len(body) == len(esperado)
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_busqueda_de_donaciones_por_texto(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")

    body, tiempo = medir(cliente, volumen, "GET /intermediario/donaciones?buscar", "/intermediario/donaciones?buscar=Donante%201", headers)

    assert len(body) > 0
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_resumen_de_reportes_completo(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")

    body, tiempo = medir(cliente, volumen, "GET /reportes/resumen", "/reportes/resumen", headers)

    por_estado = Counter(fila[8] for fila in volumen["donaciones"])
    assert {fila["estado"]: fila["total"] for fila in body["por_estado"]} == dict(por_estado)
    assert sum(fila["total_donado"] for fila in body["por_estado"]) == sum(fila[6] for fila in volumen["donaciones"])
    assert body["donantes_unicos"] == len({fila[0] for fila in volumen["donaciones"]})
    assert len(body["por_campana"]) == volumen["campanas"]
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_resumen_de_reportes_por_trimestre(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")
    url = "/reportes/resumen?fecha_inicio=2025-01-01&fecha_fin=2025-03-31"

    body, tiempo = medir(cliente, volumen, "GET /reportes/resumen (trimestre)", url, headers)

    en_rango = donaciones_de(volumen, lambda fila: date(2025, 1, 1) <= fila[7] <= date(2025, 3, 31))
    assert sum(fila["total"] for fila in body["por_estado"]) == len(en_rango)
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_detalle_de_reportes_primera_y_ultima_pagina(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")
    total = len(volumen["donaciones"])
    ultima = -(-total // 20)

    primera, tiempo_primera = medir(cliente, volumen, "GET /reportes/detalle (página 1)", "/reportes/detalle?page=1", headers)
    final, tiempo_final = medir(cliente, volumen, "GET /reportes/detalle (última página)", f"/reportes/detalle?page={ultima}", headers)

    assert primera["total"] == total
    assert primera["total_paginas"] == ultima
    assert len(primera["items"]) == 20
    assert len(final["items"]) == total - (ultima - 1) * 20
    assert tiempo_primera["mediana_ms"] < LIMITE_MS
    assert tiempo_final["mediana_ms"] < LIMITE_MS


def test_detalle_de_reportes_filtrado(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")
    url = f"/reportes/detalle?estado=entregada&id_publicacion={volumen['campana']}&page_size=100"

    body, tiempo = medir(cliente, volumen, "GET /reportes/detalle (filtrado)", url, headers)

    esperado = donaciones_de(volumen, lambda fila: fila[1] == volumen["campana"] and fila[8] == "entregada")
    assert body["total"] == len(esperado)
    assert tiempo["mediana_ms"] < LIMITE_MS


def test_exportar_todo_el_detalle_en_paginas_de_100(cliente, volumen):
    headers = encabezados(volumen["admin"], "administrador")
    total = len(volumen["donaciones"])

    body, tiempo = medir(cliente, volumen, "GET /reportes/detalle (page_size=100)", "/reportes/detalle?page_size=100", headers)

    assert len(body["items"]) == 100
    assert body["total_paginas"] == -(-total // 100)
    assert tiempo["mediana_ms"] < LIMITE_MS
    RESULTADOS["Exportar todo el detalle (estimado)"] = RESULTADOS.get("Exportar todo el detalle (estimado)", {})
    RESULTADOS["Exportar todo el detalle (estimado)"][volumen["nombre"]] = {
        "mediana_ms": tiempo["mediana_ms"] * body["total_paginas"],
        "maximo_ms": tiempo["maximo_ms"] * body["total_paginas"],
        "kb": tiempo["kb"] * body["total_paginas"],
    }


def test_filtrar_por_campana_usa_indice(volumen):
    plan = explicar(
        volumen,
        "Donaciones de una campaña",
        "SELECT COUNT(*) FROM donacion d INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion "
        "WHERE d.id_publicacion = %s",
        (volumen["campana"],),
    )

    donacion = next(fila for fila in plan if fila["table"] == "d")
    assert donacion["key"] is not None
    assert donacion["rows"] < len(volumen["donaciones"])


@pytest.mark.parametrize("consulta, sql", [
    (
        "Historial del donante",
        "SELECT d.id_donacion FROM donacion d JOIN publicacion p ON p.id_publicacion = d.id_publicacion "
        "WHERE (%s IS NULL OR d.id_donante = %s) ORDER BY d.fecha_donacion DESC, d.id_donacion DESC LIMIT 50",
    ),
    (
        "Reportes por rango de fechas",
        "SELECT d.estado, COUNT(*) FROM donacion d INNER JOIN publicacion p ON p.id_publicacion = d.id_publicacion "
        "WHERE d.fecha_donacion >= %s AND d.fecha_donacion <= %s GROUP BY d.estado",
    ),
])
def test_registra_el_plan_de_consultas_frecuentes(volumen, consulta, sql):
    params = (volumen["donante"], volumen["donante"]) if "id_donante" in sql else ("2025-01-01", "2025-03-31")

    plan = explicar(volumen, consulta, sql, params)

    assert any(fila["table"] == "d" for fila in plan)

# Exportación real del detalle de reportes con el volumen acordado para la tarea 17:
# 500 donantes con 10 donaciones cada uno (5 000) y el doble como prueba de estrés.
# A diferencia de test_exportar_todo_el_detalle_en_paginas_de_100, aquí se recorren
# todas las páginas de verdad en lugar de multiplicar el tiempo de la primera.
import os
import time
import tracemalloc

import pytest

import db.connection
import medicion
from app import app
from medicion import SECRET, encabezados
from tests.mysql_support import temporary_database

pytestmark = [
    pytest.mark.mysql,
    pytest.mark.skipif(os.getenv("RENDIMIENTO") != "1", reason="Pruebas de volumen: ejecutar con RENDIMIENTO=1"),
]

DONANTES = 500
VOLUMENES = {
    "esperado": {"campanas": 50, "donaciones": 5_000},
    "estres": {"campanas": 100, "donaciones": 10_000},
}
# RNF-04: la exportación completa no debe pasar de 10 s con el volumen esperado.
LIMITE_S = float(os.getenv("RENDIMIENTO_EXPORTACION_S", "10"))
PAGINA = 100


@pytest.fixture(scope="module", params=list(VOLUMENES))
def volumen_exportacion(request):
    with pytest.MonkeyPatch.context() as mp:
        with temporary_database(mp, "exportacion") as nombre:
            mp.setattr(medicion, "DONANTES", DONANTES)
            with db.connection.db_cursor(dictionary=False) as (conn, cursor):
                datos = medicion._poblar(cursor, **VOLUMENES[request.param])
                conn.commit()
                cursor.execute("ANALYZE TABLE publicacion, donacion")
                cursor.fetchall()
            mp.setenv("ID_ORGANIZACION_PRINCIPAL", str(datos["organizacion"]))
            mp.setenv("JWT_SECRET_KEY", SECRET)
            datos["nombre"] = request.param
            datos["base"] = nombre
            yield datos


def exportar(cliente, headers, filtros=""):
    """Mismo recorrido que exportarDetalle en AdminReportes, midiendo tiempo, tamaño y memoria."""
    filas, tiempos, kb = [], [], 0
    pagina, total_paginas, total = 1, 1, None
    tracemalloc.start()
    inicio = time.perf_counter()
    while pagina <= total_paginas:
        antes = time.perf_counter()
        respuesta = cliente.get(f"/reportes/detalle?{filtros}&page={pagina}&page_size={PAGINA}", headers=headers)
        tiempos.append(time.perf_counter() - antes)
        assert respuesta.status_code == 200, respuesta.get_json()
        cuerpo = respuesta.get_json()
        kb += len(respuesta.data) / 1024
        filas.extend(cuerpo["items"])
        total = cuerpo["total"] if total is None else total
        total_paginas = cuerpo["total_paginas"] or 1
        pagina += 1
    segundos = time.perf_counter() - inicio
    _, pico = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return dict(filas=filas, total=total, segundos=segundos, kb=kb, pico_mb=pico / 1024 / 1024,
                pagina_mas_lenta_ms=max(tiempos) * 1000, primera_ms=tiempos[0] * 1000, paginas=len(tiempos))


def reportar(capsys, volumen, nombre, r):
    with capsys.disabled():
        print(
            f"\n[exportación {volumen['nombre']}: {len(volumen['donaciones'])} donaciones, {DONANTES} donantes] {nombre}: "
            f"{len(r['filas'])} filas en {r['paginas']} páginas, {r['segundos']:.2f} s "
            f"(primera página {r['primera_ms']:.0f} ms, la más lenta {r['pagina_mas_lenta_ms']:.0f} ms), "
            f"{r['kb']:.0f} KB de JSON, pico de memoria {r['pico_mb']:.1f} MB"
        )


def test_exportacion_completa_sin_filtros(volumen_exportacion, capsys):
    headers = encabezados(volumen_exportacion["admin"], "administrador")
    resultado = exportar(app.test_client(), headers)
    reportar(capsys, volumen_exportacion, "sin filtros", resultado)

    ids = [fila["id_donacion"] for fila in resultado["filas"]]
    assert resultado["total"] == len(volumen_exportacion["donaciones"])
    assert len(ids) == resultado["total"]
    assert len(set(ids)) == len(ids)
    if volumen_exportacion["nombre"] == "esperado":
        assert resultado["segundos"] <= LIMITE_S


def test_exportacion_completa_con_filtros(volumen_exportacion, capsys):
    headers = encabezados(volumen_exportacion["admin"], "administrador")
    filtros = "fecha_inicio=2025-03-01&fecha_fin=2025-09-30&estado=entregada"
    resultado = exportar(app.test_client(), headers, filtros)
    reportar(capsys, volumen_exportacion, "con filtros de fecha y estado", resultado)

    esperados = [fila for fila in volumen_exportacion["donaciones"]
                 if fila[8] == "entregada" and "2025-03-01" <= fila[7].isoformat() <= "2025-09-30"]
    assert len(resultado["filas"]) == resultado["total"] == len(esperados)
    assert all(fila["estado"] == "entregada" for fila in resultado["filas"])
    if volumen_exportacion["nombre"] == "esperado":
        assert resultado["segundos"] <= LIMITE_S

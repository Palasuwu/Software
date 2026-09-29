# Llena una base de datos temporal con muchas campañas y donaciones, mide los
# tiempos de respuesta y la borra al terminar. Se ejecutan solo con RENDIMIENTO=1.
import os
import time
import uuid

import pytest

import db.connection
from app import app
from medicion import PLANES, RESULTADOS, SECRET, TABLAS, VOLUMENES, _poblar


@pytest.fixture(scope="module", params=list(VOLUMENES))
def volumen(request):
    nombre_real = os.getenv("DB_NAME")
    nombre = f"{nombre_real}_rendimiento_{uuid.uuid4().hex[:8]}"
    conn = db.connection.get_db_connection()
    cursor = conn.cursor()

    with pytest.MonkeyPatch.context() as mp:
        try:
            cursor.execute(f"CREATE DATABASE `{nombre}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            for tabla in TABLAS:
                cursor.execute(f"SHOW CREATE TABLE `{nombre_real}`.`{tabla}`")
                definicion = cursor.fetchone()[1]
                cursor.execute(f"USE `{nombre}`")
                cursor.execute(definicion)

            inicio = time.perf_counter()
            datos = _poblar(cursor, **VOLUMENES[request.param])
            conn.commit()
            cursor.execute("ANALYZE TABLE publicacion, donacion")
            cursor.fetchall()
            cursor.execute(f"USE `{nombre_real}`")

            mp.setenv("DB_NAME", nombre)
            mp.setenv("JWT_SECRET_KEY", SECRET)
            datos["nombre"] = request.param
            datos["base"] = nombre
            datos["segundos_carga"] = time.perf_counter() - inicio
            yield datos
        finally:
            cursor.execute(f"DROP DATABASE IF EXISTS `{nombre}`")
            cursor.close()
            conn.close()


@pytest.fixture
def cliente():
    return app.test_client()


def pytest_terminal_summary(terminalreporter):
    if not RESULTADOS:
        return

    escribir = terminalreporter.write_line
    terminalreporter.section("Comparación de rendimiento")
    for nombre, datos in VOLUMENES.items():
        escribir(f"Volumen {nombre}: {datos['campanas']} campañas, {datos['donaciones']} donaciones")
    escribir("")
    escribir(f"{'Consulta':<42}{'bajo (ms)':>11}{'alto (ms)':>11}{'x':>7}{'bajo KB':>10}{'alto KB':>10}")
    for consulta, por_volumen in RESULTADOS.items():
        bajo = por_volumen.get("bajo")
        alto = por_volumen.get("alto")
        if not bajo or not alto:
            continue
        factor = alto["mediana_ms"] / bajo["mediana_ms"] if bajo["mediana_ms"] else 0
        escribir(
            f"{consulta:<42}{bajo['mediana_ms']:>11.1f}{alto['mediana_ms']:>11.1f}{factor:>7.1f}"
            f"{bajo['kb']:>10.1f}{alto['kb']:>10.1f}"
        )

    if PLANES:
        escribir("")
        escribir("Plan de MySQL en volumen alto (tabla: tipo de acceso, índice, filas revisadas)")
        for consulta, por_volumen in PLANES.items():
            plan = por_volumen.get("alto") or next(iter(por_volumen.values()))
            pasos = ", ".join(f"{fila['table']}: {fila['type']}, {fila['key'] or 'sin índice'}, {fila['rows']}" for fila in plan)
            escribir(f"  {consulta}: {pasos}")

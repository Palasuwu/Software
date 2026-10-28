# La exportación a CSV del frontend recorre /reportes/detalle de 100 en 100.
# Aquí se revisa que ese recorrido devuelva el archivo completo y coherente
# con datos conocidos, y qué pasa si los datos cambian entre una página y otra.
from datetime import date, timedelta

import pytest

from auth_utils import generate_token

TOTAL = 250
PAGINA = 100
ESTADOS = ("pendiente", "recibida", "en_proceso", "entregada", "rechazada")

# Nombres que suelen romper un CSV o un JSON mal armado.
NOMBRES_RAROS = (
    "José Ñandú Muñoz",
    'Ana "La Flaca" Pérez',
    "Coma, punto; y coma",
    "Línea uno\nLínea dos",
    "=SUMA(1+1)",
)


@pytest.fixture
def exportacion(mysql_case):
    data = mysql_case
    org = data.organization("Organización exportación")
    data.principal(org)
    admin = data.user("Administrador exportación", "administrador")
    inter = data.user("Intermediario exportación", "intermediario", org)
    articulo = data.article()
    campanas = [data.campaign(org, inter, articulo, titulo) for titulo in (
        "Abrigos para la sierra", "Útiles «escolares» 2019", "Víveres, agua y 😀 emoji"
    )]
    donantes = [data.user(nombre, "donante") for nombre in NOMBRES_RAROS]

    # 60 fechas distintas para 250 donaciones: hay empates y el orden depende del desempate por ID.
    filas = []
    for i in range(TOTAL):
        fila = {
            "fecha": (date(2019, 1, 1) + timedelta(days=(i % 60) * 5)).isoformat(),
            "estado": ESTADOS[i % len(ESTADOS)],
            "campana": campanas[i % len(campanas)],
            "donante": NOMBRES_RAROS[i % len(NOMBRES_RAROS)],
            "cantidad": i % 9 + 1,
        }
        fila["id"] = data.insert(
            "INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,telefono_contacto,"
            "hora_preferida,cantidad_donada,fecha_donacion,estado) "
            "VALUES (%s,%s,'Donación de exportación','Contacto','00000000','10:00:00',%s,%s,%s)",
            (donantes[i % len(donantes)], fila["campana"], fila["cantidad"], fila["fecha"], fila["estado"]),
        )
        filas.append(fila)
    data.conn.commit()

    return dict(
        data=data,
        filas=filas,
        campanas=campanas,
        donantes=donantes,
        headers={"Authorization": f"Bearer {generate_token(admin, 'administrador')}"},
    )


def recorrer(client, headers, filtros="", entre_paginas=None):
    """Hace lo mismo que exportarDetalle en AdminReportes: pide páginas hasta agotar total_paginas."""
    paginas = []
    pagina, total_paginas = 1, 1
    while pagina <= total_paginas:
        respuesta = client.get(f"/reportes/detalle?{filtros}&page={pagina}&page_size={PAGINA}", headers=headers)
        assert respuesta.status_code == 200, respuesta.get_json()
        cuerpo = respuesta.get_json()
        paginas.append(cuerpo)
        total_paginas = cuerpo["total_paginas"] or 1
        if pagina == 1 and entre_paginas:
            entre_paginas()
        pagina += 1
    return paginas


def ids(paginas):
    return [item["id_donacion"] for pagina in paginas for item in pagina["items"]]


def esperado(filas, condicion=lambda fila: True):
    seleccion = [fila for fila in filas if condicion(fila)]
    seleccion.sort(key=lambda fila: (fila["fecha"], fila["id"]), reverse=True)
    return [fila["id"] for fila in seleccion]


def test_recorrer_todas_las_paginas_trae_cada_donacion_una_vez_y_en_orden(client, exportacion):
    paginas = recorrer(client, exportacion["headers"])

    assert [len(p["items"]) for p in paginas] == [100, 100, 50]
    assert {p["total"] for p in paginas} == {TOTAL}
    assert ids(paginas) == esperado(exportacion["filas"])


@pytest.mark.parametrize("nombre, filtros, condicion", [
    ("estado", "estado=entregada", lambda f, c: f["estado"] == "entregada"),
    ("campaña", "id_publicacion={c1}", lambda f, c: f["campana"] == c[1]),
    ("rango de fechas", "fecha_inicio=2019-03-01&fecha_fin=2019-06-30",
     lambda f, c: "2019-03-01" <= f["fecha"] <= "2019-06-30"),
    ("todo combinado", "estado=pendiente&id_publicacion={c0}&fecha_inicio=2019-02-01&fecha_fin=2019-10-31",
     lambda f, c: f["estado"] == "pendiente" and f["campana"] == c[0] and "2019-02-01" <= f["fecha"] <= "2019-10-31"),
    ("sin resultados", "fecha_inicio=2030-01-01", lambda f, c: False),
])
def test_los_filtros_se_respetan_en_todas_las_paginas(client, exportacion, nombre, filtros, condicion):
    c = exportacion["campanas"]
    paginas = recorrer(client, exportacion["headers"], filtros.format(c0=c[0], c1=c[1]))
    esperados = esperado(exportacion["filas"], lambda fila: condicion(fila, c))

    assert ids(paginas) == esperados
    # El total de la primera página es el que el frontend usa para saber si el archivo quedó completo.
    assert paginas[0]["total"] == len(esperados)


def test_fecha_sin_ceros_filtra_igual_que_con_ceros(client, exportacion):
    con_ceros = recorrer(client, exportacion["headers"], "fecha_inicio=2019-03-02&fecha_fin=2019-03-02")
    sin_ceros = recorrer(client, exportacion["headers"], "fecha_inicio=2019-3-2&fecha_fin=2019-3-2")

    assert ids(con_ceros) and ids(sin_ceros) == ids(con_ceros)


def test_rango_con_fechas_sin_ceros_entre_meses_de_uno_y_dos_digitos(client, exportacion):
    paginas = recorrer(client, exportacion["headers"], "fecha_inicio=2019-9-1&fecha_fin=2019-10-1")

    assert ids(paginas) == esperado(exportacion["filas"], lambda f: "2019-09-01" <= f["fecha"] <= "2019-10-01")


def test_nombres_y_titulos_con_caracteres_especiales_llegan_intactos(client, exportacion):
    paginas = recorrer(client, exportacion["headers"])
    items = [item for pagina in paginas for item in pagina["items"]]

    assert {item["donante_nombre"] for item in items} == set(NOMBRES_RAROS)
    assert {item["campana_titulo"] for item in items} == {
        "Abrigos para la sierra", "Útiles «escolares» 2019", "Víveres, agua y 😀 emoji"
    }
    por_id = {fila["id"]: fila for fila in exportacion["filas"]}
    for item in items:
        fila = por_id[item["id_donacion"]]
        assert (item["fecha_donacion"], item["estado"], item["cantidad_donada"]) == (fila["fecha"], fila["estado"], fila["cantidad"])


# --- Cambios mientras se exporta -------------------------------------------------
# Con 500 usuarios es poco probable, pero puede pasar que alguien registre o cambie
# una donación entre una página y otra. Lo mínimo es que el frontend lo pueda notar.

def insertar_donacion_reciente(exportacion):
    data = exportacion["data"]
    nuevo = data.insert(
        "INSERT INTO donacion (id_donante,id_publicacion,descripcion,nombre_contacto,telefono_contacto,"
        "hora_preferida,cantidad_donada,fecha_donacion,estado) "
        "VALUES (%s,%s,'Llegó a mitad de la exportación','Contacto','00000000','10:00:00',1,'2019-12-31','pendiente')",
        (exportacion["donantes"][0], exportacion["campanas"][0]),
    )
    data.conn.commit()
    return nuevo


def test_si_entra_una_donacion_a_mitad_el_total_cambia_y_se_puede_detectar(client, exportacion):
    paginas = recorrer(client, exportacion["headers"], entre_paginas=lambda: insertar_donacion_reciente(exportacion))

    assert paginas[0]["total"] == TOTAL
    assert paginas[-1]["total"] == TOTAL + 1


def test_si_se_borra_una_donacion_a_mitad_el_total_cambia_y_se_puede_detectar(client, exportacion):
    data = exportacion["data"]
    ultima = esperado(exportacion["filas"])[-1]

    def borrar():
        data.cursor.execute("DELETE FROM donacion WHERE id_donacion = %s", (ultima,))
        data.conn.commit()

    paginas = recorrer(client, exportacion["headers"], entre_paginas=borrar)

    assert paginas[0]["total"] == TOTAL
    assert paginas[-1]["total"] == TOTAL - 1


def test_si_una_donacion_sale_del_filtro_de_estado_el_total_cambia(client, exportacion):
    data = exportacion["data"]
    pendientes = esperado(exportacion["filas"], lambda f: f["estado"] == "pendiente")

    def recibir():
        data.cursor.execute("UPDATE donacion SET estado = 'recibida' WHERE id_donacion = %s", (pendientes[0],))
        data.conn.commit()

    # 50 pendientes caben en una página; con page_size 20 se fuerza a que haya varias.
    primera = client.get("/reportes/detalle?estado=pendiente&page=1&page_size=20", headers=exportacion["headers"]).get_json()
    recibir()
    segunda = client.get("/reportes/detalle?estado=pendiente&page=2&page_size=20", headers=exportacion["headers"]).get_json()

    assert primera["total"] == len(pendientes)
    assert segunda["total"] == len(pendientes) - 1


@pytest.mark.xfail(strict=True, reason=(
    "Limitación aceptada: la paginación usa LIMIT/OFFSET y una donación nueva entre "
    "páginas corre las filas una posición. El frontend lo detecta (cambia el total o se "
    "repite un ID) y no descarga el archivo. Si se pasa a paginación por cursor, esta prueba pasa."
))
def test_una_donacion_nueva_a_mitad_no_repite_filas_en_el_archivo(client, exportacion):
    paginas = recorrer(client, exportacion["headers"], entre_paginas=lambda: insertar_donacion_reciente(exportacion))
    exportados = ids(paginas)

    assert len(exportados) == len(set(exportados))

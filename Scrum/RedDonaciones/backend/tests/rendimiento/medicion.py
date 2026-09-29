# Datos de volumen y funciones para medir tiempos de respuesta.
import os
import random
import statistics
import time
from datetime import date, timedelta

import db.connection
from auth_utils import generate_token

SECRET = "test-secret-key-with-at-least-32-bytes"
ESCALA = float(os.getenv("RENDIMIENTO_ESCALA", "1"))
VOLUMENES = {
    "bajo": {"campanas": int(50 * ESCALA), "donaciones": int(2_000 * ESCALA)},
    "alto": {"campanas": int(500 * ESCALA), "donaciones": int(20_000 * ESCALA)},
}
ORGANIZACIONES = 5
DONANTES = 200
ESTADOS = ("pendiente", "recibida", "en_proceso", "entregada", "rechazada")
TABLAS = (
    "usuario",
    "organizacion",
    "donante",
    "intermediario",
    "categoria_articulo",
    "articulo",
    "publicacion",
    "publicacion_articulo",
    "donacion",
    "notificacion",
)

RESULTADOS = {}
PLANES = {}


def _poblar(cursor, campanas, donaciones):
    azar = random.Random(42)

    cursor.execute("INSERT INTO categoria_articulo (nombre, descripcion) VALUES ('Ropa', 'Ropa')")
    id_categoria = cursor.lastrowid
    cursor.execute("INSERT INTO articulo (nombre, descripcion, id_categoria) VALUES ('Abrigos', 'Abrigos', %s)", (id_categoria,))
    id_articulo = cursor.lastrowid

    cursor.execute(
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) "
        "VALUES ('Administrador', 'admin@rendimiento.test', 'x', '10000000', 'administrador')"
    )
    id_admin = cursor.lastrowid

    organizaciones = []
    intermediarios = []
    for numero in range(ORGANIZACIONES):
        cursor.execute(
            """
            INSERT INTO organizacion (nombre, descripcion, direccion, departamento, municipio, zona,
                                      telefono, correo, estado_verificacion)
            VALUES (%s, 'Organización de prueba', '1 calle 1-1', 'Guatemala', 'Guatemala', '1', %s, %s, 'verificada')
            """,
            (f"Organización {numero + 1}", f"2000{numero:04d}", f"org{numero}@rendimiento.test"),
        )
        organizaciones.append(cursor.lastrowid)
        cursor.execute(
            "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES (%s, %s, 'x', %s, 'intermediario')",
            (f"Intermediario {numero + 1}", f"inter{numero}@rendimiento.test", f"3000{numero:04d}"),
        )
        intermediarios.append(cursor.lastrowid)
        cursor.execute(
            "INSERT INTO intermediario (id_usuario, id_organizacion, cargo) VALUES (%s, %s, 'Coordinador')",
            (cursor.lastrowid, organizaciones[-1]),
        )

    cursor.executemany(
        "INSERT INTO usuario (nombre, correo, password, telefono, rol) VALUES (%s, %s, 'x', %s, 'donante')",
        [(f"Donante {n + 1}", f"donante{n}@rendimiento.test", f"4000{n:04d}") for n in range(DONANTES)],
    )
    cursor.execute("SELECT id_usuario FROM usuario WHERE rol = 'donante' ORDER BY id_usuario")
    donantes = [fila[0] for fila in cursor.fetchall()]
    cursor.executemany(
        "INSERT INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle) "
        "VALUES (%s, 'Guatemala', 'Guatemala', '1', 'Dirección de prueba')",
        [(id_donante,) for id_donante in donantes],
    )

    filas_campanas = []
    for numero in range(campanas):
        indice = numero % ORGANIZACIONES
        filas_campanas.append((
            intermediarios[indice], organizaciones[indice], id_articulo,
            f"Campaña {numero + 1}", "Recolección de prueba", 1_000_000, 0,
        ))
    cursor.executemany(
        """
        INSERT INTO publicacion (id_intermediario, id_organizacion, id_articulo, titulo, descripcion,
                                 cantidad_necesaria, cantidad_recibida, fecha_publicacion, fecha_limite, estado)
        VALUES (%s, %s, %s, %s, %s, %s, %s, '2025-01-01', '2099-12-31', 'activa')
        """,
        filas_campanas,
    )
    cursor.execute("SELECT id_publicacion, id_organizacion FROM publicacion ORDER BY id_publicacion")
    lista_campanas = cursor.fetchall()

    inicio = date(2025, 1, 1)
    filas_donaciones = []
    for _ in range(donaciones):
        id_publicacion, _ = azar.choice(lista_campanas)
        filas_donaciones.append((
            azar.choice(donantes), id_publicacion, "Donación de prueba", "Contacto", "55550000", "10:00:00",
            azar.randint(1, 20), inicio + timedelta(days=azar.randint(0, 364)), azar.choice(ESTADOS),
        ))
    for desde in range(0, len(filas_donaciones), 5_000):
        cursor.executemany(
            """
            INSERT INTO donacion (id_donante, id_publicacion, descripcion, nombre_contacto, telefono_contacto,
                                  hora_preferida, cantidad_donada, fecha_donacion, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            filas_donaciones[desde:desde + 5_000],
        )
    cursor.execute(
        "UPDATE publicacion p SET cantidad_recibida = "
        "(SELECT COALESCE(SUM(d.cantidad_donada), 0) FROM donacion d WHERE d.id_publicacion = p.id_publicacion)"
    )

    return {
        "admin": id_admin,
        "intermediario": intermediarios[0],
        "organizacion": organizaciones[0],
        "donante": donantes[0],
        "campana": lista_campanas[0][0],
        "campanas": campanas,
        "donaciones": filas_donaciones,
        "organizacion_de_campana": dict(lista_campanas),
    }


def encabezados(id_usuario, rol):
    return {"Authorization": f"Bearer {generate_token(id_usuario, rol)}"}


def medir(cliente, volumen, consulta, url, headers=None, repeticiones=5):
    cliente.get(url, headers=headers)
    tiempos = []
    for _ in range(repeticiones):
        inicio = time.perf_counter()
        response = cliente.get(url, headers=headers)
        tiempos.append((time.perf_counter() - inicio) * 1000)
        assert response.status_code == 200, response.get_json()

    resultado = {
        "mediana_ms": statistics.median(tiempos),
        "maximo_ms": max(tiempos),
        "kb": len(response.data) / 1024,
    }
    RESULTADOS.setdefault(consulta, {})[volumen["nombre"]] = resultado
    return response.get_json(), resultado


def explicar(volumen, consulta, sql, params=()):
    conn = db.connection.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"EXPLAIN {sql}", params)
    plan = cursor.fetchall()
    cursor.close()
    conn.close()
    PLANES.setdefault(consulta, {})[volumen["nombre"]] = plan
    return plan

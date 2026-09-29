# Base de datos en memoria para probar ubicaciones sin depender de MySQL.
import re
from decimal import Decimal

import pytest

from auth_utils import generate_token


SECRET = "test-secret-key-with-at-least-32-bytes"


def a_decimal(valor):
    # Igual que la columna DECIMAL(10,7) de MySQL.
    if valor is None:
        return None
    return Decimal(str(valor)).quantize(Decimal("0.0000001"))


class CursorFalso:
    def __init__(self, bd, dictionary):
        self.bd = bd
        self.dictionary = dictionary
        self.filas = []
        self.lastrowid = None

    def execute(self, sql, params=None):
        self.filas = self.bd.ejecutar(" ".join(sql.split()), tuple(params or ()), self)

    def _formato(self, fila):
        return fila if self.dictionary else tuple(fila.values())

    def fetchone(self):
        if not self.filas:
            return None
        return self._formato(self.filas.pop(0))

    def fetchall(self):
        filas, self.filas = self.filas, []
        return [self._formato(fila) for fila in filas]

    def close(self):
        pass


class ConexionFalsa:
    def __init__(self, bd):
        self.bd = bd

    def cursor(self, dictionary=False):
        return CursorFalso(self.bd, dictionary)

    def commit(self):
        self.bd.commits += 1

    def rollback(self):
        pass

    def close(self):
        pass


class BaseDatosFalsa:
    def __init__(self):
        self.organizaciones = {}
        self.publicaciones = {}
        self.intermediarios = {}
        self.articulos = {1: "Alimentos"}
        self.escrituras = []
        self.commits = 0

    def conectar(self):
        return ConexionFalsa(self)

    def agregar_organizacion(self, id_organizacion, **datos):
        fila = {
            "id_organizacion": id_organizacion,
            "nombre": f"Organización {id_organizacion}",
            "descripcion": "Organización de prueba",
            "direccion": "18 avenida 11-95",
            "departamento": "Guatemala",
            "municipio": "Guatemala",
            "zona": "15",
            "latitud": None,
            "longitud": None,
            "telefono": "",
            "correo": "",
            "estado_verificacion": "verificada",
        }
        fila.update(datos)
        fila["latitud"] = a_decimal(fila["latitud"])
        fila["longitud"] = a_decimal(fila["longitud"])
        self.organizaciones[id_organizacion] = fila
        return fila

    def agregar_publicacion(self, id_publicacion, id_organizacion, **datos):
        fila = {
            "id_publicacion": id_publicacion,
            "id_organizacion": id_organizacion,
            "id_intermediario": 20,
            "id_articulo": 1,
            "titulo": "Campaña de prueba",
            "descripcion": "Recolección de alimentos",
            "cantidad_necesaria": 10,
            "cantidad_recibida": 0,
            "fecha_publicacion": "2026-01-01",
            "fecha_limite": "2026-12-31",
            "estado": "activa",
            "imagen_url": None,
            "departamento": None,
            "municipio": None,
            "zona": None,
            "direccion_detalle": None,
            "latitud": None,
            "longitud": None,
        }
        fila.update(datos)
        fila["latitud"] = a_decimal(fila["latitud"])
        fila["longitud"] = a_decimal(fila["longitud"])
        self.publicaciones[id_publicacion] = fila
        return fila

    def escrituras_en(self, tabla):
        return [datos for accion, nombre, datos in self.escrituras if nombre == tabla]

    def ejecutar(self, sql, params, cursor):
        if "information_schema" in sql:
            return [{"nullable": "YES"}] if "IS_NULLABLE" in sql else [{"total": 1}]
        if sql.startswith("CREATE TABLE"):
            return []
        if sql.startswith("INSERT INTO"):
            return self._insertar(sql, params, cursor)
        if sql.startswith("UPDATE"):
            return self._actualizar(sql, params)
        if "FROM publicacion_articulo" in sql:
            return []
        if "FROM publicacion p" in sql:
            return self._consultar_campanas(sql, params)
        if "FROM publicacion" in sql:
            return self._buscar_publicacion(sql, params)
        if "FROM intermediario" in sql:
            id_usuario, id_organizacion = params
            existe = self.intermediarios.get(id_usuario) == id_organizacion
            return [{"id_usuario": id_usuario}] if existe else []
        if "FROM articulo" in sql:
            return self._buscar_articulo(sql, params)
        if "FROM organizacion" in sql:
            return self._buscar_organizacion(sql, params)
        raise AssertionError(f"Consulta no contemplada en la prueba: {sql[:80]}")

    def _tabla(self, nombre):
        return self.organizaciones if nombre == "organizacion" else self.publicaciones

    def _insertar(self, sql, params, cursor):
        nombre, columnas, valores = re.match(
            r"INSERT INTO (\w+) \((.*?)\) VALUES \((.*)\)", sql
        ).groups()
        pendientes = list(params)
        fila = {}
        for columna, valor in zip(columnas.split(","), valores.split(",")):
            valor = valor.strip()
            fila[columna.strip()] = pendientes.pop(0) if valor == "%s" else int(valor)

        tabla = self._tabla(nombre)
        llave = "id_organizacion" if nombre == "organizacion" else "id_publicacion"
        nuevo_id = max(tabla, default=0) + 1
        if nombre == "publicacion":
            datos = dict(fila)
            self.agregar_publicacion(nuevo_id, datos.pop("id_organizacion"), **datos)
        else:
            self.agregar_organizacion(nuevo_id, **fila)
        cursor.lastrowid = nuevo_id
        self.escrituras.append(("INSERT", nombre, {**fila, llave: nuevo_id}))
        return []

    def _actualizar(self, sql, params):
        nombre, asignaciones = re.match(r"UPDATE (\w+) SET (.*) WHERE", sql).groups()
        columnas = re.findall(r"(\w+) = %s", asignaciones)
        cambios = dict(zip(columnas, params[:-1]))
        fila = self._tabla(nombre).get(params[-1])
        if fila is not None:
            fila.update(cambios)
            fila["latitud"] = a_decimal(fila.get("latitud"))
            fila["longitud"] = a_decimal(fila.get("longitud"))
        self.escrituras.append(("UPDATE", nombre, {**cambios, "id": params[-1]}))
        return []

    def _buscar_organizacion(self, sql, params):
        fila = self.organizaciones.get(params[0])
        if fila is None:
            return []
        if "estado_verificacion = 'verificada'" in sql and fila["estado_verificacion"] != "verificada":
            return []
        return [dict(fila)]

    def _buscar_articulo(self, sql, params):
        nombre = self.articulos.get(params[0])
        if nombre is None:
            return []
        if "a.id_articulo" in sql:
            return [{"articulo": nombre, "categoria": None, "descripcion_detalle": None}]
        return [{"id_articulo": params[0]}]

    def _buscar_publicacion(self, sql, params):
        if "WHERE id_publicacion" in sql:
            fila = self.publicaciones.get(params[0])
            if fila is None or (len(params) > 1 and fila["id_organizacion"] != params[1]):
                return []
            return [{"id_publicacion": fila["id_publicacion"], "id_organizacion": fila["id_organizacion"]}]
        return [dict(p) for p in self.publicaciones.values() if p["id_organizacion"] == params[0]]

    def _consultar_campanas(self, sql, params):
        campanas = list(self.publicaciones.values())
        if "WHERE p.id_publicacion = %s" in sql:
            campanas = [p for p in campanas if p["id_publicacion"] == params[0]]
        elif "WHERE p.id_organizacion = %s" in sql:
            campanas = [p for p in campanas if p["id_organizacion"] == params[0]]
        return [self._fila_campana(p, resolver="COALESCE(p.latitud" in sql) for p in campanas]

    def _fila_campana(self, p, resolver):
        o = self.organizaciones[p["id_organizacion"]]

        def valor(propio, heredado):
            if not resolver or p[propio] is not None:
                return p[propio]
            return o[heredado]

        return {
            "id_publicacion": p["id_publicacion"],
            "id_articulo": p["id_articulo"],
            "titulo": p["titulo"],
            "descripcion": p["descripcion"],
            "cantidad_necesaria": p["cantidad_necesaria"],
            "cantidad_recibida": p["cantidad_recibida"],
            "estado": p["estado"],
            "imagen_url": p["imagen_url"],
            "fecha_publicacion": p["fecha_publicacion"],
            "fecha_limite": p["fecha_limite"],
            "departamento": valor("departamento", "departamento"),
            "municipio": valor("municipio", "municipio"),
            "zona": valor("zona", "zona"),
            "direccion_detalle": valor("direccion_detalle", "direccion"),
            "latitud": valor("latitud", "latitud"),
            "longitud": valor("longitud", "longitud"),
            "ubicacion_heredada": int(p["departamento"] is None),
            "organizacion": o["nombre"],
            "direccion": o["direccion"],
            "categoria": None,
            "resultado_resumen": None,
            "resultado_personas_beneficiadas": None,
            "resultado_imagen_url": None,
            "resultado_fecha_publicacion": None,
        }


@pytest.fixture
def bd(monkeypatch):
    base = BaseDatosFalsa()
    for modulo in ("db.connection", "routes.organizacion", "routes.publicacion", "routes.intermediario"):
        monkeypatch.setattr(f"{modulo}.get_db_connection", base.conectar)
    return base


@pytest.fixture
def sesion(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)

    def iniciar(rol, id_usuario=10, id_organizacion=None, organizacion_verificada=True):
        usuario = {"id_usuario": id_usuario, "rol": rol, "activo": 1}
        monkeypatch.setattr("auth_utils._obtener_usuario_actual", lambda _: usuario)
        monkeypatch.setattr("auth_utils._obtener_organizacion_actual_intermediario", lambda _: id_organizacion)
        monkeypatch.setattr("auth_utils._organizacion_verificada", lambda _: organizacion_verificada)
        token = generate_token(id_usuario, rol, id_organizacion)
        return {"Authorization": f"Bearer {token}"}

    return iniciar

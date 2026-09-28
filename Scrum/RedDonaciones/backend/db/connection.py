import logging
import os
from contextlib import contextmanager

import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        charset="utf8mb4",
    )


@contextmanager
def db_cursor(dictionary=True, connection_factory=None):
    """Administra conexión y cursor; la transacción queda a cargo del consumidor."""
    factory = (
        connection_factory
        if connection_factory is not None
        else get_db_connection
    )

    conn = factory()
    cursor = None
    error_original = False

    try:
        cursor = conn.cursor(dictionary=dictionary)
        yield conn, cursor
    except BaseException:
        error_original = True
        raise
    finally:
        error_cierre = None

        for recurso, nombre in (
            (cursor, "cursor"),
            (conn, "conexión"),
        ):
            if recurso is None:
                continue

            try:
                recurso.close()
            except Exception as exc:
                logging.exception("Error al cerrar %s", nombre)
                if error_cierre is None:
                    error_cierre = exc

        # Conserva el error de la operación si también falla la limpieza.
        if error_cierre is not None and not error_original:
            raise error_cierre

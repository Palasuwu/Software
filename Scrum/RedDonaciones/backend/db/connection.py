import os
from contextlib import contextmanager
import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        charset='utf8mb4'
    )


@contextmanager
def db_cursor(dictionary=True, connection_factory=None):
    """Context manager que maneja la apertura y cierre automatico de conexion y cursor."""
    factory = connection_factory if connection_factory is not None else get_db_connection
    conn = factory()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield conn, cursor
    finally:
        cursor.close()
        conn.close()

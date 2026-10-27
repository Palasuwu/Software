"""Configuración cerrada de pruebas; nunca consulta DB_* de desarrollo."""
import os
import re


class TestDatabaseError(RuntimeError):
    __test__ = False


def test_database_config():
    required = (
        "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD",
        "TEST_DB_NAME", "TEST_MYSQL_SERVER_UUID", "TEST_MYSQL_TOKEN",
    )
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise TestDatabaseError(
            "Configuración MySQL de pruebas incompleta: " + ", ".join(missing)
            + ". Ejecutar python3 scripts/test_mysql.py desde la raíz."
        )
    try:
        port = int(os.environ["TEST_DB_PORT"])
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise TestDatabaseError("TEST_DB_PORT debe ser un puerto válido") from None
    if not re.fullmatch(r"[A-Za-z0-9_]+", os.environ["TEST_DB_NAME"]):
        raise TestDatabaseError("TEST_DB_NAME contiene caracteres no permitidos")
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", os.environ["TEST_MYSQL_SERVER_UUID"]):
        raise TestDatabaseError("Falta una identidad válida del servidor temporal")
    if not re.fullmatch(r"[0-9a-f]{64}", os.environ["TEST_MYSQL_TOKEN"]):
        raise TestDatabaseError("Falta la marca aleatoria de la ejecución temporal")
    return dict(
        host=os.environ["TEST_DB_HOST"], port=port,
        user=os.environ["TEST_DB_USER"], password=os.environ["TEST_DB_PASSWORD"],
        database=os.environ["TEST_DB_NAME"], charset="utf8mb4",
        connection_timeout=5,
    )


test_database_config.__test__ = False

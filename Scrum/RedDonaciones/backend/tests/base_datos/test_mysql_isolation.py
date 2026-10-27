"""La preparación que falla no deja bases ni configuración de otra prueba."""
import os

import pytest

from db.connection import db_cursor
from tests.mysql_support import temporary_database


pytestmark = pytest.mark.mysql


@pytest.mark.parametrize("committed", [False, True])
def test_cleanup_even_when_dataset_setup_fails(monkeypatch, committed):
    previous = os.environ.get("ID_ORGANIZACION_PRINCIPAL")
    template = os.environ["TEST_DB_NAME"]
    with pytest.raises(RuntimeError, match="fallo controlado"):
        with monkeypatch.context() as settings:
            with temporary_database(settings, "setup_failure") as name:
                settings.setenv("ID_ORGANIZACION_PRINCIPAL", "987654")
                with db_cursor() as (conn, cursor):
                    if committed:
                        cursor.execute("INSERT INTO categoria_articulo (nombre,descripcion) "
                                       "VALUES ('Preparación','Dato confirmado antes del fallo')")
                        conn.commit()
                    raise RuntimeError("fallo controlado antes del yield de datos")
    assert os.environ["TEST_DB_NAME"] == template
    assert os.environ.get("ID_ORGANIZACION_PRINCIPAL") == previous
    with db_cursor() as (_, cursor):
        cursor.execute("SELECT COUNT(*) AS total FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=%s", (name,))
        assert cursor.fetchone()["total"] == 0

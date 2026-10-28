"""Verificar la identidad usando el servidor real, antes de devolver la conexión."""
import pytest

from db.connection import get_db_connection
from db.test_config import TestDatabaseError


pytestmark = pytest.mark.integracion


@pytest.mark.parametrize("field,value", [
    ("TEST_MYSQL_SERVER_UUID", "00000000-0000-0000-0000-000000000000"),
    ("TEST_MYSQL_TOKEN", "0" * 64),
])
def test_rechaza_servidor_sin_identidad_de_la_ejecucion(base_aislada, monkeypatch, field, value):
    monkeypatch.setenv(field, value)
    with pytest.raises(TestDatabaseError, match="no pertenece"):
        get_db_connection()

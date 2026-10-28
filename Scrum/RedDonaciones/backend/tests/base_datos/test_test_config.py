"""Las guardias deben fallar antes de abrir una conexión o devolverla a la app."""
import os

import pytest

from db.connection import get_db_connection
from db.test_config import TestDatabaseError


REQUIRED = (
    "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD", "TEST_DB_NAME",
    "TEST_MYSQL_SERVER_UUID", "TEST_MYSQL_TOKEN",
)


def configure(monkeypatch):
    values = ("mysql", "3306", "root", "temporary", "template",
              "12345678-1234-1234-1234-123456789012", "a" * 64)
    monkeypatch.setenv("TEST_DB_MODE", "mysql")
    for key, value in zip(REQUIRED, values):
        monkeypatch.setenv(key, value)


def forbid_connect(*args, **kwargs):
    pytest.fail("La configuración insegura llegó a abrir una conexión")


def test_unit_mode_blocks_real_connection(monkeypatch):
    monkeypatch.setenv("TEST_DB_MODE", "unit")
    monkeypatch.setenv("DB_HOST", "development.invalid")
    monkeypatch.setattr("mysql.connector.connect", forbid_connect)
    with pytest.raises(TestDatabaseError, match="bloqueado"):
        get_db_connection()


@pytest.mark.parametrize("missing", REQUIRED)
def test_incomplete_configuration_never_connects(monkeypatch, missing):
    configure(monkeypatch)
    monkeypatch.delenv(missing)
    monkeypatch.setenv("DB_HOST", "development.invalid")
    monkeypatch.setenv("DB_PASSWORD", "must-not-be-used")
    monkeypatch.setattr("mysql.connector.connect", forbid_connect)
    with pytest.raises(TestDatabaseError, match=missing):
        get_db_connection()


@pytest.mark.parametrize("field,value", [
    ("TEST_DB_PORT", "invalid"), ("TEST_DB_NAME", "db`; DROP DATABASE x"),
    ("TEST_MYSQL_SERVER_UUID", "invalid"), ("TEST_MYSQL_TOKEN", "invalid"),
])
def test_invalid_configuration_never_connects(monkeypatch, field, value):
    configure(monkeypatch)
    monkeypatch.setenv(field, value)
    monkeypatch.setattr("mysql.connector.connect", forbid_connect)
    with pytest.raises(TestDatabaseError):
        get_db_connection()


@pytest.mark.parametrize("wrong_uuid,wrong_token", [(True, False), (False, True)])
def test_foreign_server_is_closed_before_use(monkeypatch, wrong_uuid, wrong_token):
    configure(monkeypatch)

    class ForeignConnection:
        closed = False

        def cursor(self):
            return self

        def execute(self, query):
            assert query.startswith("SELECT @@server_uuid")

        def fetchone(self):
            return (
                "other-server" if wrong_uuid else os.environ["TEST_MYSQL_SERVER_UUID"],
                "other-token" if wrong_token else os.environ["TEST_MYSQL_TOKEN"],
            )

        def close(self):
            self.closed = True

    conn = ForeignConnection()
    monkeypatch.setattr("mysql.connector.connect", lambda **kwargs: conn)
    with pytest.raises(TestDatabaseError, match="no pertenece"):
        get_db_connection()
    assert conn.closed


def test_normal_application_keeps_development_configuration(monkeypatch):
    monkeypatch.delenv("TEST_DB_MODE", raising=False)
    for key, value in {"DB_HOST": "normal-host", "DB_USER": "normal-user",
                       "DB_PASSWORD": "normal-password", "DB_NAME": "normal-db"}.items():
        monkeypatch.setenv(key, value)
    received = {}
    sentinel = object()

    def connect(**kwargs):
        received.update(kwargs)
        return sentinel

    monkeypatch.setattr("mysql.connector.connect", connect)
    assert get_db_connection() is sentinel
    assert received == dict(host="normal-host", user="normal-user", password="normal-password",
                            database="normal-db", charset="utf8mb4")

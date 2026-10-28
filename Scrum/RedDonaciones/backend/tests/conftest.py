import os
from datetime import datetime, timezone
from pathlib import Path
import re
import pytest


def pytest_addoption(parser):
    parser.addoption("--mysql", action="store_true", help="Habilitar MySQL temporal explícito")


def pytest_configure(config):
    # Se ejecuta antes de recolectar/importar tests y aplicación.
    mysql = config.getoption("--mysql")
    expression = config.getoption("markexpr") or ""
    positive = re.sub(r"\bnot\s+(mysql|integracion|regresion)\b", "", expression)
    if not mysql and re.search(r"\b(mysql|integracion|regresion)\b", positive):
        raise pytest.UsageError("Las pruebas MySQL requieren el runner y --mysql")
    os.environ["TEST_DB_MODE"] = "mysql" if mysql else "unit"
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
    if mysql:
        from db.test_config import TestDatabaseError, test_database_config
        try:
            test_database_config()
        except TestDatabaseError as exc:
            raise pytest.UsageError(str(exc)) from None


@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(config, items):
    mysql_fixtures = {"base_aislada", "mysql_case", "datos_reportes", "dataset_reportes", "dataset_conocido", "volumen"}
    selected, deselected = [], []
    explicit = [Path(arg.split("::")[0]).resolve() for arg in config.args if not arg.startswith("-")]
    for item in items:
        path = str(item.path).replace("\\", "/")
        real = bool(mysql_fixtures.intersection(item.fixturenames)) or bool(item.get_closest_marker("mysql"))
        if real:
            item.add_marker(pytest.mark.mysql)
        if real and not config.getoption("--mysql"):
            if any(p == Path(item.path).resolve() or (
                p != Path(__file__).parent.resolve() and p in Path(item.path).resolve().parents
            ) for p in explicit):
                raise pytest.UsageError("Prueba MySQL solicitada sin --mysql; usar scripts/test_mysql.py")
            deselected.append(item)
        else:
            selected.append(item)
    items[:] = selected
    if deselected:
        config.hook.pytest_deselected(items=deselected)


@pytest.fixture
def reloj_jwt(monkeypatch):
    """Optativo: ambos relojes JWT permanecen coherentes durante cada caso."""
    from tests.jwt_clock import controlar_reloj_jwt

    with controlar_reloj_jwt(
        monkeypatch, datetime(2026, 10, 27, 12, 0, 1, 100000, tzinfo=timezone.utc)
    ) as reloj:
        yield reloj


@pytest.fixture
def mysql_case(monkeypatch):
    from db.connection import db_cursor
    from tests.mysql_support import temporary_database
    from tests.mysql_data import MySQLData

    with monkeypatch.context() as settings:
        settings.setenv("JWT_SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
        with temporary_database(settings, "case"):
            with db_cursor() as (conn, cursor):
                yield MySQLData(conn, cursor, settings)


@pytest.fixture
def client():
    from app import app
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client

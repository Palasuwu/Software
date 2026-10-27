import os
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
    mysql_fixtures = {"base_aislada", "datos_reportes", "dataset_reportes", "dataset_conocido", "volumen"}
    selected, deselected = [], []
    explicit = [Path(arg.split("::")[0]).resolve() for arg in config.args if not arg.startswith("-")]
    for item in items:
        path = str(item.path).replace("\\", "/")
        seed = path.endswith(("/test_registro_intermediario_mysql.py", "/test_ubicacion_tipos.py")) or (
            path.endswith(("/test_reporte_service.py", "/test_reporte_endpoints.py"))
            and bool(mysql_fixtures.intersection(item.fixturenames))
        )
        real = seed or bool(mysql_fixtures.intersection(item.fixturenames)) or bool(item.get_closest_marker("mysql"))
        if real:
            item.add_marker(pytest.mark.mysql)
        if seed:
            item.add_marker(pytest.mark.mysql_seed)
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


def pytest_collection_finish(session):
    if session.config.getoption("--mysql") and any(
        item.get_closest_marker("mysql_seed") for item in session.items
    ):
        raise pytest.UsageError(
            "Selección dependiente del seed (mysql_seed), pendiente de la parte 2. "
            "Seleccionar tests/automatizadas y tests/concurrencia."
        )


@pytest.fixture
def client():
    from app import app
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client

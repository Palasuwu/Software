# Este archivo contiene configuraciones y fixtures para las pruebas unitarias con pytest


import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client
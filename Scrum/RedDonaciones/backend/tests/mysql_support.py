"""Bases por prueba, siempre dentro del servidor identificado por el runner."""
from contextlib import contextmanager
from pathlib import Path
import os
import re
import uuid

from db.connection import db_cursor


@contextmanager
def temporary_database(monkeypatch, prefix):
    template = os.environ["TEST_DB_NAME"]
    name = f"test_{prefix}_{uuid.uuid4().hex}"
    schema = Path(os.environ.get(
        "TEST_SCHEMA_FILE", str(Path(__file__).resolve().parents[2] / "db" / "init.sql")
    )).read_text(encoding="utf-8")
    # Orden canónico del único DDL: no deshabilitar FK para clonar las tablas.
    tables = re.findall(r"CREATE TABLE IF NOT EXISTS\s+(\w+)", schema, re.I)
    if len(tables) != 13:
        raise RuntimeError("El esquema de pruebas no contiene las 13 tablas esperadas")
    with db_cursor(dictionary=False) as (_, cursor):
        created = False
        try:
            cursor.execute(f"CREATE DATABASE `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            created = True
            cursor.execute(f"USE `{name}`")
            for table in tables:
                cursor.execute(f"SHOW CREATE TABLE `{template}`.`{table}`")
                definition = cursor.fetchone()[1]
                cursor.execute(definition)
            with monkeypatch.context() as scoped:
                scoped.setenv("TEST_DB_NAME", name)
                yield name
        finally:
            if created:
                cursor.execute(f"DROP DATABASE `{name}`")

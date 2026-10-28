"""Preparación común local/CI: único DDL, plantilla vacía e identidad de ejecución."""
from pathlib import Path
import re


def inventory(sql, schema, database, expected=None):
    expected = expected or {}
    tables = sql("SELECT TABLE_NAME FROM information_schema.TABLES "
                 f"WHERE TABLE_SCHEMA='{database}' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;").stdout.decode().splitlines()
    canonical = sorted(re.findall(r"CREATE TABLE IF NOT EXISTS\s+(\w+)", Path(schema).read_text(), re.I))
    if tables != canonical or len(tables) != 13:
        raise RuntimeError("El conjunto de tablas difiere del DDL canónico")
    for table in tables:
        result = sql(f"SELECT '{table}', COUNT(*) FROM `{table}`;", database)
        if result.stdout.decode().strip() != f"{table}\t{expected.get(table, 0)}":
            raise RuntimeError(f"Cantidad de filas inesperada en {table}")


def prepare(sql, schema, database, token):
    if not re.fullmatch(r"[A-Za-z0-9_]+", database):
        raise RuntimeError("Nombre de base de pruebas no válido")
    print("Importación del DDL sin seed, con --show-warnings", flush=True)
    sql(Path(schema).read_text(), database)
    inventory(sql, schema, database)
    identity = sql("SELECT @@server_uuid;").stdout.decode().strip()
    sql("CREATE DATABASE test_isolation; CREATE TABLE test_isolation.run_guard "
        "(id INT PRIMARY KEY, token CHAR(64) NOT NULL); "
        f"INSERT INTO test_isolation.run_guard VALUES (1, '{token}');")
    return identity

#!/usr/bin/env python3
"""Preparar únicamente el contenedor de servicio explícito de GitHub Actions."""
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys

sys.dont_write_bytecode = True
from mysql_test_support import prepare


def main():
    required = ("TEST_MYSQL_CONTAINER", "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER",
                "TEST_DB_PASSWORD", "TEST_DB_NAME", "GITHUB_ENV")
    if os.getenv("GITHUB_ACTIONS") != "true" or os.getenv("CI") != "true":
        raise RuntimeError("Solo se permite el servicio efímero explícito de GitHub Actions; usar el runner local")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Configuración CI incompleta: " + ", ".join(missing))
    container = os.environ["TEST_MYSQL_CONTAINER"]
    if not re.fullmatch(r"[0-9a-f]{64}", container):
        raise RuntimeError("Se requiere el ID completo del servicio efímero de CI")
    inspected = subprocess.run(["docker", "inspect", container], capture_output=True, check=True)
    info = json.loads(inspected.stdout)[0]
    if not info["State"]["Running"]:
        raise RuntimeError("El servicio MySQL de CI no está en ejecución")

    def sql(statement, database=None):
        command = ["docker", "exec", "-i", "-e", "MYSQL_PWD=" + os.environ["TEST_DB_PASSWORD"],
                   container, "mysql", "-u" + os.environ["TEST_DB_USER"], "--default-character-set=utf8mb4",
                   "--batch", "--raw", "--skip-column-names", "--show-warnings"]
        if database:
            command += ["--database=" + database]
        result = subprocess.run(command, input=statement.encode(), capture_output=True, timeout=120)
        if result.stdout:
            print(result.stdout.decode().rstrip())
        if result.stderr:
            print(result.stderr.decode().rstrip(), file=sys.stderr)
        if result.returncode:
            raise RuntimeError(f"Preparación SQL de CI falló, código {result.returncode}")
        return result

    schema = Path(__file__).resolve().parents[1] / "db/init.sql"
    token = secrets.token_hex(32)
    identity = prepare(sql, schema, os.environ["TEST_DB_NAME"], token)
    # No registrar el token en stdout ni incluirlo en artefactos.
    with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as target:
        for key, value in dict(TEST_MYSQL_SERVER_UUID=identity, TEST_MYSQL_TOKEN=token,
                               TEST_SCHEMA_FILE=str(schema)).items():
            target.write(f"{key}={value}\n")
    print("Servicio MySQL de CI preparado sin seed; UUID:", identity)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Las excepciones de subprocess pueden contener argumentos sensibles.
        print("ERROR: " + (str(exc) if isinstance(exc, RuntimeError) else "No se pudo preparar el servicio CI"), file=sys.stderr)
        sys.exit(1)

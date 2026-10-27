#!/usr/bin/env python3
"""Runner Docker local: no lee .env ni hereda la conexión de desarrollo."""
import argparse
import json
from pathlib import Path
import re
import secrets
import signal
import subprocess
import sys
import time
import uuid


ROOT = Path(__file__).resolve().parents[1]
LABEL = "reddonaciones.test-run"
DEFAULT_TESTS = ["tests/automatizadas", "tests/concurrencia"]


def docker(*args, data=None, check=True, timeout=120):
    result = subprocess.run(
        ["docker", *args], input=data, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, timeout=timeout,
    )
    if check and result.returncode:
        # No imprimir argumentos: pueden contener credenciales temporales.
        raise RuntimeError(result.stderr.decode(errors="replace").strip() or "Docker falló")
    return result


def local_image(explicit, container, fallback):
    if explicit:
        return docker("image", "inspect", explicit, "--format", "{{.Id}}").stdout.decode().strip()
    result = docker("inspect", container, "--format", "{{.Image}}", check=False)
    if result.returncode == 0:
        return result.stdout.decode().strip()
    return docker("image", "inspect", fallback, "--format", "{{.Id}}").stdout.decode().strip()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--unit", action="store_true", help="Unitarias sin MySQL ni red")
    mode.add_argument("--check-development", action="store_true", help="Validar esquema + demo desechables")
    parser.add_argument("--mysql-image", help="Imagen local MySQL 8; por defecto la de mysql_db")
    parser.add_argument("--backend-image", help="Imagen local con requirements.txt instalado")
    parser.add_argument("--timeout", type=int, default=120, help="Espera máxima de MySQL en segundos")
    parser.add_argument("pytest_args", nargs=argparse.REMAINDER, help="Argumentos de pytest después de --")
    args = parser.parse_args(argv)
    pytest_args = args.pytest_args
    if pytest_args[:1] == ["--"]:
        pytest_args = pytest_args[1:]
    if args.timeout <= 0:
        parser.error("--timeout debe ser positivo")
    run_id = uuid.uuid4().hex
    network, server, tester = (f"rdtest-{run_id}-{suffix}" for suffix in ("net", "mysql", "pytest"))
    password, token = secrets.token_hex(24), secrets.token_hex(32)
    print(f"Ejecución {run_id}; recursos exclusivos: {network}, {server}, {tester}", flush=True)
    containers = []
    network_created = False

    def sql(statement, database=None, check=True):
        command = ["exec", "-i", "-e", "MYSQL_PWD=" + password, server,
                   "mysql", "-uroot", "--default-character-set=utf8mb4", "--batch",
                   "--raw", "--skip-column-names", "--show-warnings"]
        if database:
            command.append("--database=" + database)
        result = docker(*command, data=statement.encode(), check=False)
        if result.stdout:
            print(result.stdout.decode(errors="replace").rstrip(), flush=True)
        if result.stderr:
            print(result.stderr.decode(errors="replace").rstrip(), file=sys.stderr, flush=True)
        if check and result.returncode:
            raise RuntimeError(f"SQL falló con código {result.returncode}")
        return result

    def inventory(database, expected):
        result = sql("SELECT TABLE_NAME FROM information_schema.TABLES "
                     f"WHERE TABLE_SCHEMA='{database}' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;")
        tables = result.stdout.decode().splitlines()
        canonical = sorted(re.findall(r"CREATE TABLE IF NOT EXISTS\s+(\w+)",
                                     (ROOT / "db/init.sql").read_text(), re.I))
        if tables != canonical or len(tables) != 13:
            raise RuntimeError("El conjunto de tablas difiere del DDL canónico")
        for table in tables:
            result = sql(f"SELECT '{table}', COUNT(*) FROM `{table}`;", database)
            if result.stdout.decode().strip() != f"{table}\t{expected.get(table, 0)}":
                raise RuntimeError(f"Cantidad de filas inesperada en {table}")

    def interrupt(signum, frame):
        raise KeyboardInterrupt

    previous_signals = {s: signal.signal(s, interrupt) for s in (signal.SIGTERM, signal.SIGINT)}
    code = 1
    try:
        backend_image = None
        if not args.check_development:
            backend_image = local_image(args.backend_image, "reddonaciones-backend-1", "reddonaciones-backend")
        environment = {
            "PYTHONDONTWRITEBYTECODE": "1", "JWT_SECRET_KEY": "test-secret-key-with-at-least-32-bytes",
            "ID_ORGANIZACION_PRINCIPAL": "1", "TEST_SCHEMA_FILE": "/schema.sql",
            # Valores hostiles deliberados: una regresión no puede usar desarrollo.
            "DB_HOST": "development-is-forbidden.invalid", "DB_NAME": "forbidden",
            "DB_USER": "forbidden", "DB_PASSWORD": "forbidden",
        }
        if not args.unit:
            image = local_image(args.mysql_image, "mysql_db", "mysql:8")
            print("Imagen MySQL local exacta:", image, flush=True)
            network_created = True
            docker("network", "create", "--internal", "--label", f"{LABEL}={run_id}", network)
            command = ["run", "-d", "--name", server, "--label", f"{LABEL}={run_id}",
                       "--network", network, "--network-alias", "mysql", "--tmpfs", "/var/lib/mysql:rw",
                       "-e", "MYSQL_ROOT_PASSWORD=" + password, "-e", "MYSQL_ROOT_HOST=%",
                       "-e", "MYSQL_DATABASE=donaciones", "-e", "MYSQL_INITDB_SKIP_TZINFO=1"]
            if args.check_development:
                command += ["--mount", f"type=bind,src={ROOT / 'db/init.sql'},dst=/docker-entrypoint-initdb.d/10-schema.sql,readonly",
                            "--mount", f"type=bind,src={ROOT / 'db/datos.sql'},dst=/docker-entrypoint-initdb.d/20-demo.sql,readonly"]
            # Registrar antes de crear: también limpiar si Docker falla después de crear.
            containers.append(server)
            docker(*command, image)
            inspection = json.loads(docker("inspect", server).stdout)[0]
            print("Aislamiento:", json.dumps({
                "container": inspection["Id"], "ports": inspection["HostConfig"]["PortBindings"],
                "tmpfs": inspection["HostConfig"]["Tmpfs"], "networks": list(inspection["NetworkSettings"]["Networks"]),
            }), flush=True)
            if inspection["HostConfig"]["PortBindings"] or list(inspection["NetworkSettings"]["Networks"]) != [network]:
                raise RuntimeError("El servidor no está aislado como se esperaba")
            print(docker("exec", server, "mysqld", "--version").stdout.decode().strip(), flush=True)
            deadline = time.monotonic() + args.timeout
            while time.monotonic() < deadline:
                # TCP solo responde en el servidor definitivo, no en el bootstrap por socket.
                ready = docker("exec", "-e", "MYSQL_PWD=" + password, server, "mysql",
                               "--protocol=tcp", "--connect-timeout=2", "-h127.0.0.1", "-uroot", "-Nse", "SELECT 1", check=False)
                if ready.returncode == 0:
                    break
                time.sleep(1)
            else:
                raise RuntimeError(f"MySQL no estuvo disponible en {args.timeout} segundos")
            identity = sql("SELECT @@server_uuid;").stdout.decode().strip()
            print("UUID del servidor temporal:", identity, flush=True)
            if args.check_development:
                print("Verificando inicialización real del entrypoint Docker", flush=True)
                counts = dict(usuario=5, organizacion=1, donante=2, intermediario=2,
                              categoria_articulo=4, articulo=12, publicacion=14, donacion=4,
                              publicacion_articulo=16, landing_carousel=4, resultado_campana=5)
                inventory("donaciones", counts)
                # Probar también los dos comandos manuales, capturando cada advertencia.
                sql("CREATE DATABASE manual_development CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                for file in ("init.sql", "datos.sql"):
                    print("Importación manual con --show-warnings:", file, flush=True)
                    sql((ROOT / "db" / file).read_text(), "manual_development")
                inventory("manual_development", counts)
                code = 0
            else:
                print("Importación del DDL sin seed, con --show-warnings", flush=True)
                sql((ROOT / "db/init.sql").read_text(), "donaciones")
                inventory("donaciones", {})
                sql("CREATE DATABASE test_isolation; CREATE TABLE test_isolation.run_guard "
                    "(id INT PRIMARY KEY, token CHAR(64) NOT NULL); "
                    f"INSERT INTO test_isolation.run_guard VALUES (1, '{token}');")
                environment.update(TEST_DB_HOST="mysql", TEST_DB_PORT="3306", TEST_DB_USER="root",
                                   TEST_DB_PASSWORD=password, TEST_DB_NAME="donaciones",
                                   TEST_MYSQL_SERVER_UUID=identity, TEST_MYSQL_TOKEN=token)
        if not args.check_development:
            command = ["run", "--name", tester, "--label", f"{LABEL}={run_id}",
                       "--network", "none" if args.unit else network,
                       "--mount", f"type=bind,src={ROOT / 'db/init.sql'},dst=/schema.sql,readonly",
                       "--tmpfs", "/app/uploads:rw", "--workdir", "/app"]
            # Montar solo código; no exponer .env, secrets ni datos locales.
            for path in ("app.py", "auth_utils.py", "pytest.ini", "db", "routes",
                         "services", "scripts", "tests", "utils"):
                command += ["--mount", f"type=bind,src={ROOT / 'backend' / path},dst=/app/{path},readonly"]
            for key, value in environment.items():
                command += ["-e", f"{key}={value}"]
            command += [backend_image, "python", "-B", "-m", "pytest", "-p", "no:cacheprovider"]
            if not args.unit:
                command += ["--mysql"]
            command += pytest_args or (["-q"] if args.unit else [*DEFAULT_TESTS, "-q"])
            containers.append(tester)
            # Salida en vivo, sin capturar ni transformar el código de pytest.
            result = subprocess.run(["docker", *command])
            code = result.returncode
            print("Código de salida de pytest:", code, flush=True)
    except KeyboardInterrupt:
        code = 130
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        # TimeoutExpired contiene los argumentos y potencialmente credenciales.
        print("ERROR: " + ("Tiempo límite de Docker agotado" if isinstance(exc, subprocess.TimeoutExpired)
                           else str(exc)), file=sys.stderr, flush=True)
        code = 1
    finally:
        # No interrumpir la limpieza con otra señal normal.
        for sig in previous_signals:
            signal.signal(sig, signal.SIG_IGN)
        cleanup_ok = True
        for name in reversed(containers):
            try:
                found = docker("inspect", name, check=False)
                if found.returncode == 0:
                    labels = json.loads(found.stdout)[0]["Config"].get("Labels") or {}
                    if labels.get(LABEL) != run_id:
                        raise RuntimeError("No se eliminará un contenedor ajeno")
                    docker("rm", "-f", "-v", name)
                    if docker("inspect", name, check=False).returncode == 0:
                        raise RuntimeError("El contenedor sigue existiendo")
                elif "No such" not in found.stderr.decode(errors="replace"):
                    raise RuntimeError("No se pudo comprobar la ausencia del contenedor")
                print("Limpieza de contenedor:", name, "OK", flush=True)
            except Exception:
                cleanup_ok = False
                print("ERROR limpiando recurso exclusivo:", name, file=sys.stderr)
        if network_created:
            try:
                found = docker("network", "inspect", network, check=False)
                if found.returncode == 0:
                    if (json.loads(found.stdout)[0].get("Labels") or {}).get(LABEL) != run_id:
                        raise RuntimeError("No se eliminará una red ajena")
                    docker("network", "rm", network)
                    if docker("network", "inspect", network, check=False).returncode == 0:
                        raise RuntimeError("La red sigue existiendo")
                elif "No such" not in found.stderr.decode(errors="replace"):
                    raise RuntimeError("No se pudo comprobar la ausencia de la red")
                print("Limpieza de red:", network, "OK", flush=True)
            except Exception:
                cleanup_ok = False
                print("ERROR limpiando red exclusiva:", network, file=sys.stderr)
        for sig, handler in previous_signals.items():
            signal.signal(sig, handler)
        if not cleanup_ok and code == 0:
            code = 1
    return code


if __name__ == "__main__":
    sys.exit(main())

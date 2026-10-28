# Lista (y con --aplicar borra) las imágenes subidas que ningún registro usa y tienen más de 7 días.
# Ejecutar desde backend: python -m scripts.limpiar_uploads            -> solo muestra los candidatos
#                         python -m scripts.limpiar_uploads --aplicar  -> borra los candidatos
# En docker: docker compose exec backend python -m scripts.limpiar_uploads
import argparse
import os
import sys

from db.connection import db_cursor
from services.limpieza_uploads import CONSERVACION_DIAS, borrar_candidatos, inventario

CARPETA = os.getenv("UPLOAD_FOLDER", "/app/uploads")


def _kb(archivos):
    return sum(a["bytes"] for a in archivos) / 1024


def main(argv=None, salida=None):
    parser = argparse.ArgumentParser(description="Limpieza de imágenes subidas sin uso")
    parser.add_argument("--aplicar", action="store_true", help="borra los candidatos (sin esto solo los lista)")
    parser.add_argument("--carpeta", default=CARPETA)
    parser.add_argument("--dias", type=int, default=CONSERVACION_DIAS, help="días de conservación")
    args = parser.parse_args(argv)
    if args.dias < CONSERVACION_DIAS:
        parser.error(f"la conservación acordada es de al menos {CONSERVACION_DIAS} días")

    salida = salida or sys.stdout
    escribir = lambda texto="": print(texto, file=salida)
    with db_cursor() as (_, cursor):
        inv = inventario(cursor, args.carpeta, conservacion_dias=args.dias)
        escribir(f"Carpeta: {args.carpeta} (conservación: {args.dias} días)")
        escribir(f"  En uso: {len(inv['en_uso'])} ({_kb(inv['en_uso']):.0f} KB)")
        escribir(f"  Sin uso pero recientes, se conservan: {len(inv['recientes'])}")
        escribir(f"  Candidatos a borrar: {len(inv['candidatos'])} ({_kb(inv['candidatos']):.0f} KB)")
        escribir(f"  Otros archivos que no se tocan: {len(inv['ignorados'])}")
        for archivo in inv["candidatos"]:
            escribir(f"    {archivo['nombre']}  {archivo['bytes'] / 1024:.0f} KB  hace {archivo['dias']:.0f} días")

        if not args.aplicar:
            escribir("No se borró nada. Para borrar los candidatos: --aplicar")
            return 0

        resultado = borrar_candidatos(cursor, args.carpeta, inv["candidatos"])
        escribir(f"Borrados: {len(resultado['borrados'])}")
        if resultado["conservados"]:
            escribir(f"Se conservaron porque se empezaron a usar mientras tanto: {', '.join(resultado['conservados'])}")
        if resultado["ya_no_estaban"]:
            escribir(f"Ya no estaban (otra ejecución los borró): {len(resultado['ya_no_estaban'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

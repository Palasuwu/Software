# Migra exclusivamente las organizaciones de demostracion, sin borrar sus actividades.
# Ejecutar desde backend: python -m scripts.configurar_liga_juvenil --aplicar
import argparse
import json
import tempfile

from db.connection import db_cursor
from services.plataforma_config import obtener_id_organizacion_principal


DATOS = {
    "nombre": "Liga Juvenil Nacional",
    "descripcion": "Formación, liderazgo y acción para la juventud guatemalteca.",
    "direccion": "",
    "departamento": "Guatemala",
    "municipio": "Ciudad de Guatemala",
    "zona": "",
    "latitud": None,
    "longitud": None,
    "telefono": "",
    "correo": "",
    "quienes_somos": "Somos una organización juvenil, social y cultural que cree en la participación, el liderazgo y el cambio generacional.",
    "que_hacemos": "Formación, liderazgo y acción para la juventud guatemalteca.",
    "como_trabajamos": "Trabajamos junto a jóvenes guatemaltecos, desde encuentros comunitarios hasta el Congreso de la República, para formar la voz del presente y del futuro.",
    "donde_trabajamos": "Ciudad de Guatemala.",
    "url_logo": "/liga-juvenil.svg",
    "imagen_portada": None,
}


def validar_destino(organizaciones, principal):
    por_id = {o["id_organizacion"]: o for o in organizaciones}
    if principal != 1 or 1 not in por_id:
        raise ValueError("Revisar ID_ORGANIZACION_PRINCIPAL antes de migrar.")
    if por_id[1]["nombre"] not in ("Hogar de Ninos La Esperanza", "Liga Juvenil Nacional"):
        raise ValueError("La organizacion 1 no es la organizacion de demostracion esperada.")
    if 2 in por_id and por_id[2]["nombre"] != "Asilo de Ancianos El Refugio":
        raise ValueError("La organizacion 2 tiene otros datos; no se modificara.")
    if set(por_id) - {1, 2}:
        raise ValueError("Hay otras organizaciones: revisarlas antes de consolidar.")
    return por_id


def migrar(aplicar=False):
    with db_cursor() as (conn, cursor):
        try:
            cursor.execute("SELECT * FROM organizacion ORDER BY id_organizacion FOR UPDATE")
            organizaciones = cursor.fetchall()
            por_id = validar_destino(organizaciones, obtener_id_organizacion_principal())
            respaldo = {"organizacion": organizaciones}
            for tabla in ("intermediario", "publicacion"):
                cursor.execute(f"SELECT * FROM {tabla} WHERE id_organizacion IN (1, 2) FOR UPDATE")
                respaldo[tabla] = cursor.fetchall()
            if not aplicar:
                conn.rollback()
                print("Revision correcta. Usar --aplicar para guardar los cambios.")
                return
            # El respaldo incluye todos los valores y relaciones que se van a tocar.
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", prefix="liga-juvenil-respaldo-", suffix=".json", delete=False) as archivo:
                json.dump(respaldo, archivo, ensure_ascii=False, indent=2, default=str)
                print(f"Respaldo: {archivo.name}")
            if por_id[1]["nombre"] == "Hogar de Ninos La Esperanza":
                asignaciones = ", ".join(f"{campo} = %s" for campo in DATOS)
                cursor.execute(f"UPDATE organizacion SET {asignaciones} WHERE id_organizacion = 1", tuple(DATOS.values()))
            if 2 in por_id:
                for tabla in ("intermediario", "publicacion"):
                    cursor.execute(f"UPDATE {tabla} SET id_organizacion = 1 WHERE id_organizacion = 2")
                cursor.execute("DELETE FROM organizacion WHERE id_organizacion = 2")
            # Solo elimina imagenes placeholder identificadas, no imagenes del usuario.
            cursor.execute("""UPDATE publicacion SET imagen_url = NULL
                WHERE id_organizacion = 1 AND imagen_url IN (
                'https://placehold.co/600x340/d4c5a9/5c3d1e?text=Hogar+La+Esperanza',
                'https://placehold.co/600x340/b8d5c8/1e3d2e?text=Hogar+La+Esperanza')""")
            conn.commit()
            print("Liga Juvenil configurada. Campañas, donaciones y usuarios conservados.")
        except Exception:
            conn.rollback()
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--aplicar", action="store_true")
    migrar(parser.parse_args().aplicar)

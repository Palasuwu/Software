MAX_INTENTOS_FALLIDOS = 5
MINUTOS_BLOQUEO = 15


def asegurar_columnas_intentos_login(cursor):
    # MySQL no soporta "ADD COLUMN IF NOT EXISTS"; se revisa information_schema.
    columnas = (
        ("intentos_fallidos", "INT NOT NULL DEFAULT 0"),
        ("bloqueado_hasta", "DATETIME NULL"),
    )
    for columna, definicion in columnas:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'usuario'
            AND COLUMN_NAME = %s
            """,
            (columna,)
        )
        if cursor.fetchone()["total"] == 0:
            cursor.execute(f"ALTER TABLE usuario ADD COLUMN {columna} {definicion}")


def registrar_intento_fallido(cursor, id_usuario, intentos_actuales):
    """Suma un intento fallido y bloquea la cuenta si llega al limite."""
    nuevos_intentos = intentos_actuales + 1

    if nuevos_intentos >= MAX_INTENTOS_FALLIDOS:
        cursor.execute(
            """
            UPDATE usuario
            SET intentos_fallidos = 0,
                bloqueado_hasta = DATE_ADD(NOW(), INTERVAL %s MINUTE)
            WHERE id_usuario = %s
            """,
            (MINUTOS_BLOQUEO, id_usuario)
        )
    else:
        cursor.execute(
            "UPDATE usuario SET intentos_fallidos = %s WHERE id_usuario = %s",
            (nuevos_intentos, id_usuario)
        )


def reiniciar_intentos_login(cursor, id_usuario):
    cursor.execute(
        """
        UPDATE usuario
        SET intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id_usuario = %s
        """,
        (id_usuario,)
    )

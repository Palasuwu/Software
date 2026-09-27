def asegurar_columnas_ubicacion(cursor):
    """Agrega columnas de ubicacion faltantes; idempotente via information_schema."""
    columnas_coordenadas = (
        ("organizacion", "latitud", "DECIMAL(10,7) NULL"),
        ("organizacion", "longitud", "DECIMAL(10,7) NULL"),
        ("publicacion", "latitud", "DECIMAL(10,7) NULL"),
        ("publicacion", "longitud", "DECIMAL(10,7) NULL"),
    )
    for tabla, columna, definicion in columnas_coordenadas:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = %s
            AND COLUMN_NAME = %s
            """,
            (tabla, columna)
        )
        if cursor.fetchone()["total"] == 0:
            cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}")

    # Relaja a NULL: permite heredar la ubicacion de la organizacion.
    columnas_opcionales = (
        ("departamento", "VARCHAR(200) NULL"),
        ("municipio", "VARCHAR(200) NULL"),
        ("zona", "VARCHAR(200) NULL"),
        ("direccion_detalle", "VARCHAR(300) NULL"),
    )
    for columna, definicion in columnas_opcionales:
        cursor.execute(
            """
            SELECT IS_NULLABLE AS nullable
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'publicacion'
            AND COLUMN_NAME = %s
            """,
            (columna,)
        )
        fila = cursor.fetchone()
        if fila and fila["nullable"] == "NO":
            cursor.execute(f"ALTER TABLE publicacion MODIFY COLUMN {columna} {definicion}")

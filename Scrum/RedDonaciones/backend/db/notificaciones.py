def _tabla_notificaciones_existe(cursor):
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = %s
        """,
        ("notificacion",)
    )
    fila = cursor.fetchone()
    if isinstance(fila, dict):
        return bool(fila.get("total"))
    return bool(fila and fila[0])


def asegurar_tabla_notificaciones(cursor):
    # CREATE TABLE confirma la transacción en curso aunque la tabla ya exista,
    # por eso solo se ejecuta cuando falta.
    if _tabla_notificaciones_existe(cursor):
        return

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS notificacion (
            id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            titulo VARCHAR(150) NOT NULL,
            mensaje VARCHAR(500) NOT NULL,
            enlace VARCHAR(300),
            leida TINYINT(1) NOT NULL DEFAULT 0,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_lectura TIMESTAMP NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
            INDEX idx_notificacion_usuario_fecha (id_usuario, fecha_creacion),
            INDEX idx_notificacion_usuario_leida (id_usuario, leida)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def crear_notificacion(cursor, id_usuario, tipo, titulo, mensaje, enlace=None):
    cursor.execute(
        """
        INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, enlace)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (id_usuario, tipo, titulo, mensaje, enlace)
    )

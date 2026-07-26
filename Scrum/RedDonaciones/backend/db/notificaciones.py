def asegurar_tabla_notificaciones(cursor):
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

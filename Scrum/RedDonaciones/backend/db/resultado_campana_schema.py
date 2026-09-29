def asegurar_tabla_resultado_campana(cursor):
    """Crea la tabla de resultados si falta; idempotente via IF NOT EXISTS.

    init.sql solo corre al inicializar un volumen vacio, asi que una base
    creada antes de esta tabla no la tiene y los LEFT JOIN de publicacion
    fallan. Mismo patron que asegurar_tabla_notificaciones.
    """
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS resultado_campana (
            id_resultado INT AUTO_INCREMENT PRIMARY KEY,
            id_publicacion INT NOT NULL UNIQUE,
            id_usuario_publicador INT NOT NULL,
            resumen VARCHAR(1000) NOT NULL,
            personas_beneficiadas INT NULL CHECK (personas_beneficiadas >= 0),
            imagen_url VARCHAR(500) NULL,
            fecha_publicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion) ON DELETE CASCADE,
            FOREIGN KEY (id_usuario_publicador) REFERENCES usuario(id_usuario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )

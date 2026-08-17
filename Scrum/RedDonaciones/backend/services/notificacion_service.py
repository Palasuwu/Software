def generar_recordatorios_donaciones_pendientes(cursor, id_donante):
    """Crea una sola notificación por entrega pendiente y donación."""
    cursor.execute(
        """
        INSERT INTO notificacion (
            id_usuario,
            tipo,
            titulo,
            mensaje,
            enlace
        )
        SELECT
            d.id_donante,
            'recordatorio_donacion_pendiente',
            'Tienes una entrega pendiente',
            CONCAT(
                'Recuerda coordinar la entrega de tu donación para ',
                p.titulo,
                '.'
            ),
            CONCAT('/donaciones/', d.id_donacion)
        FROM donacion d
        INNER JOIN publicacion p
            ON p.id_publicacion = d.id_publicacion
        WHERE d.id_donante = %s
          AND d.estado = 'pendiente'
          AND d.fecha_donacion <= CURDATE()
          AND NOT EXISTS (
              SELECT 1
              FROM notificacion n
              WHERE n.id_usuario = d.id_donante
                AND n.tipo = 'recordatorio_donacion_pendiente'
                AND n.enlace = CONCAT('/donaciones/', d.id_donacion)
          )
        """,
        (id_donante,)
    )

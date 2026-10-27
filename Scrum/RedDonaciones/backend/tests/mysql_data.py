"""Entidades reales compartidas por reportes, intermediarios y coordenadas."""
import uuid


class MySQLData:
    def __init__(self, conn, cursor, settings):
        self.conn, self.cursor, self.settings = conn, cursor, settings

    def insert(self, sql, params=()):
        self.cursor.execute(sql, params)
        return self.cursor.lastrowid

    def organization(self, name="Organización de prueba"):
        suffix = uuid.uuid4().hex
        return self.insert(
            "INSERT INTO organizacion (nombre,descripcion,direccion,departamento,municipio,zona,"
            "telefono,correo,estado_verificacion,latitud,longitud) "
            "VALUES (%s,'Organización de prueba','1 calle 1-1','Guatemala','Guatemala','1',"
            "%s,%s,'verificada',14.6349,-90.5069)",
            (name, suffix, f"org-{suffix}@test.local"),
        )

    def principal(self, organization):
        self.settings.setenv("ID_ORGANIZACION_PRINCIPAL", str(organization))

    def user(self, name, role, organization=None):
        suffix = uuid.uuid4().hex
        user = self.insert(
            "INSERT INTO usuario (nombre,correo,password,telefono,rol) VALUES (%s,%s,'x','22223333',%s)",
            (name, f"user-{suffix}@test.local", role),
        )
        if role == "donante":
            self.insert("INSERT INTO donante (id_usuario,departamento,municipio,zona,direccion_detalle) "
                        "VALUES (%s,'Guatemala','Guatemala','1','Dirección de prueba')", (user,))
        elif role == "intermediario":
            if organization is None:
                raise ValueError("El intermediario necesita organización")
            self.insert("INSERT INTO intermediario (id_usuario,id_organizacion,cargo) "
                        "VALUES (%s,%s,'Coordinador')", (user, organization))
        return user

    def article(self):
        category = self.insert("INSERT INTO categoria_articulo (nombre,descripcion) "
                               "VALUES ('Categoría de prueba','Categoría de prueba')")
        return self.insert("INSERT INTO articulo (nombre,descripcion,id_categoria) "
                           "VALUES ('Artículo de prueba','Artículo de prueba',%s)", (category,))

    def campaign(self, organization, intermediary, article, title):
        campaign = self.insert(
            "INSERT INTO publicacion (id_intermediario,id_organizacion,id_articulo,titulo,descripcion,"
            "cantidad_necesaria,cantidad_recibida,fecha_publicacion,fecha_limite,estado) "
            "VALUES (%s,%s,%s,%s,'Campaña de prueba',100,0,'2019-01-01','2099-12-31','activa')",
            (intermediary, organization, article, title),
        )
        self.insert("INSERT INTO publicacion_articulo (id_publicacion,id_articulo,cantidad) VALUES (%s,%s,100)",
                    (campaign, article))
        return campaign

-- Archivo init es para crear la base de datos y las tablas necesarias para el funcionamiento de la aplicación
-- También incluye algunos datos de ejemplo para facilitar las pruebas iniciales.


-- BASE DE DATOS
-- ======================

/* NO ESTAN TODAS LAS TABLAS, SOLO LAS PRINCIPALES PARA EL INICIO */

CREATE DATABASE IF NOT EXISTS donaciones;
USE donaciones;


-- USUARIO

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    correo VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    telefono VARCHAR(100) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rol ENUM('donante', 'intermediario', 'administrador') NOT NULL
) ENGINE=InnoDB;


-- ORGANIZACION

CREATE TABLE organizacion (
    id_organizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(200) NOT NULL UNIQUE,
    estado_verificacion VARCHAR(200) NOT NULL
) ENGINE=InnoDB;


-- DONANTE

CREATE TABLE donante (
    id_usuario INT PRIMARY KEY,
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
    direccion_detalle VARCHAR(300) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;


-- INTERMEDIARIO

CREATE TABLE intermediario (
    id_usuario INT PRIMARY KEY,
    id_organizacion INT NOT NULL,
    cargo VARCHAR(200) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_organizacion) REFERENCES organizacion(id_organizacion)
) ENGINE=InnoDB;


-- CATEGORIA

CREATE TABLE categoria_articulo (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL
) ENGINE=InnoDB;


-- ARTICULO

CREATE TABLE articulo (
    id_articulo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(300) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    id_categoria INT NOT NULL,
    UNIQUE (nombre, id_categoria),
    FOREIGN KEY (id_categoria) REFERENCES categoria_articulo(id_categoria)
) ENGINE=InnoDB;


-- PUBLICACION

CREATE TABLE publicacion (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    id_intermediario INT NOT NULL,
    id_organizacion INT NOT NULL,
    id_articulo INT NOT NULL,
    titulo VARCHAR(400) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    cantidad_necesaria INT NOT NULL CHECK (cantidad_necesaria >= 0),
    cantidad_recibida INT NOT NULL CHECK (cantidad_recibida >= 0),
    fecha_publicacion DATE NOT NULL,
    fecha_limite DATE NOT NULL,
    estado ENUM('activa','finalizada','cancelada') NOT NULL,
    FOREIGN KEY (id_intermediario) REFERENCES intermediario(id_usuario),
    FOREIGN KEY (id_organizacion) REFERENCES organizacion(id_organizacion),
    FOREIGN KEY (id_articulo) REFERENCES articulo(id_articulo),
    CHECK (fecha_limite >= fecha_publicacion)
) ENGINE=InnoDB;


-- DONACION

CREATE TABLE donacion (
    id_donacion INT AUTO_INCREMENT PRIMARY KEY,
    id_donante INT NOT NULL,
    id_publicacion INT NOT NULL,
    descripcion VARCHAR(300) NOT NULL,
    foto LONGBLOB,
    fecha_donacion DATE NOT NULL,
    FOREIGN KEY (id_donante) REFERENCES donante(id_usuario),
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion)
) ENGINE=InnoDB;



-- PUBLICACION_ARTICULO (NUEVA TABLA)
-- Para solucionar la relacion muchos a muchos entre publicaciones y articulos
-- a que una publicacion puede requerir varios articulos y un articulo puede ser requerido por varias publicaciones
CREATE TABLE publicacion_articulo (
    id_publicacion INT NOT NULL,
    id_articulo INT NOT NULL,
    descripcion_detalle VARCHAR(300),
    cantidad INT NOT NULL,
    PRIMARY KEY (id_publicacion, id_articulo),
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion) ON DELETE CASCADE,
    FOREIGN KEY (id_articulo) REFERENCES articulo(id_articulo) ON DELETE CASCADE
) ENGINE=InnoDB;


-- DATOS DE EJEMPLO

-- USUARIOS
INSERT IGNORE INTO usuario (id_usuario, nombre, correo, password, telefono, rol)
VALUES
    (1, 'Donante Demo', 'donante.demo@reddonaciones.local', 'demo123', '3000000001', 'donante'),
    (2, 'Intermediario Demo', 'inter.demo@reddonaciones.local', 'demo123', '3000000002', 'intermediario'),
    (3, 'Admin Demo', 'admin.demo@reddonaciones.local', 'demo123', '3000000001', 'administrador');

-- ORGANIZACIONES
INSERT IGNORE INTO organizacion (id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion)
VALUES
    (1, 'Hogar de Ninos La Esperanza', 'Apoyo integral para ninos en situacion de vulnerabilidad.', 'Zona Centro, Ciudad', '3100000001', 'contacto@laesperanza.org', 'verificada'),
    (2, 'Asilo de Ancianos El Refugio', 'Cuidado y apoyo para adultos mayores en situacion de vulnerabilidad.', 'Barrio San Juan, Ciudad', '3100000002', 'contacto@elrefugio.org', 'verificada');

-- DONANTE
INSERT IGNORE INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle)
VALUES
    (1, 'Antioquia', 'Medellin', 'Urbana', 'Calle 10 #20-30');

-- INTERMEDIARIO
INSERT IGNORE INTO intermediario (id_usuario, id_organizacion, cargo)
VALUES
    (2, 1, 'Coordinador de Donaciones');

-- CATEGORIA
INSERT IGNORE INTO categoria_articulo (id_categoria, nombre, descripcion)
VALUES
    (1, 'Ropa', 'Prendas de vestir para ninos, jovenes y adultos.');

-- ARTICULO
INSERT IGNORE INTO articulo (id_articulo, nombre, descripcion, id_categoria)
VALUES
    (1, 'Ropa de vestir', 'Prendas en buen estado para jornadas de entrega comunitaria.', 1);


INSERT IGNORE INTO articulo (id_articulo, nombre, descripcion, id_categoria)
VALUES
    (2, 'Abrigos', 'Abrigos para clima frío.', 1),
    (3, 'Bufandas', 'Bufandas y gorros.', 1);

-- PUBLICACIONES
INSERT IGNORE INTO publicacion (
    id_publicacion,
    id_intermediario,
    id_organizacion,
    id_articulo,
    titulo,
    descripcion,
    cantidad_necesaria,
    cantidad_recibida,
    fecha_publicacion,
    fecha_limite,
    estado
)
VALUES
    (1, 2, 2, 1, 'Ropa de invierno para abril', 'Recoleccion de chaquetas, buzos y pantalones.', 120, 70, '2026-04-01', '2026-04-20', 'activa'),
    (2, 2, 1, 1, 'Jornada de ropa infantil', 'Donaciones de ropa para ninos.', 90, 90, '2026-03-15', '2026-03-30', 'finalizada');

-- DONACIONES
INSERT IGNORE INTO donacion (id_donacion, id_donante, id_publicacion, descripcion, fecha_donacion)
VALUES
    (1, 1, 1, 'Entregue varias prendas.', '2026-04-05'),
    (2, 1, 2, 'Aporte ropa infantil.', '2026-03-28');



-- Relacionar publicaciones con articulos a traves de la tabla publicacion_articulo
INSERT IGNORE INTO publicacion_articulo (
    id_publicacion,
    id_articulo,
    descripcion_detalle,
    cantidad
)
VALUES
    (1, 1, 'Ropa de invierno (tallas 6–12)', 50),
    (1, 2, 'Abrigos en buen estado', 40),
    (1, 3, 'Bufandas y gorros para niños', 30),
    
    (2, 1, 'Ropa infantil variada', 90);
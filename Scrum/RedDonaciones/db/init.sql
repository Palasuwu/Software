
-- ======================
-- BASE DE DATOS
-- ======================

/* NO ESTAN TODAS LAS TABLAS, SOLO LAS PRINCIPALES PARA EL INICIO */

CREATE DATABASE IF NOT EXISTS donaciones;
USE donaciones;

-- ======================
-- USUARIO
-- ======================
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    correo VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    telefono VARCHAR(100) NOT NULL UNIQUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rol ENUM('donante', 'intermediario', 'administrador') NOT NULL
) ENGINE=InnoDB;

-- ======================
-- ORGANIZACION
-- ======================
CREATE TABLE organizacion (
    id_organizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(200) NOT NULL UNIQUE,
    estado_verificacion VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

-- ======================
-- DONANTE
-- ======================
CREATE TABLE donante (
    id_usuario INT PRIMARY KEY,
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
    direccion_detalle VARCHAR(300) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- ======================
-- INTERMEDIARIO
-- ======================
CREATE TABLE intermediario (
    id_usuario INT PRIMARY KEY,
    id_organizacion INT NOT NULL,
    cargo VARCHAR(200) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_organizacion) REFERENCES organizacion(id_organizacion)
) ENGINE=InnoDB;

-- ======================
-- CATEGORIA
-- ======================
CREATE TABLE categoria_articulo (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

-- ======================
-- ARTICULO
-- ======================
CREATE TABLE articulo (
    id_articulo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(300) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    id_categoria INT NOT NULL,
    UNIQUE (nombre, id_categoria),
    FOREIGN KEY (id_categoria) REFERENCES categoria_articulo(id_categoria)
) ENGINE=InnoDB;

-- ======================
-- PUBLICACION
-- ======================
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

-- ======================
-- DONACION
-- ======================
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
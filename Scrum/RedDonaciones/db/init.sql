-- DDL único. Seleccionar la base en el cliente antes de cargar este archivo.
SET NAMES utf8mb4;

-- USUARIO

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    correo VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    telefono VARCHAR(100) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rol ENUM('donante', 'intermediario', 'administrador') NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- FOTO DE PERFIL
CREATE TABLE IF NOT EXISTS usuario_foto (
    id_usuario INT PRIMARY KEY,
    imagen MEDIUMBLOB NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ORGANIZACION

CREATE TABLE IF NOT EXISTS organizacion (
    id_organizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
    latitud DECIMAL(10,7) NULL,
    longitud DECIMAL(10,7) NULL,
    telefono VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(200) NOT NULL UNIQUE,
    estado_verificacion VARCHAR(200) NOT NULL,

    -- Informacion institucional
    quienes_somos TEXT NULL,
    que_hacemos TEXT NULL,
    como_trabajamos TEXT NULL,
    donde_trabajamos TEXT NULL,

    -- Visual
    url_logo VARCHAR(500) NULL,
    imagen_portada VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- DONANTE

CREATE TABLE IF NOT EXISTS donante (
    id_usuario INT PRIMARY KEY,
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
    direccion_detalle VARCHAR(300) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- INTERMEDIARIO

CREATE TABLE IF NOT EXISTS intermediario (
    id_usuario INT PRIMARY KEY,
    id_organizacion INT NOT NULL,
    cargo VARCHAR(200) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_organizacion) REFERENCES organizacion(id_organizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- CATEGORIA

CREATE TABLE IF NOT EXISTS categoria_articulo (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ARTICULO

CREATE TABLE IF NOT EXISTS articulo (
    id_articulo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(300) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    id_categoria INT NOT NULL,
    UNIQUE (nombre, id_categoria),
    FOREIGN KEY (id_categoria) REFERENCES categoria_articulo(id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- PUBLICACION

CREATE TABLE IF NOT EXISTS publicacion (
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
    imagen_url VARCHAR(500) NULL,
    -- Ubicacion opcional: NULL = hereda de la organizacion.
    departamento VARCHAR(200) NULL,
    municipio VARCHAR(200) NULL,
    zona VARCHAR(200) NULL,
    direccion_detalle VARCHAR(300) NULL,
    latitud DECIMAL(10,7) NULL,
    longitud DECIMAL(10,7) NULL,
    FOREIGN KEY (id_intermediario) REFERENCES intermediario(id_usuario),
    FOREIGN KEY (id_organizacion) REFERENCES organizacion(id_organizacion),
    FOREIGN KEY (id_articulo) REFERENCES articulo(id_articulo),
    CHECK (fecha_limite >= fecha_publicacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- DONACION

CREATE TABLE IF NOT EXISTS donacion (
    id_donacion INT AUTO_INCREMENT PRIMARY KEY,
    id_donante INT NOT NULL,
    id_publicacion INT NOT NULL,
    descripcion VARCHAR(300) NOT NULL,
    nombre_contacto VARCHAR(200) NOT NULL,
    telefono_contacto VARCHAR(100) NOT NULL,
    hora_preferida TIME NOT NULL,
    nota VARCHAR(500),
    cantidad_donada INT NOT NULL CHECK (cantidad_donada > 0),
    foto LONGBLOB,
    fecha_donacion DATE NOT NULL,

    -- Estado 
    estado ENUM(
        'pendiente',
        'recibida',
        'en_proceso',
        'entregada',
        'rechazada'
    ) NOT NULL DEFAULT 'pendiente',

    FOREIGN KEY (id_donante) REFERENCES donante(id_usuario),
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTIFICACIONES

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RESULTADOS DE CAMPAÑA

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- PUBLICACION_ARTICULO (NUEVA TABLA)
-- Para solucionar la relacion muchos a muchos entre publicaciones y articulos
-- a que una publicacion puede requerir varios articulos y un articulo puede ser requerido por varias publicaciones
CREATE TABLE IF NOT EXISTS publicacion_articulo (
    id_publicacion INT NOT NULL,
    id_articulo INT NOT NULL,
    descripcion_detalle VARCHAR(300),
    cantidad INT NOT NULL,
    PRIMARY KEY (id_publicacion, id_articulo),
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion) ON DELETE CASCADE,
    FOREIGN KEY (id_articulo) REFERENCES articulo(id_articulo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- CARRUSEL LANDING
-- Imagenes del carrusel de la landing page publica, editables desde el panel de administrador
CREATE TABLE IF NOT EXISTS landing_carousel (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
    url_imagen VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

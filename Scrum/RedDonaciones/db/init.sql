-- Archivo init es para crear la base de datos y las tablas necesarias para el funcionamiento de la aplicación
-- También incluye algunos datos de ejemplo para facilitar las pruebas iniciales.
-- BASE DE DATOS

CREATE DATABASE IF NOT EXISTS donaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE donaciones;
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


-- ORGANIZACION

CREATE TABLE IF NOT EXISTS organizacion (
    id_organizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(400) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
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
    departamento VARCHAR(200) NOT NULL,
    municipio VARCHAR(200) NOT NULL,
    zona VARCHAR(200) NOT NULL,
    direccion_detalle VARCHAR(300) NOT NULL,
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


-- DATOS DE EJEMPLO

-- USUARIOS
INSERT IGNORE INTO usuario (id_usuario, nombre, correo, password, telefono, rol)
VALUES
    (1, 'Donante Demo', 'donante.demo@reddonaciones.local', '$2b$12$6sOX9qSrscwr5JS0lxrji.8nfhaUjhHJSGxlEFxaD5Jsi4.uhch2q', '3000000001', 'donante'),
    (2, 'Intermediario Demo', 'inter.demo@reddonaciones.local', '$2b$12$OLdylhqBPU4iMScJAXUGg.tMOCXMKd.cY4aqVmZnAW0c0EoTwzATK', '3000000002', 'intermediario'),
    (3, 'Admin Demo', 'admin.demo@reddonaciones.local', '$2b$12$6sOX9qSrscwr5JS0lxrji.8nfhaUjhHJSGxlEFxaD5Jsi4.uhch2q', '3000000003', 'administrador'),
    (4, 'Donante Video', 'donante.video@reddonaciones.local', '$2b$12$6sOX9qSrscwr5JS0lxrji.8nfhaUjhHJSGxlEFxaD5Jsi4.uhch2q', '3000000004', 'donante'),
    (5, 'Intermediario Refugio', 'inter.refugio@reddonaciones.local', '$2b$12$OLdylhqBPU4iMScJAXUGg.tMOCXMKd.cY4aqVmZnAW0c0EoTwzATK', '3000000005', 'intermediario');

-- ORGANIZACIONES
INSERT IGNORE INTO organizacion (id_organizacion,nombre,descripcion,direccion,departamento,municipio,zona,telefono,correo,estado_verificacion, quienes_somos, que_hacemos, como_trabajamos, donde_trabajamos )
VALUES
(
    1,
    'Hogar de Ninos La Esperanza',
    'Apoyo integral para niños en situación de vulnerabilidad.',
    'Zona Centro, Ciudad',
    'Guatemala',
    'Ciudad de Guatemala',
    '1',
    '3100000001',
    'contacto@laesperanza.org',
    'verificada',
    'Somos una organización dedicada a brindar apoyo y acompañamiento a niños y familias en situación de vulnerabilidad.',
    'Organizamos campañas de donación para recolectar ropa, alimentos y otros artículos esenciales destinados a niños y familias que los necesitan.',
    'Trabajamos en coordinación con donantes e intermediarios para identificar necesidades, organizar campañas y gestionar la recepción y entrega de las donaciones.',
    'Desarrollamos nuestras actividades principalmente en comunidades de la Ciudad de Guatemala y áreas cercanas.'
),
(
    2,
    'Asilo de Ancianos El Refugio',
    'Cuidado y apoyo para adultos mayores en situación de vulnerabilidad.',
    'Barrio San Juan, Ciudad',
    'Guatemala',
    'Ciudad de Guatemala',
    '6',
    '3100000002',
    'contacto@elrefugio.org',
    'archivada',
    'Somos una organización dedicada al cuidado y bienestar de adultos mayores que requieren acompañamiento y apoyo.',
    'Brindamos atención a adultos mayores y coordinamos campañas para recolectar ropa, artículos de cuidado personal y otros recursos necesarios para su bienestar.',
    'Trabajamos con el apoyo de donantes y voluntarios, identificando las necesidades de nuestros residentes y coordinando la recepción y distribución de las donaciones.',
    'Realizamos nuestras actividades en la Ciudad de Guatemala y apoyamos principalmente a adultos mayores de comunidades cercanas.'
);

-- DONANTE
INSERT IGNORE INTO donante (id_usuario, departamento, municipio, zona, direccion_detalle)
VALUES
    (1, 'Antioquia', 'Medellin', 'Urbana', 'Calle 10 #20-30'),
    (4, 'Guatemala', 'Ciudad de Guatemala', 'Zona 10', '12 calle 11-40, zona 10');

-- INTERMEDIARIO
INSERT IGNORE INTO intermediario (id_usuario, id_organizacion, cargo)
VALUES
    (2, 1, 'Coordinador de Donaciones'),
    (5, 2, 'Coordinador de Donaciones');

-- CATEGORIA
INSERT IGNORE INTO categoria_articulo (id_categoria, nombre, descripcion)
VALUES
    (1, 'Ropa', 'Prendas de vestir para niños, jovenes y adultos.'),
    (2, 'Educación', 'Materiales escolares, libros y herramientas de aprendizaje.'),
    (3, 'Alimentos', 'Alimentos no perecederos y víveres para familias.'),
    (4, 'Salud y Cuidado', 'Medicamentos básicos, pañales y productos de higiene.');

-- ARTICULO
INSERT IGNORE INTO articulo (id_articulo, nombre, descripcion, id_categoria)
VALUES
    (1, 'Ropa de vestir', 'Prendas en buen estado para jornadas de entrega comunitaria.', 1),
    (2, 'Abrigos', 'Abrigos para clima frío.', 1),
    (3, 'Bufandas', 'Bufandas y gorros.', 1),
    (4, 'Útiles escolares', 'Cuadernos, lápices y estuches escolares.', 2),
    (5, 'Juguetes', 'Juguetes recreativos para niños.', 2),
    (6, 'Canastas básicas', 'Granos básicos y víveres esenciales.', 3),
    (7, 'Medicamentos esenciales', 'Medicinas y suministros geriátricos.', 4),
    (8, 'Libros de texto', 'Lecturas y libros educativos de nivel escolar.', 2),
    (9, 'Mochilas escolares', 'Mochilas resistentes para estudiantes.', 2),
    (10, 'Pañales y ropa de bebé', 'Pañales desechables y prendas infantiles.', 4),
    (11, 'Calzado infantil', 'Zapatos y tenis para niños.', 1),
    (12, 'Uniformes escolares', 'Prendas escolares de diario.', 1);

-- PUBLICACIONES
-- Nota: id_organizacion=1 para ambas porque la plataforma opera con una unica
-- organizacion principal (ver ID_ORGANIZACION_PRINCIPAL); la organizacion 2
-- queda archivada como legado, sin publicaciones propias.
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
    estado,
    imagen_url,
    departamento,
    municipio,
    zona,
    direccion_detalle
)
VALUES
    (1, 2, 1, 1, 'Ropa de invierno para abril', 'Recoleccion de chaquetas, buzos y pantalones.', 120, 70, '2026-04-01', '2026-04-20', 'activa',
     'https://placehold.co/600x340/d4c5a9/5c3d1e?text=Hogar+La+Esperanza', 'Guatemala', 'Ciudad de Guatemala', '1', 'Centro de acopio'),
    (2, 2, 1, 1, 'Jornada de ropa infantil', 'Donaciones de ropa para ninos.', 90, 90, '2026-03-15', '2026-03-30', 'finalizada',
     'https://placehold.co/600x340/b8d5c8/1e3d2e?text=Hogar+La+Esperanza', 'Guatemala', 'Ciudad de Guatemala', '1', 'Bodega de donaciones');

-- Actualizar URLs en registros ya existentes que no tengan imagen
UPDATE publicacion SET imagen_url = 'https://placehold.co/600x340/d4c5a9/5c3d1e?text=Hogar+La+Esperanza'
    WHERE id_publicacion = 1 AND (imagen_url IS NULL OR imagen_url = '');
UPDATE publicacion SET imagen_url = 'https://placehold.co/600x340/b8d5c8/1e3d2e?text=Hogar+La+Esperanza'
    WHERE id_publicacion = 2 AND (imagen_url IS NULL OR imagen_url = '');

-- DONACIONES
INSERT IGNORE INTO donacion (id_donacion, id_donante, id_publicacion, descripcion, nombre_contacto, telefono_contacto, hora_preferida, nota, cantidad_donada, fecha_donacion, estado
)
VALUES
    (1, 1, 1, 'Entregue varias prendas.', 'Donante Demo', '3000000001', '09:00:00', 'Llevo bolsas clasificadas.', 20, '2026-04-05', 'pendiente'),
    (2, 1, 2, 'Aporte ropa infantil.', 'Donante Demo', '3000000001', '10:30:00', 'Entrego en recepcion.', 20, '2026-03-28', 'entregada'),
    (3, 4, 1, 'Entregue chaquetas y bufandas.', 'Donante Video', '3000000004', '08:30:00', 'Material en 2 cajas.', 25, '2026-04-10', 'en_proceso' ),
    (4, 4, 2, 'Entregue ropa para ninos.', 'Donante Video', '3000000004', '11:00:00', 'Solicito apoyo para descarga.', 15, '2026-03-25', 'recibida');


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

    (2, 1, 'Ropa infantil variada', 90),

    (3, 4, 'Cuadernos, lápices y estuches', 200),
    (4, 5, 'Juguetes recreativos nuevos', 150),
    (5, 6, 'Canastas con granos básicos', 60),
    (6, 7, 'Medicinas geriátricas comunes', 300),
    (7, 8, 'Libros de texto de primaria y secundaria', 400),
    (8, 9, 'Mochilas escolares resistentes', 100),
    (9, 2, 'Cobijas y sábanas térmicas', 80),
    (10, 1, 'Prendas deportivas para jóvenes', 120),
    (11, 10, 'Pañales y ropa para bebés', 250),
    (12, 11, 'Zapatos escolares tallas 24 a 36', 90),
    (13, 2, 'Abrigos y chaquetas para adulto', 70),
    (14, 12, 'Uniformes escolares tallas 2T a 6T', 60);

-- CARRUSEL LANDING
INSERT IGNORE INTO landing_carousel (id_imagen, url_imagen, alt_text, orden)
VALUES
    (1, '/carousel/carr1.jpeg', 'Voluntario entregando una donación a una niña junto a su familia', 1),
    (2, '/carousel/carr2.jpeg', 'Grupo de voluntarios y jóvenes de la comunidad sonriendo juntos', 2),
    (3, '/carousel/carr3.jpeg', 'Voluntario entregando ropa y una manta a una niña', 3),
    (4, '/carousel/carr4.jpeg', 'Voluntario compartiendo un libro con niñas de la comunidad', 4);

-- Estos son campañas/posts de ejemplo 
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
    estado,
    imagen_url,
    departamento,
    municipio,
    zona,
    direccion_detalle
) VALUES
(3, 2, 1, 4, 'Útiles escolares para niños de escasos recursos', 'Recolección de cuadernos, lápices y materiales para el regreso a clases de 80 niños en situación vulnerable.', 200, 200, '2024-08-01', '2026-09-30', 'finalizada', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Sede Central'),
(4, 2, 1, 5, 'Juguetes para niños en navidad', 'Campaña navideña para llevar alegría a niños del albergue. Se recolectaron juguetes nuevos y en buen estado.', 150, 162, '2024-11-01', '2026-12-24', 'finalizada', 'https://images.unsplash.com/photo-1558981285-6f0c68e7cc0a?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Albergue Infantil'),
(5, 2, 1, 6, 'Canastas de alimentos para familias necesitadas', 'Distribución de canastas básicas para 60 familias en situación de inseguridad alimentaria durante la temporada de lluvias.', 60, 60, '2024-06-01', '2027-07-15', 'finalizada', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Comedor Comunitario'),
(6, 2, 1, 7, 'Medicamentos para adultos mayores del asilo', 'Recolección de medicamentos de uso común para los residentes del asilo. Meta alcanzada gracias a la comunidad.', 300, 347, '2024-04-01', '2027-05-31', 'finalizada', 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Área Médica'),
(7, 2, 1, 8, 'Libros de texto para escuelas rurales', 'Donación de libros de primaria y secundaria para tres escuelas rurales sin acceso a materiales educativos.', 400, 412, '2024-02-01', '2027-03-31', 'finalizada', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Biblioteca Comunitaria'),
(8, 2, 1, 9, 'Mochilas escolares para comunidades rurales', 'Ayudanos a llevar mochilas equipadas con útiles a niños de comunidades que no tienen acceso a transporte escolar.', 100, 34, '2025-01-15', '2027-06-30', 'activa', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Bodega de Donaciones'),
(9, 2, 1, 2, 'Cobijas para albergue temporal', 'El albergue temporal necesita cobijas y sábanas para las familias que llegan sin nada. Cada donación cuenta.', 80, 22, '2025-02-01', '2027-07-31', 'activa', 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Albergue Temporal'),
(10, 2, 1, 1, 'Ropa deportiva para jóvenes del programa', 'Recolección de ropa deportiva en buen estado para jóvenes que participan en el programa de integración comunitaria.', 120, 55, '2025-03-01', '2027-08-31', 'activa', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Cancha Comunitaria'),
(11, 2, 1, 10, 'Pañales y ropa para bebés del hogar', 'El hogar de niños recibe bebés de 0 a 2 años. Necesitamos pañales, bodys y ropa de temporada urgentemente.', 250, 89, '2025-04-01', '2026-09-30', 'activa', 'https://images.unsplash.com/photo-1503676382389-4809596d5290?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Hogar de Niños'),
(12, 2, 1, 11, 'Zapatos para niños de primaria', 'Muchos niños asisten a la escuela sin calzado adecuado. Donaciones de zapatos talla 24 a 36 en buen estado.', 90, 41, '2025-03-15', '2027-08-15', 'activa', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Centro de Acopio'),
(13, 2, 1, 2, 'Abrigos para adultos en situación de calle', 'Con la llegada del frío, el refugio nocturno necesita abrigos de talla adulto para las personas que atiende cada noche.', 70, 18, '2025-05-01', '2026-10-31', 'activa', 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Refugio Nocturno'),
(14, 2, 1, 12, 'Uniformes para niños de kínder', 'El kínder comunitario necesita uniformes para que sus estudiantes puedan asistir con dignidad. Tallas 2T a 6T.', 60, 7, '2025-05-10', '2026-11-30', 'activa', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800', 'Guatemala', 'Ciudad de Guatemala', '1', 'Kínder Comunitario');

-- RESULTADOS DE CAMPAÑAS FINALIZADAS
INSERT IGNORE INTO resultado_campana (
    id_resultado,
    id_publicacion,
    id_usuario_publicador,
    resumen,
    personas_beneficiadas,
    imagen_url
) VALUES
(1, 3, 2, 'Se entregaron kits de útiles escolares completos a 80 niños para el inicio del ciclo lectivo.', 80, 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800'),
(2, 4, 2, 'Jornada navideña exitosa con entrega de juguetes y refrigerio para más de 160 niños.', 162, 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800'),
(3, 5, 2, 'Distribución de víveres y canastas de alimentos no perecederos para 60 familias.', 60, 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800'),
(4, 6, 2, 'Abastecimiento de medicamentos básicos para el botiquín del asilo de ancianos.', 347, 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800'),
(5, 7, 2, 'Dotación de libros y material de lectura para tres escuelas rurales comunitarias.', 412, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800');
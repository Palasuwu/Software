-- ACTUALMENTE NO SE ESTÁ USANDO ESTE ARCHIVO, PERO SE DEJA COMO REFERENCIA PARA FUTURAS PRUEBAS O DESARROLLO.


-- Este archivo contiene datos de ejemplo para poblar la base de datos con información inicial. 
--Se pueden modificar o ampliar según sea necesario para pruebas y desarrollo


-- USUARIOS
INSERT IGNORE INTO usuario (id_usuario, nombre, correo, password, telefono, rol)
VALUES
    (1, 'Donante Demo', 'donante.demo@reddonaciones.local', '$2b$12$6sOX9qSrscwr5JS0lxrji.8nfhaUjhHJSGxlEFxaD5Jsi4.uhch2q', '3000000001', 'donante'),
    (2, 'Intermediario Demo', 'inter.demo@reddonaciones.local', '$2b$12$OLdylhqBPU4iMScJAXUGg.tMOCXMKd.cY4aqVmZnAW0c0EoTwzATK', '3000000002', 'intermediario');

-- ORGANIZACIONES
INSERT IGNORE INTO organizacion (id_organizacion, nombre, descripcion, direccion, telefono, correo, estado_verificacion)
VALUES
    (1, 'Hogar de Ninos La Esperanza', 'Apoyo integral para ninos en situacion de vulnerabilidad.', 'Zona Centro, Ciudad', '3100000001', 'contacto@laesperanza.org', 'verificada');

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
    (1, 2, 1, 1, 'Ropa de invierno para abril', 'Recoleccion de chaquetas, buzos y pantalones.', 120, 70, '2026-04-01', '2026-04-20', 'activa'),
    (2, 2, 1, 1, 'Jornada de ropa infantil', 'Donaciones de ropa para ninos.', 90, 90, '2026-03-15', '2026-03-30', 'finalizada');

-- DONACIONES
INSERT IGNORE INTO donacion (id_donacion, id_donante, id_publicacion, descripcion, fecha_donacion)
VALUES
    (1, 1, 1, 'Entregue varias prendas.', '2026-04-05'),
    (2, 1, 2, 'Aporte ropa infantil.', '2026-03-28');
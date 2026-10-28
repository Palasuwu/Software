# Historial de donaciones — SCRUM-245

El historial consulta diez donaciones por página. Anterior y Siguiente permiten
recorrer todos los aportes, incluidos los que antes quedaban fuera del límite de
50 registros. Al cambiar entre Todas, Activas y Finalizadas se vuelve a la primera
página. Los filtros se aplican en el servidor, antes del límite de filas.

Los contadores conservan el total de aportes de todo el historial del usuario,
independientemente de la página y del filtro seleccionado. Activas y Finalizadas
cuentan aportes asociados a campañas con esos estados, igual que la vista anterior.

## Consulta de la API

`GET /donaciones?id_donante=7&page=2&per_page=10`

- `page`: entero positivo, máximo 1 000 000 000; por defecto 1.
- `per_page`: entero entre 1 y 50; por defecto 10.
- `estado_publicacion`: opcional; acepta `activa` o `finalizada`.

La respuesta incluye `donaciones`, `page`, `per_page`, `total`, `total_pages` y
`resumen` (total, activas y finalizadas). `total` corresponde al filtro elegido;
`resumen` corresponde al historial completo del donante. Un historial vacío tiene
página 1 y cero páginas totales. Una página fuera de rango devuelve la última.

El orden es fecha de donación descendente y, para fechas iguales, ID descendente.
Se usa LIMIT/OFFSET: nuevos aportes entre consultas pueden desplazar las filas
entre páginas. No se ofrece una instantánea fija durante toda la navegación.

Las consultas sin parámetros de paginación conservan el arreglo y límite de 50
filas anterior. El donante solo puede consultar sus datos; el administrador puede
filtrar por donante o consultar todos. El intermediario conserva sus rutas propias.

## Verificación

Desde `backend/`, con `JWT_SECRET_KEY` configurada:

```sh
python -m pytest tests/donaciones -q
python -m pytest tests/automatizadas/regresion/test_historial_paginado_mysql.py -v
```

La segunda orden requiere MySQL y las variables DB_HOST, DB_USER, DB_PASSWORD y
DB_NAME. Reutiliza la base temporal de las pruebas automatizadas; verifica 61
aportes propios y tres ajenos, empates de fecha, recorrido sin duplicados,
filtros, totales globales, permisos y un historial vacío. La suite se omite si no
hay configuración de MySQL y se incluye en el pipeline existente.

Desde `frontend/`:

```sh
npm run test:run -- src/test/donaciones
npm run build
```

Las pruebas de interfaz cubren navegación, límites, cambio de filtro, contadores,
reintentos, respuestas obsoletas, errores y estados vacíos.

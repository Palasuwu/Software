# Limpieza de imágenes sin uso

## De dónde salen las imágenes sin uso

Las imágenes se suben en cuanto se eligen en un formulario (`POST /upload`), antes de guardar. El archivo queda en `/app/uploads` y la URL se guarda en la base solo cuando se confirma el formulario. Se reprodujeron cuatro casos que dejan archivos sin ninguna referencia:

| Caso | Qué pasa |
|---|---|
| Cancelar el formulario | La imagen subida nunca se guarda en un registro. |
| Reemplazar la imagen | Al guardar la nueva, la anterior deja de estar referenciada. Elegir varias veces otra imagen antes de guardar deja una por cada intento. |
| Fallo al guardar | Si el guardado responde con error (por ejemplo, datos inválidos), la imagen subida queda sin registro. |
| Borrar el registro | Al eliminar una imagen del carrusel, el archivo sigue en la carpeta. |

Las imágenes se usan en cinco columnas: `organizacion.url_logo`, `organizacion.imagen_portada`, `publicacion.imagen_url`, `resultado_campana.imagen_url` y `landing_carousel.url_imagen`. Una misma URL puede estar en más de un registro. Las fotos de perfil se guardan en la base (`usuario_foto`) y no forman parte de esta limpieza.

## Ciclo de vida acordado

- Un archivo está **en uso** si alguna de las cinco columnas lo referencia, ya sea como `/api/uploads/<nombre>` o como `/uploads/<nombre>`. Una URL externa con el mismo nombre no cuenta.
- Un archivo sin uso se **conserva 7 días** desde su última modificación, para no afectar a quien todavía está llenando un formulario.
- Pasados los 7 días, el archivo es **candidato** y se puede borrar. El borrado es definitivo.
- Solo se consideran los nombres que genera `/upload` (32 caracteres hexadecimales + `.jpg`). Cualquier otro archivo o carpeta se ignora.
- Antes de borrar cada candidato se vuelven a consultar sus referencias. Si alguien lo empezó a usar mientras tanto, se conserva.

## Cómo se ejecuta

La limpieza es manual. Por defecto solo muestra el inventario y los candidatos:

```bash
docker compose exec backend python -m scripts.limpiar_uploads             # revisar candidatos, no borra nada
docker compose exec backend python -m scripts.limpiar_uploads --aplicar   # borrar los candidatos
```

El script no acepta menos de 7 días en `--dias`. Se puede ejecutar varias veces: si un archivo ya no está, lo informa y sigue.

## Pruebas

`backend/tests/uploads/test_limpieza_uploads.py` usa MySQL real y una carpeta temporal. Cubre:

- los cuatro casos de arriba con el flujo real de la API;
- las cinco columnas;
- referencias compartidas;
- las dos formas de la URL;
- la conservación de 7 días;
- los archivos ajenos;
- las ejecuciones repetidas;
- los cambios entre el inventario y el borrado;
- el script con y sin `--aplicar`.

Se ejecutan con `python3 scripts/test_mysql.py -- tests/uploads -m mysql -v`.

# Selección de ubicación — Sprint 9

El formulario compartido `AddressFields` se utiliza en organizaciones (administrador y perfil institucional) y campañas (ambos paneles). Ofrece departamento y municipio dependiente; al cambiar departamento se limpian municipio y zona, y al cambiar municipio se limpia zona. La zona es opcional: vacío significa que no aplica o no está registrada, sin inventar un número.

Los nombres guardados fuera del catálogo permanecen visibles al editar. Para departamentos antiguos fuera del catálogo, el municipio conserva entrada de texto. No se normalizan ni reemplazan automáticamente los datos existentes. Los endpoints siguen recibiendo los mismos campos de texto y no se requieren migraciones, nuevas dependencias ni cambios en permisos o coordenadas.

## Catálogo

Fuente: https://github.com/minfin-bi/Mapas-TopoJSON-Guatemala (`munis.json`, consultado el 11 de octubre de 2026). Se extrajeron únicamente nombres de departamentos y municipios; se excluyeron lagos y Belice. El archivo local `municipiosGuatemala.json` contiene 22 departamentos y 340 municipios. No requiere internet durante el uso del formulario. Para actualizarlo, revisar la fuente y conservar la estructura departamento → lista de municipios.

## Verificación manual

1. Crear o editar una organización en administración y en el perfil institucional.
2. Elegir departamento y municipio; cambiar el departamento y comprobar que municipio y zona se limpian.
3. Crear y editar campañas en ambos paneles con ubicación propia, con y sin zona.
4. Editar una dirección antigua como «Ciudad de Guatemala» sin perder sus valores.
5. Cambiar entre ubicación propia y heredada; verificar dirección y enlaces de mapas.

Las pruebas automatizadas cubren selecciones dependientes, valores antiguos, formularios deshabilitados, modos de campaña y compatibilidad de direcciones/coordenadas. El backend valida zona numérica cuando se proporciona y admite vacío en campañas, como ya lo hacen las organizaciones.

## Resultados de validación

- Frontend: suite completa de Vitest, 19 archivos y 144 pruebas aprobadas.
- Backend: `tests/test_publicacion_ubicacion.py`, `tests/ubicacion` y `tests/test_ubicaciones_schema.py`: 80 pruebas aprobadas con base de datos simulada, incluida creación, edición y consulta sin zona.
- Compilación de producción con Vite: correcta. Mantiene aviso de tamaño del bundle.
- Se ejecutó la suite completa del backend con MySQL real aislado; ver los resultados siguientes. Se revisaron visualmente en Edge los modales de organización y campaña y el perfil institucional, en escritorio (1366 × 900) y móvil (390 × 844), con respuestas API simuladas. Se corrigieron anchos de cuadrícula para evitar desbordamiento móvil y se comprobó que no quedan elementos fuera del ancho de pantalla en el perfil. Los nombres antiguos se muestran sin sufijo y conservan su valor; los nombres largos tienen título con el texto completo. La suite frontend mantiene 144 pruebas aprobadas.

## Suite completa con MySQL — 11 de octubre de 2026

Resultado: **343 pruebas aprobadas, 0 fallos, 0 errores, 0 omitidas**, en 40.72 segundos. Incluye las 28 pruebas de rendimiento habilitadas con `RENDIMIENTO=1`, usando los volúmenes originales: 50 campañas/2 000 donaciones y 500 campañas/20 000 donaciones.

Se utilizó un contenedor temporal `mysql:8` (MySQL 8.4.8), inicializado con `db/init.sql`, y un entorno Python temporal con las dependencias de `backend/requirements.txt`. La conexión de pruebas se dirigió al puerto local 3307 mediante el runner temporal, sin modificar `db/connection.py`. El contenedor y su volumen temporal se retiraron al finalizar. No se utilizó la base de trabajo del proyecto.

La suite emitió 9 avisos `InsecureKeyLengthWarning` por claves JWT cortas de pruebas existentes; no hubo fallos.

Evidencia: `backend-sprint9-output.txt` y `backend-sprint9-results.xml` en esta carpeta.

// Exportacion de datos a CSV desde el navegador, sin endpoint dedicado:
// los reportes ya vienen del backend y aqui solo se serializan y descargan.

// Escapa segun RFC 4180: entrecomilla si hay separador, comillas o saltos de
// linea, y duplica las comillas internas.
function escaparCampo(valor) {
    if (valor === null || valor === undefined) return ''
    const texto = String(valor)
    return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * Serializa filas a CSV.
 * @param {Array<Object>} filas
 * @param {Array<{clave: string, titulo: string, formato?: (valor, fila) => any}>} columnas
 */
export function construirCsv(filas, columnas) {
    const encabezado = columnas.map((columna) => escaparCampo(columna.titulo)).join(',')

    const cuerpo = filas.map((fila) => columnas
        .map((columna) => {
            const valor = columna.formato ? columna.formato(fila[columna.clave], fila) : fila[columna.clave]
            return escaparCampo(valor)
        })
        .join(','))

    return [encabezado, ...cuerpo].join('\r\n')
}

/**
 * Descarga un CSV. Lleva BOM UTF-8 porque sin el Excel rompe los acentos
 * y las enies al abrir el archivo directamente.
 */
export function descargarCsv(nombreArchivo, contenido) {
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')

    enlace.href = url
    enlace.download = nombreArchivo
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)

    // Se libera en el siguiente tick: revocarlo de inmediato cancela la
    // descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Sufijo de fecha para los nombres de archivo: reportes-detalle-2026-09-29.csv
export function sufijoFechaArchivo(fecha = new Date()) {
    return fecha.toISOString().slice(0, 10)
}

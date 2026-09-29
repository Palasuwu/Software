// Construye enlaces a Google Maps y Waze para la ubicacion de una organizacion
// o campana. Si hay coordenadas se enlaza al punto exacto; si no, se cae a una
// busqueda por la direccion en texto, para que la funcion siga sirviendo
// mientras las coordenadas no esten capturadas.
//
// No confundir con utils/ubicacion.js, que valida coordenadas en formularios.

const texto = (valor) => String(valor ?? '').trim()

// Las coordenadas llegan como number o como string decimal segun el endpoint.
function coordenadaValida(valor, maximo) {
    if (valor === null || valor === undefined || texto(valor) === '') return false
    const numero = Number(valor)
    return Number.isFinite(numero) && Math.abs(numero) <= maximo
}

export function tieneCoordenadas(ubicacion = {}) {
    return coordenadaValida(ubicacion.latitud, 90) && coordenadaValida(ubicacion.longitud, 180)
}

// Direccion legible de mayor a menor detalle, sin partes vacias ni duplicadas.
export function formatearDireccion(ubicacion = {}) {
    const zona = texto(ubicacion.zona)
    const partes = [
        texto(ubicacion.direccion_detalle) || texto(ubicacion.direccion),
        zona ? `Zona ${zona}` : '',
        texto(ubicacion.municipio),
        texto(ubicacion.departamento)
    ].filter(Boolean)

    return [...new Set(partes)].join(', ')
}

// Lo que se le pasa al buscador cuando no hay coordenadas: se antepone el
// nombre del lugar porque mejora bastante el acierto de la busqueda.
function consultaDeBusqueda(ubicacion, nombre) {
    return [texto(nombre), formatearDireccion(ubicacion)].filter(Boolean).join(', ')
}

export function urlGoogleMaps(ubicacion = {}, nombre = '') {
    if (tieneCoordenadas(ubicacion)) {
        const { latitud, longitud } = ubicacion
        return `https://www.google.com/maps/search/?api=1&query=${Number(latitud)},${Number(longitud)}`
    }

    const consulta = consultaDeBusqueda(ubicacion, nombre)
    if (!consulta) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`
}

export function urlWaze(ubicacion = {}, nombre = '') {
    if (tieneCoordenadas(ubicacion)) {
        const { latitud, longitud } = ubicacion
        return `https://www.waze.com/ul?ll=${Number(latitud)}%2C${Number(longitud)}&navigate=yes`
    }

    const consulta = consultaDeBusqueda(ubicacion, nombre)
    if (!consulta) return null
    return `https://www.waze.com/ul?q=${encodeURIComponent(consulta)}`
}

// Hay algo que mostrar solo si existe coordenada o direccion en texto.
export function hayUbicacion(ubicacion = {}) {
    return tieneCoordenadas(ubicacion) || Boolean(formatearDireccion(ubicacion))
}

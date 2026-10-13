// Filtro de campañas de los paneles (admin e intermediario).
// No maneja estado ni hace llamadas a la API.

export const ESTADOS_CAMPANA = ['activa', 'finalizada', 'cancelada']

export const FILTROS_CAMPANA_VACIOS = { texto: '', estado: '' }

// Quita tildes y mayúsculas para que "campana" encuentre "Campaña"
function normalizar(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
}

export function hayFiltrosCampana(filtros) {
    return normalizar(filtros.texto) !== '' || filtros.estado !== ''
}

export function filtrarCampanas(publicaciones, filtros) {
    const texto = normalizar(filtros.texto)

    return publicaciones.filter((publicacion) => {
        if (filtros.estado && publicacion.estado !== filtros.estado) return false
        if (!texto) return true

        return [publicacion.titulo, publicacion.categoria, publicacion.articulo, publicacion.descripcion]
            .some((campo) => normalizar(campo).includes(texto))
    })
}

export function contarCampanasPorEstado(publicaciones) {
    const conteo = Object.fromEntries(ESTADOS_CAMPANA.map((estado) => [estado, 0]))
    publicaciones.forEach((publicacion) => {
        if (publicacion.estado in conteo) conteo[publicacion.estado] += 1
    })
    return conteo
}

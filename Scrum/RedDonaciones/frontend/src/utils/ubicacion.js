// Normaliza y valida las coordenadas opcionales de organizaciones y campañas.
const texto = (value) => String(value ?? '').trim()
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/

export function buildCoordinatesPayload(form) {
    return {
        latitud: texto(form.latitud) === '' ? null : Number(form.latitud),
        longitud: texto(form.longitud) === '' ? null : Number(form.longitud)
    }
}

export function validateCoordinates(form) {
    const errors = {}
    const latitud = texto(form.latitud)
    const longitud = texto(form.longitud)
    if (!latitud && !longitud) return errors
    if (!latitud) errors.latitud = 'Ingresa la latitud junto con la longitud'
    if (!longitud) errors.longitud = 'Ingresa la longitud junto con la latitud'
    if (latitud && (!DECIMAL.test(latitud) || !Number.isFinite(Number(latitud)) || Math.abs(Number(latitud)) > 90)) {
        errors.latitud = 'La latitud debe ser un número entre -90 y 90'
    }
    if (longitud && (!DECIMAL.test(longitud) || !Number.isFinite(Number(longitud)) || Math.abs(Number(longitud)) > 180)) {
        errors.longitud = 'La longitud debe ser un número entre -180 y 180'
    }
    return errors
}

export function buildCampaignLocationPayload(form) {
    const propia = form.ubicacion_modo === 'propia'
    return {
        departamento: propia ? texto(form.departamento) : null,
        municipio: propia ? texto(form.municipio) : null,
        zona: propia ? texto(form.zona) : null,
        direccion_detalle: propia ? texto(form.direccion_detalle) : null,
        ...(propia ? buildCoordinatesPayload(form) : { latitud: null, longitud: null })
    }
}

export function validateCampaignLocation(form) {
    if (form.ubicacion_modo !== 'propia') return {}
    const errors = validateCoordinates(form)
    if (!texto(form.departamento)) errors.departamento = 'El departamento es obligatorio'
    if (!texto(form.municipio)) errors.municipio = 'El municipio es obligatorio'
    if (texto(form.departamento).length > 200) errors.departamento = 'El departamento no puede superar los 200 caracteres'
    if (texto(form.municipio).length > 200) errors.municipio = 'El municipio no puede superar los 200 caracteres'
    if (!/^\d{1,2}$/.test(texto(form.zona))) errors.zona = 'La zona debe ser un número de uno o dos dígitos'
    if (texto(form.direccion_detalle).length < 8) errors.direccion_detalle = 'Ingresa una dirección de al menos 8 caracteres'
    if (texto(form.direccion_detalle).length > 300) errors.direccion_detalle = 'La dirección no puede superar los 300 caracteres'
    return errors
}

export function campaignLocationForm(publicacion) {
    // El indicador del backend distingue los valores heredados de los propios.
    const heredada = publicacion.ubicacion_heredada == null
        ? !texto(publicacion.departamento)
        : Boolean(publicacion.ubicacion_heredada)
    return {
        ubicacion_modo: heredada ? 'organizacion' : 'propia',
        departamento: heredada ? '' : publicacion.departamento ?? '',
        municipio: heredada ? '' : publicacion.municipio ?? '',
        zona: heredada ? '' : publicacion.zona ?? '',
        direccion_detalle: heredada ? '' : publicacion.direccion_detalle ?? '',
        latitud: heredada ? '' : publicacion.latitud ?? '',
        longitud: heredada ? '' : publicacion.longitud ?? ''
    }
}

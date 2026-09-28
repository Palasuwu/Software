// Normaliza y valida las coordenadas opcionales de organizaciones y campañas.
const texto = (value) => String(value ?? '').trim()

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
    if (latitud && (!Number.isFinite(Number(latitud)) || Math.abs(Number(latitud)) > 90)) {
        errors.latitud = 'La latitud debe ser un número entre -90 y 90'
    }
    if (longitud && (!Number.isFinite(Number(longitud)) || Math.abs(Number(longitud)) > 180)) {
        errors.longitud = 'La longitud debe ser un número entre -180 y 180'
    }
    return errors
}

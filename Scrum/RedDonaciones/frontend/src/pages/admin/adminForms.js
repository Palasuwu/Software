// Estado inicial de formularios y validaciones puras del panel de administrador.
// Sin JSX, sin llamadas a la API: solo transforma y valida datos de formulario.

export const USER_INITIAL_FORM = {
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    rol: 'donante',
    departamento: '',
    municipio: '',
    zona: '',
    direccion_detalle: '',
    id_organizacion: '',
    cargo: ''
}

export const CAMP_INITIAL_FORM = {
    titulo: '',
    descripcion: '',
    cantidad_necesaria: '',
    fecha_publicacion: '',
    fecha_limite: '',
    estado: 'activa',
    id_intermediario: '',
    id_organizacion: '',
    id_articulo: '',
    imagen_url: ''
}

const ORG_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ORG_PHONE_REGEX = /^[0-9+\-()\s]{8,20}$/
const ORG_STATUSES = ['pendiente', 'verificada', 'rechazada', 'inactiva', 'archivada']

export function cleanSpaces(value) {
    return value.trim().replace(/\s+/g, ' ')
}

export function countDigits(value) {
    return (value.match(/\d/g) || []).length
}

export function buildOrgPayload(form) {
    return {
        nombre: cleanSpaces(form.nombre),
        descripcion: cleanSpaces(form.descripcion),
        direccion: cleanSpaces(form.direccion),
        telefono: form.telefono.trim(),
        correo: form.correo.trim().toLowerCase(),
        estado_verificacion: form.estado_verificacion,
        // Ya son URLs generadas por /api/upload, no texto libre: se pasan tal cual.
        url_logo: form.url_logo || '',
        imagen_portada: form.imagen_portada || ''
    }
}

const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const IMAGE_MAX_SIZE = 5 * 1024 * 1024

// Valida un archivo de imagen antes de subirlo con apiUpload.
// Devuelve un mensaje de error, o null si el archivo es valido.
export function validateImageFile(file) {
    if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
        return 'Formato no permitido. Solo JPG, PNG, GIF o WEBP'
    }
    if (file.size > IMAGE_MAX_SIZE) {
        return `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es 5 MB`
    }
    return null
}

export function validateOrgForm(form) {
    const errors = {}
    const payload = buildOrgPayload(form)

    if (payload.nombre.length < 3) errors.nombre = 'Ingresa al menos 3 caracteres'
    if (payload.descripcion.length < 10) errors.descripcion = 'Ingresa una descripcion mas completa'
    if (payload.direccion.length < 8) errors.direccion = 'Ingresa una direccion mas especifica'
    if (!ORG_PHONE_REGEX.test(payload.telefono) || countDigits(payload.telefono) < 8) errors.telefono = 'Ingresa un telefono valido'
    if (!ORG_EMAIL_REGEX.test(payload.correo)) errors.correo = 'Ingresa un correo valido'
    if (!ORG_STATUSES.includes(payload.estado_verificacion)) errors.estado_verificacion = 'Selecciona un estado valido'

    return errors
}

export function buildUserPayload(form, includePassword) {
    const payload = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim()
    }

    if (includePassword) {
        payload.password = form.password
        payload.rol = form.rol
    }

    if (form.rol === 'donante') {
        payload.departamento = form.departamento.trim()
        payload.municipio = form.municipio.trim()
        payload.zona = form.zona.trim()
        payload.direccion_detalle = form.direccion_detalle.trim()
    }

    if (form.rol === 'intermediario') {
        payload.id_organizacion = Number(form.id_organizacion)
        payload.cargo = form.cargo.trim()
    }

    return payload
}

export function validateUserForm(form, mode) {
    const errors = {}

    if (!form.nombre.trim()) {
        errors.nombre = 'El nombre es obligatorio'
    } else if (form.nombre.trim().length < 3) {
        errors.nombre = 'Ingresa al menos 3 caracteres'
    }

    if (!form.correo.trim()) {
        errors.correo = 'El correo es obligatorio'
    } else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
        errors.correo = 'Ingresa un correo valido'
    }

    if (!form.telefono.trim()) {
        errors.telefono = 'El telefono es obligatorio'
    } else if (!/^[0-9\-+()\s]{8,20}$/.test(form.telefono.trim())) {
        errors.telefono = 'Ingresa un telefono valido'
    }

    if (mode === 'create') {
        if (form.password && form.password.length < 8) {
            errors.password = 'La contraseña debe tener al menos 8 caracteres'
        }

        if (!['donante', 'intermediario', 'administrador'].includes(form.rol)) {
            errors.rol = 'Selecciona un rol valido'
        }
    }

    if (form.rol === 'donante') {
        if (!form.departamento.trim()) errors.departamento = 'El departamento es obligatorio'
        if (!form.municipio.trim()) errors.municipio = 'El municipio es obligatorio'
        if (!form.zona.trim()) errors.zona = 'La zona es obligatoria'
        if (!form.direccion_detalle.trim()) errors.direccion_detalle = 'La direccion es obligatoria'
    }

    if (form.rol === 'intermediario') {
        if (!form.id_organizacion) errors.id_organizacion = 'Selecciona una organización'
        if (!form.cargo.trim()) errors.cargo = 'El cargo es obligatorio'
    }

    return errors;
}

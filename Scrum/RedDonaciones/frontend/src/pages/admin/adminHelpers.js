// Formato y calculo compartidos entre AdminPanel y OrgaPanel.
// No maneja estado ni hace llamadas a la API.

export function roleLabel(role) {
    if (role === 'donante') return 'Donante'
    if (role === 'intermediario') return 'Intermediario'
    if (role === 'administrador') return 'Administrador'
    return 'Sin rol'
}

export function campaignStatusLabel(status) {
    if (status === 'activa') return 'Activa'
    if (status === 'finalizada') return 'Finalizada'
    if (status === 'cancelada') return 'Cancelada'
    return 'Sin estado'
}

export function donationStatusLabel(status) {
    if (status === 'pendiente') return 'Pendiente'
    if (status === 'recibida') return 'Recibida'
    if (status === 'en_proceso') return 'En proceso'
    if (status === 'entregada') return 'Entregada'
    if (status === 'rechazada') return 'Rechazada'
    return 'Sin estado'
}

export function formatDate(value) {
    if (!value) return 'Sin fecha'

    try {
        return new Intl.DateTimeFormat('es-GT', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }).format(new Date(value))
    } catch {
        return String(value)
    }
}

export function getProgress(publicacion) {
    const necesaria = Number(publicacion.cantidad_necesaria || 0)
    const recibida = Number(publicacion.cantidad_recibida || 0)

    if (necesaria <= 0) return 0

    return Math.min(100, Math.round((recibida / necesaria) * 100))
}

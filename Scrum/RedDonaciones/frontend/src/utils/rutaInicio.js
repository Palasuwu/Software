// Pantalla a la que llega cada rol al iniciar sesión: la que más usa, no el perfil.
export function rutaInicioPorRol(rol) {
    if (rol === 'administrador') return '/admin'
    if (rol === 'intermediario') return '/intermediario'
    return '/home'
}

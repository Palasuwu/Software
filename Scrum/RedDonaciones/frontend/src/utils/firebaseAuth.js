// Inicio de sesion con Google a traves de Firebase.
//
// Firebase solo entrega un ID token que demuestra la identidad; la sesion de
// la app la sigue emitiendo el backend (mismo JWT de siempre). Por eso aqui
// no se guarda nada ni se consultan roles.
//
// La configuracion viaja en variables VITE_FIREBASE_*. Si falta alguna, el
// boton de Google no se muestra en lugar de romper la pantalla de ingreso.

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export function googleDisponible() {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

let appPromesa = null

// Carga diferida: el SDK no entra en el bundle inicial de quien nunca pulsa
// el boton de Google.
async function obtenerAuth() {
    if (!googleDisponible()) {
        throw new Error('El inicio de sesión con Google no está configurado')
    }

    if (!appPromesa) {
        appPromesa = (async () => {
            const [{ initializeApp, getApps, getApp }, authMod] = await Promise.all([
                import('firebase/app'),
                import('firebase/auth')
            ])
            const app = getApps().length ? getApp() : initializeApp(config)
            return { app, authMod }
        })()
    }

    const { app, authMod } = await appPromesa
    return { auth: authMod.getAuth(app), authMod }
}

/**
 * Abre el popup de Google y devuelve el ID token para el backend.
 * @returns {Promise<string|null>} null si la persona cerro el popup.
 */
export async function iniciarConGoogle() {
    const { auth, authMod } = await obtenerAuth()
    const proveedor = new authMod.GoogleAuthProvider()
    // Siempre preguntar la cuenta: evita entrar con una sesion de Google
    // ajena que quedara abierta en el navegador.
    proveedor.setCustomParameters({ prompt: 'select_account' })

    try {
        const credencial = await authMod.signInWithPopup(auth, proveedor)
        return await credencial.user.getIdToken()
    } catch (error) {
        // Cerrar el popup o cancelar no es un error que deba mostrarse.
        const silenciosos = [
            'auth/popup-closed-by-user',
            'auth/cancelled-popup-request',
            'auth/user-cancelled'
        ]
        if (silenciosos.includes(error?.code)) return null
        if (error?.code === 'auth/popup-blocked') {
            throw new Error('El navegador bloqueó la ventana de Google. Habilita las ventanas emergentes e inténtalo de nuevo.')
        }
        throw new Error('No se pudo conectar con Google. Inténtalo de nuevo.')
    }
}

// La sesion que vale es la del backend; la de Firebase ya no hace falta.
export async function cerrarSesionGoogle() {
    if (!googleDisponible() || !appPromesa) return
    try {
        const { auth, authMod } = await obtenerAuth()
        await authMod.signOut(auth)
    } catch {
        // Si falla, el JWT propio sigue siendo el que manda.
    }
}

// Segundo paso del alta con Google.
//
// Google entrega nombre y correo, pero la tabla donante exige telefono,
// departamento, municipio, zona y direccion, y esa direccion es la que la
// organizacion usa para coordinar la entrega. Aqui se piden solo esos datos,
// con el nombre y el correo ya resueltos.
//
// Va aparte de RegisterForm a proposito: este alta no lleva contrasena (el
// backend guarda un secreto aleatorio) y no toca el formulario clasico, que
// ya esta probado.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { guardarTokenSesion, guardarUsuarioSesion } from '../utils/session'

const FORM_VACIO = {
    nombre: '',
    telefono: '',
    departamento: '',
    municipio: '',
    zona: '',
    direccion_detalle: ''
}

const limpiar = (valor) => String(valor ?? '').trim().replace(/\s+/g, ' ')

function validar(form) {
    const errores = {}
    const nombre = limpiar(form.nombre)
    const telefono = form.telefono.trim()

    if (!nombre) errores.nombre = 'El nombre es obligatorio'
    else if (nombre.length < 3) errores.nombre = 'Ingresa al menos 3 caracteres'

    if (!telefono) errores.telefono = 'El teléfono es obligatorio'
    else if (!/^[0-9+\-()\s]{8,20}$/.test(telefono)) errores.telefono = 'Ingresa un teléfono válido'

    if (!limpiar(form.departamento)) errores.departamento = 'El departamento es obligatorio'
    if (!limpiar(form.municipio)) errores.municipio = 'El municipio es obligatorio'

    const zona = form.zona.trim()
    if (!zona) errores.zona = 'La zona es obligatoria'
    else if (!/^\d{1,2}$/.test(zona)) errores.zona = 'Ingresa una zona válida'

    if (limpiar(form.direccion_detalle).length < 8) {
        errores.direccion_detalle = 'Ingresa una dirección más específica'
    }

    return errores
}

export default function RegistroGoogle({ datos, onAuthSuccess, onCancelar }) {
    const navigate = useNavigate()
    const [form, setForm] = React.useState({ ...FORM_VACIO, nombre: datos.nombre || '' })
    const [errores, setErrores] = React.useState({})
    const [apiError, setApiError] = React.useState('')
    const [enviando, setEnviando] = React.useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((previo) => ({ ...previo, [name]: value }))
        setApiError('')
        setErrores((previo) => {
            if (!previo[name]) return previo
            const siguiente = { ...previo }
            delete siguiente[name]
            return siguiente
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const siguientes = validar(form)
        setErrores(siguientes)
        setApiError('')
        if (Object.keys(siguientes).length > 0) return

        setEnviando(true)
        try {
            const respuesta = await fetch('/api/auth/google/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // El ID token viaja otra vez: el backend no confia en que el
                // correo del primer paso siga siendo el mismo.
                body: JSON.stringify({ id_token: datos.idToken, ...form })
            })
            const cuerpo = await respuesta.json().catch(() => null)

            if (!respuesta.ok) {
                if (cuerpo?.campos) setErrores(cuerpo.campos)
                throw new Error(cuerpo?.error || 'No se pudo completar el registro')
            }
            if (!cuerpo?.token || !cuerpo?.usuario) {
                throw new Error('No se recibió la sesión del servidor')
            }

            guardarTokenSesion(cuerpo.token)
            guardarUsuarioSesion(cuerpo.usuario)
            onAuthSuccess?.(cuerpo.usuario)
            navigate('/perfil', { state: { flash: 'Cuenta creada con éxito' } })
        } catch (error) {
            setApiError(error.message || 'No se pudo completar el registro')
        } finally {
            setEnviando(false)
        }
    }

    const campo = (name) => `auth-input ${errores[name] ? 'auth-input-invalid' : ''}`

    return (
        <div className="auth-form-section">
            <div className="auth-form-heading">
                <h2>Completa tu cuenta</h2>
                <p>Entraste como <strong>{datos.correo}</strong>. Solo faltan tus datos de contacto y entrega.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <div className="auth-row">
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-nombre">Nombre completo</label>
                        <input id="g-nombre" className={campo('nombre')} name="nombre"
                            value={form.nombre} onChange={handleChange} autoComplete="name" />
                        {errores.nombre && <span className="auth-error-text">{errores.nombre}</span>}
                    </div>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-telefono">Teléfono</label>
                        <input id="g-telefono" className={campo('telefono')} name="telefono"
                            placeholder="5555-0000" value={form.telefono} onChange={handleChange} autoComplete="tel" />
                        {errores.telefono && <span className="auth-error-text">{errores.telefono}</span>}
                    </div>
                </div>

                <div className="auth-row">
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-departamento">Departamento</label>
                        <input id="g-departamento" className={campo('departamento')} name="departamento"
                            placeholder="Departamento" value={form.departamento} onChange={handleChange} />
                        {errores.departamento && <span className="auth-error-text">{errores.departamento}</span>}
                    </div>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-municipio">Municipio</label>
                        <input id="g-municipio" className={campo('municipio')} name="municipio"
                            placeholder="Municipio" value={form.municipio} onChange={handleChange} />
                        {errores.municipio && <span className="auth-error-text">{errores.municipio}</span>}
                    </div>
                </div>

                <div className="auth-row">
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-zona">Zona</label>
                        <input id="g-zona" className={campo('zona')} name="zona"
                            placeholder="Zona" value={form.zona} onChange={handleChange} />
                        {errores.zona && <span className="auth-error-text">{errores.zona}</span>}
                    </div>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="g-direccion">Dirección</label>
                        <input id="g-direccion" className={campo('direccion_detalle')} name="direccion_detalle"
                            placeholder="Calle, avenida, referencia" value={form.direccion_detalle} onChange={handleChange} />
                        {errores.direccion_detalle && <span className="auth-error-text">{errores.direccion_detalle}</span>}
                    </div>
                </div>

                {apiError && <div className="auth-api-error">{apiError}</div>}

                <button type="submit" className="auth-submit-btn" disabled={enviando}>
                    {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>

                <button type="button" className="auth-switch-btn auth-google-cancelar" onClick={onCancelar}>
                    Usar otra cuenta
                </button>
            </form>
        </div>
    )
}

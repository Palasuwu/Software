// Seccion del landing que explica el proceso de donar en tres pasos.
//
// Cada paso no muestra una captura quieta: reproduce en bucle la accion que
// hace el usuario en la app real (elegir una campana, llenar la entrega y ver
// avanzar el estado), con un cursor simulado que guia el recorrido.
//
// Las maquetas son decorativas (aria-hidden) y no consultan la API.
import React from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { IconLocation, IconCalendar } from './icons'
import './ComoFunciona.css'

const MUELLE = { type: 'spring', stiffness: 380, damping: 30 }
const MUELLE_CURSOR = { type: 'spring', stiffness: 170, damping: 22 }

/**
 * Recorre una secuencia de fases en bucle mientras `activo` sea cierto.
 * @param {number[]} duraciones ms que dura cada fase
 * @returns {number} indice de la fase actual
 */
function useSecuencia(duraciones, activo, reducirMovimiento) {
    const [fase, setFase] = React.useState(0)

    React.useEffect(() => {
        if (!activo || reducirMovimiento) return undefined

        let indice = 0
        let temporizador

        const avanzar = () => {
            setFase(indice)
            temporizador = setTimeout(() => {
                indice = (indice + 1) % duraciones.length
                avanzar()
            }, duraciones[indice])
        }

        avanzar()
        return () => clearTimeout(temporizador)
        // duraciones es una constante de modulo en cada vista
    }, [activo, reducirMovimiento])

    // Con movimiento reducido se muestra el estado final, sin recorrido.
    return reducirMovimiento ? duraciones.length - 2 : fase
}

// Cursor simulado que recorre la maqueta.
function Cursor({ x, y, pulsando, visible }) {
    return (
        <motion.span
            className="cf-cursor"
            initial={false}
            animate={{ x, y, opacity: visible ? 1 : 0, scale: pulsando ? 0.78 : 1 }}
            transition={MUELLE_CURSOR}
            aria-hidden="true"
        >
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 2l14 10-6.5 1.2L15 20l-3 1.2-2.6-6.6L5 18V2z" fill="#17232F" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            {pulsando && <motion.span className="cf-cursor-onda" initial={{ scale: 0, opacity: 0.55 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.5 }} />}
        </motion.span>
    )
}

// ── Paso 1: elegir una campana ─────────────────────────────────────────────
const CAMPANAS = [
    { titulo: 'Útiles escolares', org: 'Liga Juvenil Nacional', pct: 34 },
    { titulo: 'Ropa de invierno', org: 'Liga Juvenil Nacional', pct: 58 },
    { titulo: 'Abrigos de octubre', org: 'Liga Juvenil Nacional', pct: 12 }
]
// reposo · cursor baja · pasa por encima · clic · se abre · pausa
const FASES_ELEGIR = [700, 850, 650, 500, 1200, 1400]

function VistaElegir({ activo, reducirMovimiento }) {
    const fase = useSecuencia(FASES_ELEGIR, activo, reducirMovimiento)
    const elegida = 1
    const enfocada = fase >= 2
    const clicada = fase >= 3
    const abierta = fase >= 4

    // El cursor baja hasta la tarjeta del medio.
    const cursor = fase === 0 ? { x: 250, y: 22 } : { x: 196, y: 108 }

    return (
        <div className="cf-ui cf-ui-elegir" aria-hidden="true">
            <p className="cf-mini-head">Campañas activas</p>

            {CAMPANAS.map((campana, i) => {
                const esta = i === elegida
                return (
                    <motion.div
                        className={`cf-fila-campana${esta && enfocada ? ' cf-fila-campana--activa' : ''}`}
                        key={campana.titulo}
                        animate={{
                            y: esta && clicada ? 0 : 0,
                            scale: esta && clicada && !abierta ? 0.975 : 1
                        }}
                        transition={MUELLE}
                    >
                        <span className={`cf-fila-img cf-fila-img--${i}`} />
                        <span className="cf-fila-datos">
                            <span className="cf-fila-titulo">{campana.titulo}</span>
                            <span className="cf-fila-org">{campana.org}</span>
                            <span className="cf-barra cf-barra--mini">
                                <motion.span
                                    className="cf-barra-fill"
                                    initial={false}
                                    animate={{ width: `${campana.pct}%` }}
                                    transition={{ duration: 0.6 }}
                                />
                            </span>
                        </span>
                        <AnimatePresence>
                            {esta && abierta && (
                                <motion.span
                                    className="cf-fila-check"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={MUELLE}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )
            })}

            <Cursor x={cursor.x} y={cursor.y} pulsando={fase === 3} visible={fase > 0 && fase < 5} />
        </div>
    )
}

// ── Paso 2: agendar la entrega ─────────────────────────────────────────────
// reposo · sube cantidad · fecha · hora · compromiso · confirma · exito
const FASES_AGENDA = [600, 1200, 800, 750, 800, 700, 1900]
const CANTIDAD_FINAL = 12

function VistaAgendar({ activo, reducirMovimiento }) {
    const fase = useSecuencia(FASES_AGENDA, activo, reducirMovimiento)
    const [cantidad, setCantidad] = React.useState(1)

    // La cantidad sube de 1 a 12 mientras el cursor mantiene el boton "+".
    React.useEffect(() => {
        if (reducirMovimiento) { setCantidad(CANTIDAD_FINAL); return undefined }
        if (fase === 0) { setCantidad(1); return undefined }
        if (fase !== 1) return undefined

        const id = setInterval(() => {
            setCantidad((previo) => (previo >= CANTIDAD_FINAL ? (clearInterval(id), previo) : previo + 1))
        }, 85)
        return () => clearInterval(id)
    }, [fase, reducirMovimiento])

    const conFecha = fase >= 2
    const conHora = fase >= 3
    const comprometido = fase >= 4
    const confirmando = fase === 5
    const listo = fase >= 6

    const POSICIONES = {
        0: { x: 268, y: 16 },
        1: { x: 272, y: 96 },   // boton +
        2: { x: 74, y: 162 },   // fecha
        3: { x: 220, y: 162 },  // hora
        4: { x: 46, y: 222 },   // compromiso
        5: { x: 160, y: 276 },  // boton confirmar
        6: { x: 160, y: 276 }
    }
    const cursor = POSICIONES[fase] || POSICIONES[0]

    return (
        <div className="cf-ui cf-ui-agenda" aria-hidden="true">
            <p className="cf-agenda-titulo">Agendar entrega</p>

            <p className="cf-campo-label">Cantidad a donar</p>
            <div className="cf-qty">
                <span className="cf-qty-btn">−</span>
                <span className="cf-qty-valor">
                    <motion.span key={cantidad} initial={{ y: -7, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.12 }}>
                        {cantidad}
                    </motion.span>
                </span>
                <motion.span className="cf-qty-btn cf-qty-btn--mas" animate={{ scale: fase === 1 ? 0.9 : 1, backgroundColor: fase === 1 ? 'var(--primary-soft)' : 'var(--surface-soft)' }} transition={{ duration: 0.15 }}>
                    +
                </motion.span>
            </div>

            <div className="cf-agenda-fila">
                <div>
                    <p className="cf-campo-label">Fecha</p>
                    <motion.div className="cf-input" animate={{ borderColor: fase === 2 ? 'var(--primary)' : 'var(--outline)' }}>
                        <AnimatePresence mode="wait">
                            {conFecha
                                ? <motion.span key="f" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>12/04/2026</motion.span>
                                : <motion.span key="fv" className="cf-input-ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>dd/mm/aaaa</motion.span>}
                        </AnimatePresence>
                    </motion.div>
                </div>
                <div>
                    <p className="cf-campo-label">Hora</p>
                    <motion.div className="cf-input" animate={{ borderColor: fase === 3 ? 'var(--primary)' : 'var(--outline)' }}>
                        <AnimatePresence mode="wait">
                            {conHora
                                ? <motion.span key="h" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>10:00</motion.span>
                                : <motion.span key="hv" className="cf-input-ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>--:--</motion.span>}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            <motion.div
                className="cf-compromiso"
                animate={{
                    borderColor: comprometido ? 'var(--primary-muted)' : 'var(--outline)',
                    backgroundColor: comprometido ? 'var(--primary-soft)' : 'var(--surface-soft)'
                }}
                transition={{ duration: 0.25 }}
            >
                <motion.span
                    className="cf-check"
                    animate={{
                        backgroundColor: comprometido ? 'var(--primary)' : 'var(--surface)',
                        borderColor: comprometido ? 'var(--primary)' : 'var(--outline)',
                        scale: fase === 4 ? 1.12 : 1
                    }}
                    transition={MUELLE}
                >
                    <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" initial={false} animate={{ opacity: comprometido ? 1 : 0 }}>
                        <motion.polyline
                            points="20 6 9 17 4 12"
                            initial={false}
                            animate={{ pathLength: comprometido ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    </motion.svg>
                </motion.span>
                <span>Confirmo mi compromiso de entrega</span>
            </motion.div>

            <motion.div
                className={`cf-boton-falso${listo ? ' cf-boton-falso--listo' : ''}`}
                animate={{ scale: confirmando ? 0.96 : 1 }}
                transition={MUELLE}
            >
                <AnimatePresence mode="wait">
                    {listo
                        ? (
                            <motion.span key="ok" className="cf-boton-ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                                Entrega agendada
                            </motion.span>
                        )
                        : <motion.span key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Confirmar entrega</motion.span>}
                </AnimatePresence>
            </motion.div>

            <Cursor x={cursor.x} y={cursor.y} pulsando={fase === 1 || fase === 4 || fase === 5} visible={fase > 0 && fase < 6} />
        </div>
    )
}

// ── Paso 3: seguir el estado ───────────────────────────────────────────────
const ESTADOS_DONACION = [
    { clave: 'pendiente', etiqueta: 'Pendiente' },
    { clave: 'recibida', etiqueta: 'Recibida' },
    { clave: 'en_proceso', etiqueta: 'En proceso' },
    { clave: 'entregada', etiqueta: 'Entregada' }
]
const FASES_SEGUIMIENTO = [1300, 1300, 1300, 2200, 900]

function VistaSeguimiento({ activo, reducirMovimiento }) {
    const fase = useSecuencia(FASES_SEGUIMIENTO, activo, reducirMovimiento)
    // La ultima fase es la pausa antes de reiniciar: se mantiene "Entregada".
    const posicion = Math.min(fase, ESTADOS_DONACION.length - 1)
    const estado = ESTADOS_DONACION[posicion]
    const avance = ((posicion + 1) / ESTADOS_DONACION.length) * 100

    return (
        <div className="cf-ui cf-ui-seguimiento" aria-hidden="true">
            <div className="cf-seg-head">
                <p className="cf-seg-titulo">Ropa de invierno para abril</p>
                {/* Sin AnimatePresence a proposito: con mode="wait" el badge
                    quedaba invisible ~26% del tiempo esperando la salida del
                    anterior. Al cambiar la key se remonta y anima solo la
                    entrada, asi siempre hay una etiqueta a la vista. */}
                <motion.span
                    key={estado.clave}
                    className={`cf-seg-badge cf-seg-badge--${estado.clave}`}
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={MUELLE}
                >
                    {estado.etiqueta}
                </motion.span>
            </div>

            <p className="cf-seg-fecha">
                <IconCalendar className="cf-icono" />
                <span>12 de abril de 2026 · 12 unidades</span>
            </p>

            <div className="cf-seg-riel">
                <motion.div
                    className="cf-seg-riel-fill"
                    initial={false}
                    animate={{ width: `${avance}%` }}
                    transition={{ type: 'spring', stiffness: 150, damping: 24 }}
                />
            </div>

            <div className="cf-seg-pasos">
                {ESTADOS_DONACION.map((item, i) => {
                    const hecho = i <= posicion
                    return (
                        <span key={item.clave} className={`cf-seg-paso${hecho ? ' cf-seg-paso--hecho' : ''}`}>
                            <motion.span
                                className="cf-seg-punto"
                                animate={{
                                    backgroundColor: hecho ? 'var(--primary)' : 'var(--outline)',
                                    scale: i === posicion ? 1.45 : 1
                                }}
                                transition={MUELLE}
                            />
                            {item.etiqueta}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}

const PASOS = [
    {
        numero: '01',
        titulo: 'Elige una campaña.',
        texto: 'Explora las campañas activas y mira qué necesita cada una, dónde se entrega y cuánto falta por reunir.',
        Vista: VistaElegir
    },
    {
        numero: '02',
        titulo: 'Agenda tu entrega.',
        texto: 'Indica cuánto vas a donar, escoge fecha y hora, y confirma tu compromiso de entrega.',
        Vista: VistaAgendar
    },
    {
        numero: '03',
        titulo: 'Síguela hasta que llega.',
        texto: 'Desde Mis Donaciones ves avanzar tu entrega: pendiente, recibida, en proceso y entregada.',
        Vista: VistaSeguimiento
    }
]

// Cada paso se anima solo cuando entra en pantalla, para que el recorrido no
// corra en secciones que el visitante todavia no ve.
function Paso({ paso, indice, reducirMovimiento }) {
    const ref = React.useRef(null)
    const enVista = useInView(ref, { amount: 0.4 })
    const { numero, titulo, texto, Vista } = paso

    return (
        <motion.li
            className="cf-paso"
            ref={ref}
            initial={reducirMovimiento ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: (indice % 2) * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="cf-paso-texto">
                <span className="cf-paso-num">{numero}</span>
                <h3 className="cf-paso-titulo">{titulo}</h3>
                <p className="cf-paso-desc">{texto}</p>
            </div>

            <div className="cf-paso-vista">
                <Vista activo={enVista} reducirMovimiento={reducirMovimiento} />
            </div>
        </motion.li>
    )
}

export default function ComoFunciona() {
    const reducirMovimiento = useReducedMotion()

    return (
        <section className="cf-seccion" id="como-funciona" aria-labelledby="cf-titulo">
            <div className="ld-section">
                <p className="ld-section-label">Cómo funciona</p>
                <h2 className="ld-section-heading" id="cf-titulo">Donar toma tres pasos.</h2>

                <ol className="cf-pasos">
                    {PASOS.map((paso, i) => (
                        <Paso key={paso.numero} paso={paso} indice={i} reducirMovimiento={reducirMovimiento} />
                    ))}
                </ol>

                <div className="cf-cta">
                    <Link to="/home" className="ld-btn-primary">Ver campañas activas</Link>
                </div>
            </div>
        </section>
    )
}

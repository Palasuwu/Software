// Galeria de impacto del landing (antes "HorizontalCarousel", dentro de
// LandingPage.jsx).
//
// El autoplay se mantiene, pero contenido: antes la seccion ocupaba 100vh,
// el reloj arrancaba al cargar la pagina —asi que giraba sola mientras el
// visitante seguia en el hero— y las fotos de los lados bajaban a 0.45 de
// opacidad, lo que producia un parpadeo constante al lado del texto.
import React from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { apiGet } from '../utils/api'
import './GaleriaImpacto.css'

const FALLBACK = [
    { src: '/carousel/carr1.jpeg', alt: 'Voluntario entregando una donación a una niña junto a su familia' },
    { src: '/carousel/carr2.jpeg', alt: 'Grupo de voluntarios y jóvenes de la comunidad sonriendo juntos' },
    { src: '/carousel/carr3.jpeg', alt: 'Voluntario entregando ropa y una manta a una niña' },
    { src: '/carousel/carr4.jpeg', alt: 'Voluntario compartiendo un libro con niñas de la comunidad' }
]

// Antes 3.8s: a ese ritmo la foto cambiaba mientras todavia la estabas viendo.
const MS_AUTOPLAY = 6000
const MUELLE = { type: 'spring', stiffness: 90, damping: 20, mass: 0.6 }

function Diapositiva({ imagen, activa, indice }) {
    return (
        <motion.figure
            className="gi-item"
            animate={{
                // Menos contraste que antes (0.45 -> 0.78): las fotos de los
                // lados acompanan en vez de parpadear.
                opacity: activa ? 1 : 0.78,
                scale: activa ? 1 : 0.97
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
            <img src={imagen.src} alt={imagen.alt} loading={indice < 2 ? 'eager' : 'lazy'} draggable="false" />
        </motion.figure>
    )
}

export default function GaleriaImpacto() {
    const ref = React.useRef(null)
    const [imagenes, setImagenes] = React.useState(FALLBACK)
    const [indice, setIndice] = React.useState(0)
    const [pausada, setPausada] = React.useState(false)
    const reducir = useReducedMotion()
    const enVista = useInView(ref, { amount: 0.45 })

    React.useEffect(() => {
        apiGet('/api/carrusel')
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setImagenes(data.map((img) => ({ src: img.url_imagen, alt: img.alt_text })))
                }
            })
            .catch(() => {
                // Sin conexion o galeria vacia: se queda el respaldo.
            })
    }, [])

    // El reloj solo corre con la seccion a la vista y sin interaccion.
    React.useEffect(() => {
        if (reducir || !enVista || pausada) return undefined
        const id = setInterval(() => setIndice((i) => (i + 1) % imagenes.length), MS_AUTOPLAY)
        return () => clearInterval(id)
    }, [reducir, enVista, pausada, imagenes.length])

    const ancho = 100 / imagenes.length

    return (
        <section className="gi-seccion" ref={ref} aria-label="Galería de impacto" aria-roledescription="carrusel">
            <div className="gi-grid">
                <aside className="gi-copy">
                    <p className="gi-label">Nuestro trabajo en campo</p>
                    <h2 className="gi-heading">
                        Cada donación<br />llega a quien<br />más lo necesita.
                    </h2>
                    <p className="gi-desc">
                        Estas fotografías son de entregas reales: jornadas comunitarias,
                        familias acompañadas y jóvenes que llevaron los artículos hasta
                        donde hacían falta.
                    </p>
                    <p className="gi-conteo">
                        <span className="gi-conteo-actual">{String(indice + 1).padStart(2, '0')}</span>
                        <span className="gi-conteo-total"> / {String(imagenes.length).padStart(2, '0')}</span>
                    </p>

                    <div className="gi-puntos" role="tablist" aria-label="Navegación de imágenes">
                        {imagenes.map((imagen, i) => (
                            <button
                                key={imagen.src}
                                type="button"
                                role="tab"
                                aria-selected={i === indice}
                                aria-label={`Imagen ${i + 1} de ${imagenes.length}`}
                                className={`gi-punto${i === indice ? ' gi-punto--activo' : ''}`}
                                onClick={() => setIndice(i)}
                            >
                                <span className="gi-punto-linea" />
                            </button>
                        ))}
                    </div>
                </aside>

                <div
                    className="gi-viewport"
                    onMouseEnter={() => setPausada(true)}
                    onMouseLeave={() => setPausada(false)}
                    // Tambien se detiene al enfocar con teclado, no solo con mouse.
                    onFocusCapture={() => setPausada(true)}
                    onBlurCapture={() => setPausada(false)}
                >
                    <motion.div
                        className="gi-pista"
                        style={{ width: `${imagenes.length * 100}%` }}
                        animate={{ x: `-${indice * ancho}%` }}
                        transition={reducir ? { duration: 0 } : MUELLE}
                    >
                        {imagenes.map((imagen, i) => (
                            <Diapositiva key={imagen.src} imagen={imagen} activa={i === indice} indice={i} />
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import heroVideo    from '../assets/hero.mp4'
import helpingSvg   from '../assets/helping.svg'
import courierSvg   from '../assets/courier.svg'
import scholarSvg   from '../assets/scholar.svg'
import celebrationSvg from '../assets/celebration.svg'
import logoMark     from '../assets/LogoOwnerMark.svg'
import instagramSvg from '../assets/instagram.svg'
import { obtenerUsuarioSesion } from '../utils/session'
import { apiGet } from '../utils/api'
import './LandingPage.css'

const INSTAGRAM_URL = 'https://www.instagram.com/ligajuvenil_oficial/'

// Contenido institucional entregado por el product owner (kit de marca).
const PILARES = [
  {
    num: '01',
    titulo: 'Formación',
    desc: 'Espacios de aprendizaje real —desde talleres hasta jornadas en el Congreso— para entender cómo se construye el cambio.'
  },
  {
    num: '02',
    titulo: 'Liderazgo',
    desc: 'Formamos jóvenes que escuchan, proponen y representan a su comunidad con carácter propio.'
  },
  {
    num: '03',
    titulo: 'Acción',
    desc: 'Las ideas inspiran, pero las acciones transforman. Cada proyecto nace para moverse y dejar huella.'
  }
]

const VALORES = [
  { titulo: 'Integridad', desc: 'Decimos lo que hacemos y hacemos lo que decimos.' },
  { titulo: 'Compromiso social', desc: 'Nuestro trabajo empieza en la comunidad y regresa a ella.' },
  { titulo: 'Participación', desc: 'Ninguna decisión sobre la juventud se toma sin la juventud.' },
  { titulo: 'Respeto', desc: 'Escuchamos primero, sin importar de dónde venga la voz.' }
]

// Respaldo si el carrusel administrable (GET /api/carrusel) esta vacio o falla:
// mismas 4 imagenes por defecto que se siembran en la base de datos.
const CAROUSEL_FALLBACK = [
  { src: '/carousel/carr1.jpeg', alt: 'Voluntario entregando una donación a una niña junto a su familia' },
  { src: '/carousel/carr2.jpeg', alt: 'Grupo de voluntarios y jóvenes de la comunidad sonriendo juntos' },
  { src: '/carousel/carr3.jpeg', alt: 'Voluntario entregando ropa y una manta a una niña' },
  { src: '/carousel/carr4.jpeg', alt: 'Voluntario compartiendo un libro con niñas de la comunidad' },
]

// ─── Navbar ────────────────────────────────────────────────────────────────────

function LandingNav() {
  const usuario = obtenerUsuarioSesion()

  return (
    <nav className="ld-nav" aria-label="Navegación principal">
      <div className="ld-nav-inner">
        <Link to="/" className="ld-nav-brand" aria-label="Liga Juvenil Donaciones — inicio">
          <img src={logoMark} alt="" aria-hidden="true" />
          <span className="ld-brand-text">
            <span>Liga Juvenil</span>
            <span className="ld-brand-sub">Donaciones</span>
          </span>
        </Link>

        <div className="ld-nav-links">
          <Link to="/home" className="ld-nav-link">Explorar campañas</Link>
          <Link to={usuario ? '/home' : '/login'} className="ld-nav-cta">
            {usuario ? `Hola, ${usuario.nombre?.split(' ')[0]}` : 'Iniciar Sesión'}
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="ld-hero" aria-label="Hero principal">
      <video
        className="ld-hero-video"
        src={heroVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <div className="ld-hero-overlay" aria-hidden="true" />

      <div className="ld-hero-content">
        <p className="ld-hero-eyebrow">Liga Juvenil Nacional — Guatemala</p>
        <h1 className="ld-hero-title">
          El cambio<br />empieza contigo.
        </h1>
        <p className="ld-hero-sub">
          Formación, liderazgo y acción para la juventud guatemalteca
          que decide construir su futuro hoy.
        </p>
        <div className="ld-hero-actions">
          <Link to="/signup" className="ld-btn-primary">Únete al movimiento</Link>
          <a href="#quienes-somos" className="ld-btn-ghost">Conoce quiénes somos →</a>
        </div>
      </div>
    </section>
  )
}

// ─── Section Divider ────────────────────────────────────────────────────────────

function SectionDivider({ left = [], label, right = [] }) {
  return (
    <div className="ld-divider" aria-hidden="true">
      <div className="ld-divider-inner">
        <div className="ld-divider-group">
          {left.map((src, i) => (
            <img key={i} className="ld-divider-icon" src={src} alt="" />
          ))}
          {label && <span className="ld-divider-label">{label}</span>}
        </div>
        <div className="ld-divider-rule" />
        <div className="ld-divider-group">
          {right.map((src, i) => (
            <img key={i} className="ld-divider-icon" src={src} alt="" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Horizontal Carousel (Autoplay) ────────────────────────────────────────────

function HorizontalCarousel() {
  const sectionRef = useRef(null)
  const trackRef   = useRef(null)
  const idxRef     = useRef(0)
  const pausedRef  = useRef(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [images, setImages] = useState(CAROUSEL_FALLBACK)

  useEffect(() => {
    apiGet('/api/carrusel')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setImages(data.map((img) => ({ src: img.url_imagen, alt: img.alt_text })))
        }
      })
      .catch(() => {
        // Sin conexion o carrusel vacio: se mantiene el respaldo por defecto.
      })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const track = trackRef.current
    if (!track) return

    const N = images.length

    const snapTo = (idx) => {
      idxRef.current = idx
      setActiveIdx(idx)
      const item = track.children[idx]
      if (!item) return
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0
      track.style.transform = `translateX(${-(item.offsetLeft - pad)}px)`
    }

    snapTo(0)

    const tick = setInterval(() => {
      if (pausedRef.current) return
      snapTo((idxRef.current + 1) % N)
    }, 3800)

    // Re-align translateX on resize (item width depends on viewport)
    const onResize = () => snapTo(idxRef.current)
    window.addEventListener('resize', onResize)

    return () => {
      clearInterval(tick)
      window.removeEventListener('resize', onResize)
    }
  }, [images])

  const N = images.length
  const goTo = (idx) => {
    const track = trackRef.current
    if (!track) return
    idxRef.current = idx
    setActiveIdx(idx)
    const item = track.children[idx]
    if (!item) return
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0
    track.style.transform = `translateX(${-(item.offsetLeft - pad)}px)`
  }

  return (
    <section className="ld-scroll-section" ref={sectionRef} aria-label="Galería de impacto">
      <div className="ld-scroll-sticky">

        {/* ── Left: editorial copy (dark panel) ── */}
        <aside className="ld-scroll-copy">
          <p className="ld-scroll-label">01 — Cómo funciona</p>
          <h2 className="ld-scroll-heading">
            Cada donación<br />llega a quien<br />más lo necesita.
          </h2>
          <p className="ld-scroll-desc">
            La organización publica sus necesidades reales.
            Los donantes aportan artículos. Los intermediarios
            verificados coordinan la entrega. Transparencia total,
            impacto medible en cada etapa del proceso.
          </p>
          <Link to="/home" className="ld-scroll-cta" tabIndex={0}>
            Ver campañas activas →
          </Link>
        </aside>

        {/* ── Right: autoplay carousel ── */}
        <div
          className="ld-carousel-viewport"
          aria-label="Galería fotográfica"
          onMouseEnter={() => { pausedRef.current = true }}
          onMouseLeave={() => { pausedRef.current = false }}
        >
          <div className="ld-carousel-track" ref={trackRef}>
            {images.map((img, i) => (
              <figure
                className={`ld-carousel-item${i === activeIdx ? ' ld-carousel-item--active' : ''}`}
                key={i}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading={i < 2 ? 'eager' : 'lazy'}
                />
                <figcaption className="ld-carousel-num">
                  {String(activeIdx + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Dot navigation */}
          <div className="ld-carousel-dots" role="tablist" aria-label="Navegación de imágenes">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeIdx}
                aria-label={`Imagen ${i + 1} de ${N}`}
                className={`ld-carousel-dot${i === activeIdx ? ' ld-carousel-dot--active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── Quiénes somos ──────────────────────────────────────────────────────────────

function About() {
  return (
    <section className="ld-about" id="quienes-somos" aria-labelledby="ld-about-title">
      <div className="ld-section ld-about-grid">
        <div>
          <p className="ld-section-label">Quiénes somos</p>
          <h2 className="ld-section-heading" id="ld-about-title">
            Una organización<br />que se construye<br />desde la juventud
          </h2>
        </div>
        <p className="ld-about-text">
          Somos una organización juvenil, social y cultural que cree en la participación,
          el liderazgo y el cambio generacional. Trabajamos junto a jóvenes guatemaltecos,
          desde encuentros comunitarios hasta el Congreso de la República, para formar la
          voz del presente — y del futuro.
        </p>
      </div>
    </section>
  )
}

// ─── Pilares ────────────────────────────────────────────────────────────────────

function Pillars() {
  return (
    <section className="ld-pillars" aria-labelledby="ld-pillars-title">
      <div className="ld-section">
        <p className="ld-section-label">Nuestros pilares</p>
        <h2 className="ld-section-heading" id="ld-pillars-title">
          Formación · Liderazgo · Acción
        </h2>

        <div className="ld-pillars-grid">
          {PILARES.map((pilar) => (
            <article className="ld-pillar" key={pilar.num}>
              <p className="ld-pillar-num">{pilar.num}</p>
              <h3 className="ld-pillar-title">{pilar.titulo}</h3>
              <p className="ld-pillar-desc">{pilar.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Valores ────────────────────────────────────────────────────────────────────

function Values() {
  return (
    <section className="ld-values" aria-labelledby="ld-values-title">
      <div className="ld-section">
        <p className="ld-section-label">Nuestros valores</p>
        <h2 className="ld-section-heading" id="ld-values-title">Lo que no se negocia</h2>

        <div className="ld-values-grid">
          {VALORES.map((valor) => (
            <article className="ld-value" key={valor.titulo}>
              <h3 className="ld-value-title">{valor.titulo}</h3>
              <p className="ld-value-desc">{valor.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Línea de campaña ───────────────────────────────────────────────────────────

function CampaignQuote() {
  return (
    <section className="ld-quote">
      <div className="ld-quote-inner">
        <blockquote className="ld-quote-text">
          “El cambio no solo se piensa, se hace. Las ideas inspiran,
          pero las acciones transforman.”
        </blockquote>
        <p className="ld-quote-label">Línea de campaña</p>
      </div>
    </section>
  )
}

// ─── Llamado a la acción final ──────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="ld-cta" aria-labelledby="ld-cta-title">
      <div className="ld-section">
        <p className="ld-section-label">Llamado a la acción</p>
        <h2 className="ld-section-heading" id="ld-cta-title">Tu voz también es la Liga.</h2>
        <p className="ld-cta-sub">
          Síguenos, súmate a nuestras actividades y sé parte de la generación
          que decide participar.
        </p>
        <div className="ld-cta-actions">
          <Link to="/signup" className="ld-btn-gold">Quiero unirme</Link>
          <Link to="/home" className="ld-btn-outline">Ver actividades</Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="ld-footer">
      <div className="ld-footer-inner">
        <div className="ld-footer-top">
          <div className="ld-footer-brand">
            <p className="ld-footer-name">Liga Juvenil Nacional</p>
            <p className="ld-footer-tagline">
              Formación, liderazgo y acción — Ciudad de Guatemala.
            </p>
            <a
              className="ld-footer-social"
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={instagramSvg} alt="" aria-hidden="true" />
              <span>@ligajuvenil_oficial</span>
            </a>
          </div>

          <nav className="ld-footer-links" aria-label="Navegación del pie de página">
            <Link to="/signup">Registrarse</Link>
            <Link to="/login">Iniciar Sesión</Link>
            <Link to="/home">Explorar campañas</Link>
          </nav>
        </div>

        <div className="ld-footer-rule" aria-hidden="true" />

        <div className="ld-footer-bottom">
          <span>© 2026 Liga Juvenil Nacional. Todos los derechos reservados.</span>
          <span>Liga Juvenil · Donaciones</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page root ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="ld-root">
      <LandingNav />
      <Hero />
      <SectionDivider
        left={[helpingSvg]}
        label="Formación · Liderazgo · Acción"
        right={[courierSvg, scholarSvg]}
      />
      <About />
      <Pillars />
      <HorizontalCarousel />
      <SectionDivider
        left={[celebrationSvg]}
        label="Impacto real en comunidades"
        right={[helpingSvg]}
      />
      <Values />
      <CampaignQuote />
      <FinalCta />
      <LandingFooter />
    </div>
  )
}

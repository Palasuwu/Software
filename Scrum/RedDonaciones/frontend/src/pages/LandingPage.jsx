import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import heroVideo    from '../assets/hero.mp4'
import cajaPng      from '../assets/Caja.png'
import caja2Png     from '../assets/Caja2.png'
import nenesPng     from '../assets/Nenes.png'
import helpingSvg   from '../assets/helping.svg'
import courierSvg   from '../assets/courier.svg'
import scholarSvg   from '../assets/scholar.svg'
import celebrationSvg from '../assets/celebration.svg'
import { obtenerUsuarioSesion } from '../utils/session'

const CAROUSEL_IMAGES = [
  { src: cajaPng,  alt: 'Caja de donaciones' },
  { src: caja2Png, alt: 'Materiales recolectados' },
  { src: nenesPng, alt: 'Niños beneficiados' },
  { src: cajaPng,  alt: 'Caja de donaciones' },
  { src: caja2Png, alt: 'Materiales recolectados' },
  { src: nenesPng, alt: 'Niños beneficiados' },
]

// ─── Navbar ────────────────────────────────────────────────────────────────────

function LandingNav() {
  const usuario = obtenerUsuarioSesion()

  return (
    <nav className="ld-nav" aria-label="Navegación principal">
      <div className="ld-nav-inner">
        <Link to="/" className="ld-nav-brand" aria-label="Red de Donaciones — inicio">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>Red de Donaciones</span>
        </Link>

        <div className="ld-nav-links">
          <Link to="/home" className="ld-nav-link">Explorar campañas</Link>
          <Link to="/login" className="ld-nav-cta">
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
        <p className="ld-hero-eyebrow">Guatemala — 2026</p>
        <h1 className="ld-hero-title">
          Sistema de<br />donaciones
        </h1>
        <p className="ld-hero-sub">
          Conectamos personas solidarias con organizaciones verificadas.<br />
          Dona artículos, rastrea el impacto, transforma comunidades.
        </p>
        <div className="ld-hero-actions">
          <Link to="/signup" className="ld-btn-primary">Comenzar ahora</Link>
          <Link to="/login"  className="ld-btn-ghost">Iniciar Sesión →</Link>
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const track = trackRef.current
    if (!track) return

    const N = CAROUSEL_IMAGES.length

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
  }, [])

  const N = CAROUSEL_IMAGES.length
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
            Las organizaciones publican sus necesidades reales.
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
            {CAROUSEL_IMAGES.map((img, i) => (
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
            {CAROUSEL_IMAGES.map((_, i) => (
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

// ─── Footer ─────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="ld-footer">
      <div className="ld-footer-inner">
        <div className="ld-footer-top">
          <div className="ld-footer-brand">
            <p className="ld-footer-name">Red de Donaciones</p>
            <p className="ld-footer-tagline">
              Conectando generosidad con necesidad — Guatemala.
            </p>
          </div>

          <nav className="ld-footer-links" aria-label="Navegación del pie de página">
            <Link to="/signup">Registrarse</Link>
            <Link to="/login">Iniciar Sesión</Link>
            <Link to="/home">Explorar campañas</Link>
          </nav>
        </div>

        <div className="ld-footer-rule" aria-hidden="true" />

        <div className="ld-footer-bottom">
          <span>© 2026 Red de Donaciones. Todos los derechos reservados.</span>
          <span>Sistema de Donaciones — Sprint 2</span>
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
        label="Proceso verificado"
        right={[courierSvg, scholarSvg]}
      />
      <HorizontalCarousel />
      <SectionDivider
        left={[celebrationSvg]}
        label="Impacto real en comunidades"
        right={[helpingSvg]}
      />
      <LandingFooter />
    </div>
  )
}

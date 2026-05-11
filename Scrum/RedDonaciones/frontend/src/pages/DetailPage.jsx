import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { obtenerUsuarioSesion } from '../utils/session'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]

const pageVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: EASE_OUT_EXPO,
      staggerChildren: 0.05,
      delayChildren: 0.08
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE_OUT_EXPO }
  }
}

export default function DetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const prefersReducedMotion = useReducedMotion()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    fecha: '',
    hora: '',
    nota: '',
    cantidad: '1'
  })

  useEffect(() => {
    fetch(`/api/publicaciones/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Error cargando detalle')
        if (!Array.isArray(body)) throw new Error('Respuesta invalida del servidor')
        return body
      })
      .then(res => { setData(res); setLoading(false) })
      .catch(err => { setError('Error cargando detalle'); setLoading(false) })
  }, [id])

  useEffect(() => {
    const usuario = obtenerUsuarioSesion()
    if (!usuario) return
    setForm(prev => ({
      ...prev,
      nombre: usuario.nombre || prev.nombre,
      telefono: usuario.telefono || prev.telefono
    }))
  }, [])

  const info = data[0]
  const items = data.map(item => ({ name: item.articulo, qty: item.descripcion_detalle }))

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const adjustQty = (delta) =>
    setForm(f => ({ ...f, cantidad: String(Math.max(1, Number(f.cantidad) + delta)) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    const usuario = obtenerUsuarioSesion()
    if (!usuario?.id_usuario) {
      navigate('/login', { state: { from: `/detalle/${id}` } })
      return
    }
    if (usuario.rol !== 'donante') {
      setSubmitError('Solo los usuarios con rol donante pueden registrar donaciones')
      return
    }
    const cantidadDonada = Number(form.cantidad)
    if (!Number.isInteger(cantidadDonada) || cantidadDonada <= 0) {
      setSubmitError('La cantidad a donar debe ser un entero mayor a 0')
      return
    }

    setSubmitting(true)

    const descripcionDonacion = [
      `Entrega agendada por ${form.nombre}`,
      `Telefono: ${form.telefono}`,
      `Hora preferida: ${form.hora}`,
      form.nota ? `Nota: ${form.nota}` : null
    ].filter(Boolean).join(' | ')

    const payload = {
      id_donante: usuario.id_usuario,
      id_publicacion: info.id_publicacion,
      descripcion: descripcionDonacion,
      nombre_contacto: form.nombre.trim(),
      telefono_contacto: form.telefono.trim(),
      hora_preferida: form.hora,
      nota: form.nota,
      fecha_donacion: form.fecha,
      cantidad_donada: cantidadDonada
    }

    try {
      const response = await fetch('/api/donaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || 'No se pudo registrar la donacion')
      setSubmitSuccess(true)
      setTimeout(() => navigate('/donaciones'), 1400)
    } catch (err) {
      setSubmitError(err.message || 'No se pudo registrar la donacion')
    } finally {
      setSubmitting(false)
    }
  }

  const pct = info && info.cantidad_necesaria > 0
    ? Math.min(100, Math.round((info.cantidad_recibida / info.cantidad_necesaria) * 100))
    : 0

  return (
    <motion.div
      className="dp-page"
      variants={prefersReducedMotion ? undefined : pageVariants}
      initial="hidden"
      animate="visible"
    >
      {loading ? (
        <div className="empty-box">Cargando detalle...</div>
      ) : error ? (
        <div className="empty-box">{error}</div>
      ) : !info ? (
        <div className="empty-box">No encontrado</div>
      ) : (
        <>
      <motion.button variants={itemVariants} className="dp-back" onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver
      </motion.button>

      <motion.div variants={itemVariants} className="dp-layout">

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="dp-left">

          {/* Hero */}
          <div className="dp-hero">
            <span className="dp-chip">
              <span className="dp-chip-dot" />
              {info.categoria}
            </span>
            <h1 className="dp-title">{info.titulo}</h1>
            <p className="dp-desc">{info.descripcion}</p>
          </div>

          {/* Stats */}
          <div className="dp-stats">
            <div className="dp-stat">
              <span className="dp-stat-label">Organizacion</span>
              <span className="dp-stat-value">{info.organizacion}</span>
            </div>
            <div className="dp-stat">
              <span className="dp-stat-label">Estado</span>
              <span className="dp-stat-value dp-stat-active">{info.estado}</span>
            </div>
            <div className="dp-stat">
              <span className="dp-stat-label">Horario</span>
              <span className="dp-stat-value">Coordinar con la org.</span>
            </div>
            <div className="dp-stat">
              <span className="dp-stat-label">Progreso</span>
              <span className="dp-stat-value">{pct}%</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="dp-progress-wrap">
            <div className="dp-progress-header">
              <span>Progreso de la campaña</span>
              <span className="dp-progress-pct">{pct}%</span>
            </div>
            <div className="dp-progress-track">
              <div className="dp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="dp-progress-footer">
              <span>{info.cantidad_recibida} recibidos</span>
              <span>{info.cantidad_necesaria} necesarios</span>
            </div>
          </div>

          {/* Items */}
          <div className="dp-section">
            <div className="dp-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Articulos necesitados
            </div>
            <div className="dp-items">
              {items.map((item, i) => (
                <div className="dp-item" key={i}>
                  <span className="dp-item-dot">{i + 1}</span>
                  <span className="dp-item-name">{item.name}</span>
                  <span className="dp-item-qty">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ubicacion */}
          <div className="dp-section">
            <div className="dp-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Ubicacion
            </div>
            <div className="dp-map">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Ver en mapa</span>
            </div>
            <p className="dp-address">{info?.direccion || 'Direccion no disponible'}</p>
          </div>
        </div>

        {/* ── COLUMNA DERECHA — FORM STICKY ── */}
        <div className="dp-right">
          <div className="dp-form-card">

            {submitSuccess ? (
              <div className="dp-success">
                <div className="dp-success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3>Donacion registrada</h3>
                <p>Te redirigimos a tu historial...</p>
              </div>
            ) : (
              <>
                <div className="dp-form-header">
                  <h2>Agendar entrega</h2>
                  <p>Completa los datos para coordinar tu donacion</p>
                </div>

                <div className="dp-form-body">
                <form onSubmit={handleSubmit} noValidate>

                  {/* Contacto */}
                  <div className="dp-form-group">
                    <div className="dp-form-group-title">Contacto</div>
                    <div className="dp-field">
                      <label className="dp-label">Nombre completo</label>
                      <input
                        className="dp-input"
                        name="nombre"
                        placeholder="Tu nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="dp-field">
                      <label className="dp-label">Telefono</label>
                      <input
                        className="dp-input"
                        name="telefono"
                        placeholder="5555-0000"
                        value={form.telefono}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Cantidad */}
                  <div className="dp-form-group">
                    <div className="dp-form-group-title">Cantidad a donar</div>
                    <div className="dp-qty-control">
                      <button type="button" className="dp-qty-btn" onClick={() => adjustQty(-1)}>−</button>
                      <input
                        className="dp-qty-input"
                        type="number"
                        name="cantidad"
                        min="1"
                        value={form.cantidad}
                        onChange={handleChange}
                        required
                      />
                      <button type="button" className="dp-qty-btn" onClick={() => adjustQty(1)}>+</button>
                    </div>
                  </div>

                  {/* Fecha y hora */}
                  <div className="dp-form-group">
                    <div className="dp-form-group-title">Fecha y hora</div>
                    <div className="dp-row">
                      <div className="dp-field">
                        <label className="dp-label">Fecha de entrega</label>
                        <input
                          className="dp-input"
                          type="date"
                          name="fecha"
                          value={form.fecha}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="dp-field">
                        <label className="dp-label">Hora preferida</label>
                        <select className="dp-input" name="hora" value={form.hora} onChange={handleChange} required>
                          <option value="">Selecciona</option>
                          <option value="08:00">08:00</option>
                          <option value="09:00">09:00</option>
                          <option value="10:00">10:00</option>
                          <option value="11:00">11:00</option>
                          <option value="13:00">13:00</option>
                          <option value="14:00">14:00</option>
                          <option value="15:00">15:00</option>
                          <option value="16:00">16:00</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Nota */}
                  <div className="dp-field">
                    <label className="dp-label">Nota adicional <span className="dp-optional">(opcional)</span></label>
                    <textarea
                      className="dp-input dp-textarea"
                      name="nota"
                      placeholder="Ej: llevaré 3 bolsas, necesito ayuda para bajarlas..."
                      value={form.nota}
                      onChange={handleChange}
                    />
                  </div>

                  {submitError && <div className="dp-error">{submitError}</div>}

                  <button type="submit" className="dp-submit" disabled={submitting}>
                    {submitting ? (
                      <span className="dp-submit-loading">
                        <span className="dp-spinner" />
                        Registrando...
                      </span>
                    ) : 'Confirmar entrega'}
                  </button>
                </form>
                </div>
              </>
            )}
          </div>
        </div>

      </motion.div>
        </>
      )}
    </motion.div>
  )
}

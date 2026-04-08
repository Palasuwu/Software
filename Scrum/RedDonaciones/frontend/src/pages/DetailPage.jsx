import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS_POR_ORGANIZACION = {
  default: [
    { name: 'Ropa de invierno', qty: 'Tallas 6–12' },
    { name: 'Abrigos', qty: 'Cualquier talla' },
    { name: 'Bufandas y gorros', qty: 'Todos los tamaños' },
  ],
  asilo: [
    { name: 'Sábanas', qty: '2 o más juegos' },
    { name: 'Frazadas', qty: 'Buen estado' },
    { name: 'Artículos de higiene', qty: 'Cualquier cantidad' },
  ],
}

export default function DetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { org } = location.state || {}

  const [form, setForm] = useState({ nombre: '', telefono: '', fecha: '', hora: '', nota: '' })
  const [enviado, setEnviado] = useState(false)

  const items = org?.isAsilo ? ITEMS_POR_ORGANIZACION.asilo : ITEMS_POR_ORGANIZACION.default

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="detail-page fade-in" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', border: '2px solid var(--primary-muted)', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.8rem', marginBottom: 10 }}>
          ¡Entrega agendada!
        </h2>
        <p style={{ color: 'var(--text-soft)', lineHeight: 1.65, marginBottom: 28, fontWeight: 300 }}>
          Gracias, <strong>{form.nombre || 'donante'}</strong>. Tu aporte a{' '}
          <em>{org?.title || 'la organización'}</em> está confirmado para el {form.fecha} a las {form.hora}.
        </p>
        <button
          className="btn-confirmar"
          style={{ maxWidth: 320, margin: '0 auto' }}
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="detail-page fade-in">
      {/* Back */}
      <button className="detail-back" onClick={() => navigate(-1)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-chip-row">
          <span className="card-chip">
            <span className="card-chip-dot" />
            {org?.category || 'Donación'}
          </span>
          {org?.urgent && (
            <span className="card-urgent">
              <span className="urgent-dot" />
              {org.urgent}
            </span>
          )}
        </div>
        <h1 className="detail-title">{org?.title || 'Organización'}</h1>
        <p className="detail-subtitle">
          {org?.description || 'Esta organización necesita tu apoyo. Cada donación hace una diferencia real en la vida de personas vulnerables.'}
        </p>
      </div>

      {/* Info grid */}
      <div className="detail-grid">
        <div className="detail-card">
          <div className="detail-card-label">Horario de recepción</div>
          <div className="detail-card-value">Lun – Vie<br />8:00 – 17:00</div>
        </div>
        <div className="detail-card">
          <div className="detail-card-label">Contacto</div>
          <div className="detail-card-value">+502 2234-5678</div>
        </div>
        <div className="detail-card">
          <div className="detail-card-label">Estado</div>
          <div className="detail-card-value" style={{ color: 'var(--success)' }}>Activa ✓</div>
        </div>
        <div className="detail-card">
          <div className="detail-card-label">Donantes este mes</div>
          <div className="detail-card-value">34 personas</div>
        </div>
      </div>

      {/* Artículos necesitados */}
      <div className="detail-section">
        <div className="detail-section-title">Artículos necesitados</div>
        <div className="items-list">
          {items.map((item, i) => (
            <div className="item-row" key={i}>
              <div className="item-icon">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
              </div>
              <span className="item-name">{item.name}</span>
              <span className="item-qty">{item.qty}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="detail-section">
        <div className="detail-section-title">Ubicación</div>
        <div className="map-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Ver en mapa</span>
        </div>
        <div className="map-address">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {org?.address || '6a Av. 12-31, Zona 1, Ciudad de Guatemala'}
        </div>
      </div>

      {/* Formulario */}
      <div className="detail-section">
        <div className="detail-section-title">Agendar entrega</div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-input"
                name="nombre"
                placeholder="Tu nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                name="telefono"
                placeholder="5555-0000"
                value={form.telefono}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Fecha de entrega</label>
              <input
                className="form-input"
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Hora preferida</label>
              <select
                className="form-select"
                name="hora"
                value={form.hora}
                onChange={handleChange}
                required
              >
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
          <div className="form-field">
            <label className="form-label">Nota adicional (opcional)</label>
            <textarea
              className="form-textarea"
              name="nota"
              placeholder="Ej: llevaré 3 bolsas, necesito ayuda para bajarlas..."
              value={form.nota}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn-confirmar">
            Confirmar entrega
          </button>
        </form>
      </div>
    </div>
  )
}
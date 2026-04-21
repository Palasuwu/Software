import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const USER_STORAGE_KEY = 'usuario_actual'

function obtenerUsuarioSesion() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export default function DetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      .then(res => res.json())
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Error cargando detalle')
        setLoading(false)
      })
  }, [id])

  const info = data[0]

  const items = data.map(item => ({
    name: item.articulo,
    qty: item.descripcion_detalle,
    cantidad: item.cantidad
  }))

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    const usuario = obtenerUsuarioSesion()
    if (!usuario?.id_usuario) {
      setSubmitError('Debes iniciar sesion para registrar una donacion')
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
      fecha_donacion: form.fecha,
      cantidad_donada: cantidadDonada
    }

    try {
      const response = await fetch('/api/donaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo registrar la donacion')
      }

      navigate('/donaciones')
    } catch (submitErr) {
      setSubmitError(submitErr.message || 'No se pudo registrar la donacion')
    } finally {
      setSubmitting(false)
    }
  }

  // Estados de carga
  if (loading) return <div className="empty-box">Cargando detalle...</div>
  if (error) return <div className="empty-box">{error}</div>
  if (!info) return <div className="empty-box">No encontrado</div>

  return (
    <div className="detail-page detail-page-figma fade-in">
      <button className="detail-back detail-back-figma" onClick={() => navigate(-1)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver
      </button>

      <div className="detail-hero detail-hero-figma">
        <div className="detail-chip-row">
          <span className="card-chip">
            <span className="card-chip-dot" />
            {info.categoria}
          </span>
        </div>

        <h1 className="detail-title detail-title-figma">
          {info.titulo}
        </h1>

        <p className="detail-subtitle detail-subtitle-figma">
          {info.descripcion}
        </p>
      </div>

      <div className="detail-grid detail-grid-figma">
        <div className="detail-card detail-card-figma">
          <div className="detail-card-label">Horario de recepción</div>
          <div className="detail-card-value">Lun – Vie<br />8:00 – 17:00</div>
        </div>

        <div className="detail-card detail-card-figma">
          <div className="detail-card-label">Contacto</div>
          <div className="detail-card-value">+502 2234-5678</div>
        </div>

        <div className="detail-card detail-card-figma">
          <div className="detail-card-label">Estado</div>
          <div className="detail-card-value" style={{ color: 'var(--success)' }}>
            {info.estado} ✓
          </div>
        </div>

        <div className="detail-card detail-card-figma">
          <div className="detail-card-label">Progreso</div>
          <div className="detail-card-value">
            {info.cantidad_necesaria > 0
              ? Math.round((info.cantidad_recibida / info.cantidad_necesaria) * 100)
              : 0}%
          </div>
        </div>
      </div>

      <div className="detail-section detail-section-figma">
        <div className="detail-section-title">Artículos necesitados</div>

        <div className="items-list">
          {items.map((item, i) => (
            <div className="item-row item-row-figma" key={i}>
              <div className="item-icon item-icon-figma">
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'inline-block'
                }} />
              </div>
              <span className="item-name">{item.name}</span>
              <span className="item-qty item-qty-figma">{item.qty}</span>
            </div>
          ))}
        </div>
      </div>


      <div className="detail-section detail-section-figma">
        <div className="detail-section-title">Ubicación</div>

        <div className="map-placeholder map-placeholder-figma">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Ver en mapa</span>
        </div>

        <div className="map-address">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {info?.direccion || '6a Av. 12-31, Zona 1, Ciudad de Guatemala'}
        </div>
      </div>

      <div className="detail-section detail-section-figma">
        <div className="detail-section-title">Agendar entrega</div>

        <form className="form-grid form-grid-figma" onSubmit={handleSubmit}>
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
              <label className="form-label">Cantidad a donar</label>
              <input
                className="form-input"
                type="number"
                name="cantidad"
                min="1"
                value={form.cantidad}
                onChange={handleChange}
                required
              />
            </div>

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

          {submitError && <div className="error-box">{submitError}</div>}

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

          <button type="submit" className="btn-confirmar btn-confirmar-figma" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Confirmar entrega'}
          </button>
        </form>
      </div>
    </div>
  )
}
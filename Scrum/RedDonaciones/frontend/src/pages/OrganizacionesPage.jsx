import React from 'react'
import { apiFetch, obtenerUsuarioSesion } from '../utils/session'

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  direccion: '',
  telefono: '',
  correo: '',
  estado_verificacion: 'pendiente'
}

function normalizarError(body) {
  if (body?.campos) return Object.values(body.campos).join('. ')
  return body?.error || 'No se pudo completar la accion'
}

function estadoLabel(estado) {
  const labels = { pendiente: 'Pendiente', verificada: 'Verificada', rechazada: 'Rechazada', inactiva: 'Inactiva' }
  return labels[estado] || estado || 'Sin estado'
}

function IconOrg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconContact() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2.83h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.72-.72a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.27 18" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function OrganizacionesPage() {
  const usuario = obtenerUsuarioSesion()
  const isAdmin = usuario?.rol === 'administrador'
  const [organizaciones, setOrganizaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const cargarOrganizaciones = React.useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/organizaciones')
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Error al cargar organizaciones')
        if (!Array.isArray(body)) throw new Error('Respuesta invalida del servidor')
        return body
      })
      .then((data) => { setOrganizaciones(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  React.useEffect(() => { cargarOrganizaciones() }, [cargarOrganizaciones])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setMessage('')
    setError(null)
  }

  const handleEdit = (org) => {
    setEditingId(org.id_organizacion)
    setForm({
      nombre: org.nombre || '',
      descripcion: org.descripcion || '',
      direccion: org.direccion || '',
      telefono: org.telefono || '',
      correo: org.correo || '',
      estado_verificacion: org.estado_verificacion || 'pendiente'
    })
    setMessage('')
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError(null)
    try {
      const url = editingId ? `/api/organizaciones/${editingId}` : '/api/organizaciones'
      const response = await apiFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(normalizarError(body))
      setMessage(editingId ? 'Organizacion actualizada correctamente' : 'Organizacion creada correctamente')
      setEditingId(null)
      setForm(EMPTY_FORM)
      cargarOrganizaciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (org) => {
    setSaving(true)
    setMessage('')
    setError(null)
    try {
      const response = await apiFetch(`/api/organizaciones/${org.id_organizacion}`, { method: 'DELETE' })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(normalizarError(body))
      setMessage('Organizacion desactivada')
      cargarOrganizaciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in op-page">

      {/* Header */}
      <div className="op-header">
        <div className="op-header-icon"><IconOrg /></div>
        <div>
          <span className="op-kicker">Administracion</span>
          <h1 className="op-title">Organizaciones</h1>
          <p className="op-subtitle">
            Revisa, registra y mantene actualizada la informacion de las organizaciones.
          </p>
        </div>
      </div>

      {message && <div className="op-success-msg">{message}</div>}

      {/* Formulario */}
      {isAdmin && (
        <div className="op-form-card">
          <div className="op-form-header">
            <div>
              <h2>{editingId ? 'Editar organizacion' : 'Nueva organizacion'}</h2>
              <p>Los datos se usan en publicaciones, perfiles de intermediarios y vistas publicas.</p>
            </div>
          </div>

          <div className="op-form-body">
            <form onSubmit={handleSubmit} noValidate>

              {/* Seccion identidad */}
              <div className="op-form-group">
                <div className="op-form-group-title">Identidad</div>
                <div className="op-row">
                  <div className="op-field">
                    <label className="op-label">Nombre de la organizacion</label>
                    <input className="op-input" name="nombre" placeholder="Ej: Hogar La Esperanza" value={form.nombre} onChange={handleChange} required />
                  </div>
                  <div className="op-field">
                    <label className="op-label">Estado de verificacion</label>
                    <select className="op-input" name="estado_verificacion" value={form.estado_verificacion} onChange={handleChange}>
                      <option value="pendiente">Pendiente</option>
                      <option value="verificada">Verificada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="inactiva">Inactiva</option>
                    </select>
                  </div>
                </div>
                <div className="op-field">
                  <label className="op-label">Descripcion</label>
                  <textarea className="op-input op-textarea" name="descripcion" placeholder="Describe brevemente la mision de la organizacion..." value={form.descripcion} onChange={handleChange} />
                </div>
              </div>

              {/* Seccion contacto */}
              <div className="op-form-group">
                <div className="op-form-group-title">Contacto y ubicacion</div>
                <div className="op-row">
                  <div className="op-field">
                    <label className="op-label">Telefono</label>
                    <input className="op-input" name="telefono" placeholder="5555-0000" value={form.telefono} onChange={handleChange} required />
                  </div>
                  <div className="op-field">
                    <label className="op-label">Correo electronico</label>
                    <input className="op-input" type="email" name="correo" placeholder="contacto@org.com" value={form.correo} onChange={handleChange} required />
                  </div>
                </div>
                <div className="op-field">
                  <label className="op-label">Direccion</label>
                  <input className="op-input" name="direccion" placeholder="Ej: Zona Centro, Ciudad de Guatemala" value={form.direccion} onChange={handleChange} required />
                </div>
              </div>

              {error && <div className="op-error">{error}</div>}

              <div className="op-form-actions">
                <button type="submit" className="op-submit" disabled={saving}>
                  {saving
                    ? <span className="op-submit-loading"><span className="op-spinner" />Guardando...</span>
                    : editingId ? 'Guardar cambios' : 'Crear organizacion'
                  }
                </button>
                {editingId && (
                  <button type="button" className="op-cancel" onClick={handleCancel} disabled={saving}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="op-readonly-note">
          Solo administradores pueden crear o editar organizaciones.
        </div>
      )}

      {/* Lista */}
      <div className="op-list">
        <div className="op-list-header">
          <h2>Organizaciones registradas</h2>
          <span className="op-list-count">{organizaciones.length}</span>
        </div>

        {loading && <div className="empty-box">Cargando organizaciones...</div>}
        {!loading && organizaciones.length === 0 && <div className="empty-box">No hay organizaciones registradas.</div>}

        {!loading && organizaciones.length > 0 && (
          <div className="op-cards">
            {organizaciones.map((org) => (
              <article className="op-card" key={org.id_organizacion}>
                <div className="op-card-top">
                  <div className="op-card-icon"><IconOrg /></div>
                  <div className="op-card-head">
                    <h3>{org.nombre}</h3>
                    <span className={`op-status op-status-${org.estado_verificacion}`}>
                      {estadoLabel(org.estado_verificacion)}
                    </span>
                  </div>
                </div>

                <p className="op-card-desc">{org.descripcion || 'Sin descripcion registrada'}</p>

                <div className="op-card-meta">
                  <span><IconLocation />{org.direccion || 'Sin direccion'}</span>
                  <span><IconContact />{org.telefono || 'Sin telefono'}</span>
                  <span><IconMail />{org.correo || 'Sin correo'}</span>
                </div>

                {isAdmin && (
                  <div className="op-card-actions">
                    <button type="button" className="op-btn-edit" onClick={() => handleEdit(org)} disabled={saving}>
                      Editar
                    </button>
                    <button type="button" className="op-btn-deactivate" onClick={() => handleDeactivate(org)} disabled={saving}>
                      Desactivar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizacionesPage

import React from 'react'
import { obtenerUsuarioSesion } from '../utils/session'

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  direccion: '',
  telefono: '',
  correo: '',
  estado_verificacion: 'pendiente'
}

function normalizarError(body) {
  if (body?.campos) {
    return Object.values(body.campos).join('. ')
  }
  return body?.error || 'No se pudo completar la accion'
}

function estadoLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    inactiva: 'Inactiva'
  }

  return labels[estado] || estado || 'Sin estado'
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
        if (!res.ok) {
          throw new Error(body?.error || 'Error al cargar organizaciones')
        }
        if (!Array.isArray(body)) {
          throw new Error('Respuesta invalida del servidor')
        }
        return body
      })
      .then((data) => {
        setOrganizaciones(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  React.useEffect(() => {
    cargarOrganizaciones()
  }, [cargarOrganizaciones])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
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
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
    setError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError(null)

    try {
      const url = editingId ? `/api/organizaciones/${editingId}` : '/api/organizaciones'
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(normalizarError(body))
      }

      setMessage(editingId ? 'Organizacion actualizada' : 'Organizacion creada')
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
      const response = await fetch(`/api/organizaciones/${org.id_organizacion}`, {
        method: 'DELETE'
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(normalizarError(body))
      }
      setMessage('Organizacion desactivada')
      cargarOrganizaciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in org-admin-page">
      <header className="org-admin-header">
        <div>
          <p className="page-kicker">Administracion</p>
          <h1 className="page-title">Organizaciones</h1>
          <p className="page-subtitle">
            Revisa organizaciones registradas, valida su estado y manten actualizada la informacion de contacto.
          </p>
        </div>
      </header>

      {message && <div className="loading-box">{message}</div>}
      {error && <div className="error-box">{error}</div>}

      {isAdmin && (
        <section className="org-admin-form-card">
          <div className="signup-card-head">
            <h2>{editingId ? 'Editar organizacion' : 'Nueva organizacion'}</h2>
            <p>Los campos se usan en publicaciones, perfiles de intermediarios y vistas publicas.</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="org-nombre">Nombre</label>
                <input id="org-nombre" className="form-input" name="nombre" value={form.nombre} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="org-estado">Estado</label>
                <select
                  id="org-estado"
                  className="form-select"
                  name="estado_verificacion"
                  value={form.estado_verificacion}
                  onChange={handleChange}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="verificada">Verificada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="org-descripcion">Descripcion</label>
              <textarea
                id="org-descripcion"
                className="form-textarea"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="org-direccion">Direccion</label>
                <input id="org-direccion" className="form-input" name="direccion" value={form.direccion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="org-telefono">Telefono</label>
                <input id="org-telefono" className="form-input" name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="org-correo">Correo</label>
              <input id="org-correo" className="form-input" name="correo" value={form.correo} onChange={handleChange} />
            </div>

            <div className="org-admin-actions">
              <button type="submit" className="btn-confirmar" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear organizacion'}
              </button>
              {editingId && (
                <button type="button" className="profile-cancel-button" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {!isAdmin && (
        <section className="auth-cta-panel">
          <p>Estas viendo el directorio publico. Solo usuarios administradores pueden crear o editar organizaciones.</p>
        </section>
      )}

      <section className="org-admin-list">
        {loading && <div className="empty-box">Cargando organizaciones...</div>}
        {!loading && !error && organizaciones.length === 0 && <div className="empty-box">No hay organizaciones</div>}

        {!loading && organizaciones.length > 0 && (
          <div className="org-admin-table">
            {organizaciones.map((org) => (
              <article className="org-admin-row" key={org.id_organizacion}>
                <div>
                  <div className="org-admin-row-title">
                    <h3>{org.nombre}</h3>
                    <span className={`org-status org-status-${org.estado_verificacion}`}>
                      {estadoLabel(org.estado_verificacion)}
                    </span>
                  </div>
                  <p>{org.descripcion || 'Sin descripcion registrada'}</p>
                  <div className="org-admin-meta">
                    <span>{org.direccion || 'Sin direccion'}</span>
                    <span>{org.telefono || 'Sin telefono'}</span>
                    <span>{org.correo || 'Sin correo'}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="org-admin-row-actions">
                    <button type="button" className="profile-edit-button" onClick={() => handleEdit(org)} disabled={saving}>
                      Editar
                    </button>
                    <button type="button" className="profile-cancel-button" onClick={() => handleDeactivate(org)} disabled={saving}>
                      Desactivar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default OrganizacionesPage

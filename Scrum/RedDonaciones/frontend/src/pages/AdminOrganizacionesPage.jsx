import React from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../utils/api'
import Spinner from '../components/Spinner'
import ErrorView from '../components/ErrorView'

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  direccion: '',
  telefono: '',
  correo: '',
  estado_verificacion: 'pendiente'
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_REGEX = /^[0-9+\-()\s]{8,20}$/
const ESTADOS_VALIDOS = ['pendiente', 'verificada', 'rechazada', 'inactiva', 'archivada']

function cleanSpaces(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function countDigits(value) {
  return (value.match(/\d/g) || []).length
}

function buildPayload(form) {
  return {
    nombre: cleanSpaces(form.nombre),
    descripcion: cleanSpaces(form.descripcion),
    direccion: cleanSpaces(form.direccion),
    telefono: form.telefono.trim(),
    correo: form.correo.trim().toLowerCase(),
    estado_verificacion: form.estado_verificacion
  }
}

function validateForm(form) {
  const payload = buildPayload(form)
  const errors = {}

  if (payload.nombre.length < 3) errors.nombre = 'Ingresa al menos 3 caracteres'
  if (payload.descripcion.length < 10) errors.descripcion = 'Ingresa una descripcion mas completa'
  if (payload.direccion.length < 8) errors.direccion = 'Ingresa una direccion mas especifica'
  if (!PHONE_REGEX.test(payload.telefono) || countDigits(payload.telefono) < 8) errors.telefono = 'Ingresa un telefono valido'
  if (!EMAIL_REGEX.test(payload.correo)) errors.correo = 'Ingresa un correo valido'
  if (!ESTADOS_VALIDOS.includes(payload.estado_verificacion)) errors.estado_verificacion = 'Selecciona un estado valido'

  return errors
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

function AdminOrganizacionesPage() {
  const [organizaciones, setOrganizaciones] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState({})

  const cargarOrganizaciones = React.useCallback(() => {
    setLoading(true)
    setError(null)

    apiGet('/api/organizaciones?vista=admin')
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
    setFieldErrors((previous) => {
      if (!previous[name]) return previous
      const next = { ...previous }
      delete next[name]
      return next
    })
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
    setFieldErrors({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
    setError(null)
    setFieldErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError(null)

    try {
      const errors = validateForm(form)
      setFieldErrors(errors)
      if (Object.keys(errors).length > 0) return

      const payload = buildPayload(form)
      const url = editingId ? `/api/organizaciones/${editingId}` : '/api/organizaciones'
      if (editingId) {
        await apiPut(url, payload)
      } else {
        await apiPost(url, payload)
      }

      setMessage(editingId ? 'Organizacion actualizada' : 'Organizacion creada')
      setEditingId(null)
      setForm(EMPTY_FORM)
      cargarOrganizaciones()
    } catch (err) {
      if (err.body?.campos) {
        setFieldErrors(err.body.campos)
      } else {
        setError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (org) => {
    setSaving(true)
    setMessage('')
    setError(null)

    try {
      await apiDelete(`/api/organizaciones/${org.id_organizacion}`)
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
      {error && <ErrorView message={error} />}

      <section className="org-admin-form-card">
          <div className="signup-card-head">
            <h2>{editingId ? 'Editar organización' : 'Nueva organización'}</h2>
            <p>Los campos se usan en publicaciones, perfiles de intermediarios y vistas públicas.</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="org-nombre">Nombre</label>
                <input id="org-nombre" className={`form-input ${fieldErrors.nombre ? 'form-input-invalid' : ''}`} name="nombre" value={form.nombre} onChange={handleChange} />
                {fieldErrors.nombre && <span className="form-error-text">{fieldErrors.nombre}</span>}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="org-estado">Estado</label>
                <select
                  id="org-estado"
                  className={`form-select ${fieldErrors.estado_verificacion ? 'form-input-invalid' : ''}`}
                  name="estado_verificacion"
                  value={form.estado_verificacion}
                  onChange={handleChange}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="verificada">Verificada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="inactiva">Inactiva</option>
                  <option value="archivada">Archivada</option>
                </select>
                {fieldErrors.estado_verificacion && <span className="form-error-text">{fieldErrors.estado_verificacion}</span>}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="org-descripcion">Descripcion</label>
              <textarea
                id="org-descripcion"
                className={`form-textarea ${fieldErrors.descripcion ? 'form-input-invalid' : ''}`}
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
              />
              {fieldErrors.descripcion && <span className="form-error-text">{fieldErrors.descripcion}</span>}
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="org-direccion">Direccion</label>
                <input id="org-direccion" className={`form-input ${fieldErrors.direccion ? 'form-input-invalid' : ''}`} name="direccion" value={form.direccion} onChange={handleChange} />
                {fieldErrors.direccion && <span className="form-error-text">{fieldErrors.direccion}</span>}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="org-telefono">Telefono</label>
                <input id="org-telefono" className={`form-input ${fieldErrors.telefono ? 'form-input-invalid' : ''}`} name="telefono" value={form.telefono} onChange={handleChange} />
                {fieldErrors.telefono && <span className="form-error-text">{fieldErrors.telefono}</span>}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="org-correo">Correo</label>
              <input id="org-correo" className={`form-input ${fieldErrors.correo ? 'form-input-invalid' : ''}`} name="correo" value={form.correo} onChange={handleChange} />
              {fieldErrors.correo && <span className="form-error-text">{fieldErrors.correo}</span>}
            </div>

            <div className="org-admin-actions">
              <button type="submit" className="btn-confirmar" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear organización'}
              </button>
              {editingId && (
                <button type="button" className="profile-cancel-button" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
      </section>

      <section className="org-admin-list">
        {loading && <Spinner message="Cargando organizaciones..." />}
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

                <div className="org-admin-row-actions">
                  <button type="button" className="profile-edit-button" onClick={() => handleEdit(org)} disabled={saving}>
                    Editar
                  </button>
                  <button type="button" className="profile-cancel-button" onClick={() => handleDeactivate(org)} disabled={saving}>
                    Desactivar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminOrganizacionesPage

// Selección de ubicación heredada o propia para las campañas de ambos paneles.
import React from 'react'
import CoordinatesFields from './CoordinatesFields'

export default function CampaignLocationFields({ form, errors = {}, onChange, organizacion, disabled = false }) {
    const id = React.useId()
    const propia = form.ubicacion_modo === 'propia'
    const direccion = organizacion && [organizacion.direccion, organizacion.zona && `Zona ${organizacion.zona}`, organizacion.municipio, organizacion.departamento].filter(Boolean).join(', ')
    return (
        <>
            <div className="form-field">
                <label className="form-label" htmlFor={`${id}-modo`}>Ubicación de la campaña</label>
                <select id={`${id}-modo`} name="ubicacion_modo" className="form-select" value={form.ubicacion_modo || 'organizacion'} onChange={onChange} disabled={disabled}>
                    <option value="organizacion">Usar ubicación de la organización</option>
                    <option value="propia">Usar una ubicación propia</option>
                </select>
            </div>
            {propia ? (
                <>
                    {[
                        { name: 'departamento', label: 'Departamento', maxLength: 200 },
                        { name: 'municipio', label: 'Municipio', maxLength: 200 },
                        { name: 'zona', label: 'Zona', maxLength: 2 },
                        { name: 'direccion_detalle', label: 'Dirección detallada', maxLength: 300 }
                    ].map(({ name, label, maxLength }) => (
                        <div className="form-field" key={name}>
                            <label className="form-label" htmlFor={`${id}-${name}`}>{label}</label>
                            <input
                                id={`${id}-${name}`}
                                className={`form-input ${errors[name] ? 'form-input-invalid' : ''}`}
                                name={name}
                                value={form[name] ?? ''}
                                onChange={onChange}
                                maxLength={maxLength}
                                disabled={disabled}
                                aria-invalid={!!errors[name]}
                                aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
                            />
                            {errors[name] && <span id={`${id}-${name}-error`} className="form-error-text" role="alert">{errors[name]}</span>}
                        </div>
                    ))}
                    <CoordinatesFields form={form} errors={errors} onChange={onChange} disabled={disabled} />
                    <p className="admin-table-muted">Si omites las coordenadas, el backend utiliza las de la organización como referencia.</p>
                </>
            ) : (
                <div className="form-field">
                    <p className="admin-table-muted">La campaña utilizará la dirección y las coordenadas actuales de su organización.</p>
                    {direccion && <p>{direccion}</p>}
                    {organizacion?.latitud != null && organizacion?.longitud != null && (
                        <p className="admin-table-muted">Coordenadas: {organizacion.latitud}, {organizacion.longitud}</p>
                    )}
                </div>
            )}
        </>
    )
}

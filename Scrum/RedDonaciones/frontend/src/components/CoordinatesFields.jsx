// Campos de coordenadas compartidos por los formularios de ubicación.
// Los valores y errores los administra el contenedor de cada formulario.
import React from 'react'

export default function CoordinatesFields({ form, errors = {}, onChange, disabled = false }) {
    const id = React.useId()
    return (
        <>
            <p className="admin-table-muted" id={`${id}-help`}>
                Coordenadas opcionales. Ingresa ambas con punto decimal o deja las dos vacías.
                Puedes copiarlas desde Google Maps haciendo clic derecho sobre el lugar.
                {' '}Latitud primero, longitud después. No ingreses enlaces ni símbolos de grados.
            </p>
            <div className="form-row">
                {[
                    { name: 'latitud', label: 'Latitud', min: -90, max: 90, placeholder: '14.6349000' },
                    { name: 'longitud', label: 'Longitud', min: -180, max: 180, placeholder: '-90.5069000' }
                ].map(({ name, label, min, max, placeholder }) => (
                    <div className="form-field" key={name}>
                        <label className="form-label" htmlFor={`${id}-${name}`}>{label}</label>
                        <input
                            id={`${id}-${name}`}
                            className={`form-input ${errors[name] ? 'form-input-invalid' : ''}`}
                            type="number"
                            step="any"
                            min={min}
                            max={max}
                            name={name}
                            value={form[name] ?? ''}
                            placeholder={placeholder}
                            onChange={onChange}
                            disabled={disabled}
                            aria-invalid={!!errors[name]}
                            aria-describedby={`${id}-help${errors[name] ? ` ${id}-${name}-error` : ''}`}
                        />
                        {errors[name] && <span id={`${id}-${name}-error`} className="form-error-text" role="alert">{errors[name]}</span>}
                    </div>
                ))}
            </div>
        </>
    )
}

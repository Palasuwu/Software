import React from 'react'

export default function AddressFields({ form, errors = {}, onChange, disabled = false, directionName = 'direccion' }) {
    const id = React.useId()
    const campo = (name, label, maxLength, placeholder) => (
        <div className="form-field" key={name}>
            <label className="form-label" htmlFor={`${id}-${name}`}>{label}</label>
            <input
                id={`${id}-${name}`}
                className={`form-input ${errors[name] ? 'form-input-invalid' : ''}`}
                name={name}
                value={form[name] ?? ''}
                onChange={onChange}
                maxLength={maxLength}
                placeholder={placeholder}
                inputMode={name === 'zona' ? 'numeric' : undefined}
                disabled={disabled}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
            />
            {errors[name] && <span id={`${id}-${name}-error`} className="form-error-text" role="alert">{errors[name]}</span>}
        </div>
    )

    return (
        <>
            <div className="form-row">
                {campo('departamento', 'Departamento', 200, 'Guatemala')}
                {campo('municipio', 'Municipio', 200, 'Mixco')}
                {campo('zona', 'Zona', 2, '4')}
            </div>
            {campo(directionName, directionName === 'direccion' ? 'Dirección' : 'Dirección detallada', 300, 'Calle, avenida, número y referencia')}
        </>
    )
}

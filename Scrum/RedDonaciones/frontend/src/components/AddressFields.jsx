import React from 'react'
import municipios from '../utils/municipiosGuatemala.json'

export default function AddressFields({ form, errors = {}, onChange, disabled = false, directionName = 'direccion' }) {
    const id = React.useId()
    const departamentos = Object.keys(municipios)
    const disponibles = municipios[form.departamento] || []
    const cambiar = (event) => {
        onChange(event)
        // Mantiene el contrato name/value de los formularios existentes.
        if (event.target.name === 'departamento') {
            onChange({ target: { name: 'municipio', value: '' } })
            onChange({ target: { name: 'zona', value: '' } })
        } else if (event.target.name === 'municipio') {
            onChange({ target: { name: 'zona', value: '' } })
        }
    }
    const seleccion = (name, label, opciones, bloqueado = false) => (
        <div className="form-field">
            <label className="form-label" htmlFor={`${id}-${name}`}>{label}</label>
            <select
                id={`${id}-${name}`}
                className={`form-select ${errors[name] ? 'form-input-invalid' : ''}`}
                name={name}
                value={form[name] ?? ''}
                title={form[name] || undefined}
                onChange={cambiar}
                disabled={disabled || bloqueado}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
            >
                <option value="">{bloqueado ? 'Selecciona primero un departamento' : `Selecciona un ${label.toLowerCase()}`}</option>
                {form[name] && !opciones.includes(form[name]) && (
                    <option value={form[name]}>{form[name]}</option>
                )}
                {opciones.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            {errors[name] && <span id={`${id}-${name}-error`} className="form-error-text" role="alert">{errors[name]}</span>}
        </div>
    )
    const campo = (name, label, maxLength, placeholder) => (
        <div className="form-field" key={name}>
            <label className="form-label" htmlFor={`${id}-${name}`}>{label}</label>
            <input
                id={`${id}-${name}`}
                className={`form-input ${errors[name] ? 'form-input-invalid' : ''}`}
                name={name}
                value={form[name] ?? ''}
                title={form[name] || undefined}
                onChange={cambiar}
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
            <div className="form-row address-fields-row">
                {seleccion('departamento', 'Departamento', departamentos)}
                {form.departamento && !municipios[form.departamento]
                    ? campo('municipio', 'Municipio', 200, 'Municipio registrado')
                    : seleccion('municipio', 'Municipio', disponibles, !form.departamento)}
                {campo('zona', 'Zona (opcional)', 2, 'Ej. 4')}
            </div>
            <p className="admin-table-muted">Elige el departamento y luego su municipio. Deja la zona vacía si la dirección no tiene zona.</p>
            {campo(directionName, directionName === 'direccion' ? 'Dirección' : 'Dirección detallada', 300, 'Calle, avenida, número y referencia')}
        </>
    )
}

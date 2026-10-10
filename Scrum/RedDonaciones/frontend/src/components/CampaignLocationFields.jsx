// Selección de ubicación heredada o propia para las campañas de ambos paneles.
import React from 'react'
import CoordinatesFields from './CoordinatesFields'
import AddressFields from './AddressFields'

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
                    <AddressFields form={form} errors={errors} onChange={onChange} disabled={disabled} directionName="direccion_detalle" />
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

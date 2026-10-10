// Selección de ubicación heredada o propia para las campañas de ambos paneles.
import React from 'react'
import CoordinatesFields from './CoordinatesFields'
import AddressFields from './AddressFields'
import { formatearDireccion } from '../utils/mapas'

export default function CampaignLocationFields({ form, errors = {}, onChange, organizacion, disabled = false }) {
    const id = React.useId()
    const propia = form.ubicacion_modo === 'propia'
    const direccion = organizacion && formatearDireccion(organizacion)
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
                    <p className="admin-table-muted">Si dejas ambas coordenadas vacías, se utilizarán las de la organización como referencia. Para señalar otro punto exacto, ingresa las dos.</p>
                </>
            ) : (
                <div className="form-field">
                    <p className="admin-table-muted">La campaña utilizará la dirección y las coordenadas actuales de su organización.</p>
                    {direccion && <p>{direccion}</p>}
                    {organizacion && !direccion && <p className="admin-table-muted">La organización todavía no tiene una dirección registrada. Puedes elegir una ubicación propia para esta campaña.</p>}
                    {organizacion?.latitud != null && organizacion?.longitud != null && (
                        <p className="admin-table-muted">Coordenadas: {organizacion.latitud}, {organizacion.longitud}</p>
                    )}
                </div>
            )}
        </>
    )
}

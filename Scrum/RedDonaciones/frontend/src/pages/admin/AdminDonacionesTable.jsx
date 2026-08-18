// Tabla de donaciones del panel de administrador, con seleccion multiple
// para actualizar el estado de varias donaciones a la vez. Igual que
// OrgaDonacionesTable pero para todas las organizaciones, con una columna
// extra de Organizacion.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import SkeletonRows from './SkeletonRows'
import { formatDate, donationStatusLabel } from './adminHelpers'
import '../MisDonaciones.css'

export default function AdminDonacionesTable({
    donaciones,
    loadingDonaciones,
    donacionesError,
    selectedIds,
    onRetry,
    onToggleOne,
    onToggleAll
}) {
    if (donacionesError) {
        return <ErrorView message={donacionesError} onRetry={onRetry} />
    }

    if (!loadingDonaciones && donaciones.length === 0) {
        return (
            <div className="empty-box">
                No hay donaciones registradas todavía.
            </div>
        )
    }

    const allSelected = donaciones.length > 0 && donaciones.every((d) => selectedIds.has(d.id_donacion))

    return (
        <div className="admin-table-wrap">
            <table className="admin-table admin-table-donaciones-admin">
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => onToggleAll(e.target.checked)}
                                disabled={loadingDonaciones}
                                aria-label="Seleccionar todas las donaciones"
                            />
                        </th>
                        <th>Campaña</th>
                        <th>Organización</th>
                        <th>Donante</th>
                        <th>Cantidad</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                    </tr>
                </thead>

                <tbody>
                    {loadingDonaciones
                        ? <SkeletonRows cols={7} rows={4} />
                        : donaciones.map((donacion) => (
                            <tr key={donacion.id_donacion}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(donacion.id_donacion)}
                                        onChange={(e) => onToggleOne(donacion.id_donacion, e.target.checked)}
                                        aria-label={`Seleccionar donación #${donacion.id_donacion}`}
                                    />
                                </td>

                                <td>
                                    <div className="admin-table-primary">
                                        {donacion.publicacion_titulo}
                                    </div>
                                </td>

                                <td>{donacion.organizacion_nombre}</td>

                                <td>
                                    <div>{donacion.donante_nombre}</div>
                                    <div className="admin-table-muted">
                                        {donacion.telefono_contacto}
                                    </div>
                                </td>

                                <td>{donacion.cantidad_donada}</td>

                                <td>{formatDate(donacion.fecha_donacion)}</td>

                                <td>
                                    <span className={`status-badge donacion-estado-${donacion.estado}`}>
                                        {donationStatusLabel(donacion.estado)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    )
}

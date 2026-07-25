// Tabla de organizaciones del panel admin. Recibe datos y callbacks por props.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import { IconEdit, IconTrash } from '../../components/icons'

export default function AdminOrgsTable({
    organizaciones,
    orgLoading,
    orgError,
    isSubmitting,
    onRetry,
    onEdit,
    onArchivar
}) {
    return (
        <>
            {orgError && <ErrorView message={orgError} onRetry={onRetry} />}
            {orgLoading && <div className="empty-box">Cargando organizaciones...</div>}
            {!orgLoading && !orgError && organizaciones.length === 0 && (
                <div className="empty-box">No hay organizaciones registradas.</div>
            )}
            {!orgLoading && !orgError && organizaciones.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table admin-table-orgs">
                        <thead>
                            <tr>
                                <th>Organización</th>
                                <th>Estado</th>
                                <th>Dirección</th>
                                <th>Telefono</th>
                                <th>Correo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {organizaciones.map((org) => (
                                <tr key={org.id_organizacion}>
                                    <td>
                                        <div className="admin-table-primary">{org.nombre}</div>
                                        <div className="admin-table-muted">{org.descripcion || 'Sin descripción'}</div>
                                    </td>
                                    <td>{org.estado_verificacion || 'Sin estado'}</td>
                                    <td>{org.direccion || '-'}</td>
                                    <td>{org.telefono || '-'}</td>
                                    <td>{org.correo || '-'}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button"
                                                onClick={() => onEdit(org)}
                                                title="Editar"
                                                aria-label={`Editar ${org.nombre}`}
                                            >
                                                <IconEdit className="admin-action-icon" />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-icon-button admin-icon-button-danger"
                                                onClick={() => onArchivar(org)}
                                                disabled={isSubmitting}
                                                title="Archivar"
                                                aria-label={`Archivar ${org.nombre}`}
                                            >
                                                <IconTrash className="admin-action-icon" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}

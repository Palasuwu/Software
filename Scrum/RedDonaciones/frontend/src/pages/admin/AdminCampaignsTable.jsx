// Tabla de campañas del panel admin: progreso, fechas y selector de estado.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import SkeletonRows from './SkeletonRows'
import { getProgress, formatDate } from './adminHelpers'

export default function AdminCampaignsTable({
    publicaciones,
    loadingCampaigns,
    campaignsError,
    savingCampaignId,
    onRetry,
    onStatusChange
}) {
    if (campaignsError) return <ErrorView message={campaignsError} onRetry={onRetry} />
    if (publicaciones.length === 0 && !loadingCampaigns) return <div className="empty-box">No hay campañas registradas.</div>

    return (
        <div className="admin-table-wrap">
            <table className="admin-table admin-table-campaigns">
                <thead>
                    <tr>
                        <th>Campaña</th>
                        <th>Organización</th>
                        <th>Progreso</th>
                        <th>Fechas</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {loadingCampaigns
                        ? <SkeletonRows cols={5} rows={4} />
                        : publicaciones.map((publicacion) => {
                            const progress = getProgress(publicacion)
                            const isSaving = savingCampaignId === publicacion.id_publicacion

                            const statusClass = publicacion.estado === 'activa'
                                ? 'status-active'
                                : publicacion.estado === 'finalizada'
                                    ? 'status-finished'
                                    : publicacion.estado === 'cancelada'
                                        ? 'status-canceled'
                                        : ''

                            return (
                                <tr key={publicacion.id_publicacion}>
                                    <td>
                                        <div className="admin-table-primary">{publicacion.titulo}</div>
                                        <div className="admin-table-muted">{publicacion.categoria || 'Sin categoría'}</div>
                                    </td>
                                    <td>{publicacion.organizacion || 'Sin organización'}</td>
                                    <td>
                                        <div className="admin-progress-cell">
                                            <span>{progress}%</span>
                                            <div className="progress-track admin-progress-track">
                                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>{formatDate(publicacion.fecha_publicacion)}</div>
                                        <div className="admin-table-muted">Límite: {formatDate(publicacion.fecha_limite)}</div>
                                    </td>
                                    <td>
                                        <select
                                            className={`form-select admin-select-status campaign-select-status ${statusClass}`}
                                            value={publicacion.estado}
                                            onChange={(e) => onStatusChange(publicacion, e.target.value)}
                                            disabled={isSaving}
                                        >
                                            <option value="activa">Activa</option>
                                            <option value="finalizada">Finalizada</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </td>
                                </tr>
                            )
                        })}
                </tbody>
            </table>
        </div>
    )
}

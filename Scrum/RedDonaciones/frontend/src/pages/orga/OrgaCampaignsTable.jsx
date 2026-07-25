// Tabla de publicaciones del panel de organizacion. Columnas distintas a
// AdminCampaignsTable (tiene Articulo + boton editar, no tiene Organizacion),
// por eso no se comparte el mismo componente.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import { IconEdit } from '../../components/icons'
import SkeletonRows from '../admin/SkeletonRows'
import { getProgress, formatDate } from '../admin/adminHelpers'

export default function OrgaCampaignsTable({
    publicaciones,
    loadingCampaigns,
    campaignsError,
    savingCampaignId,
    onRetry,
    onEdit,
    onStatusChange
}) {
    if (campaignsError) {
        return <ErrorView message={campaignsError} onRetry={onRetry} />
    }

    if (!loadingCampaigns && publicaciones.length === 0) {
        return (
            <div className="empty-box">
                No hay publicaciones registradas.
            </div>
        )
    }

    return (
        <div className="admin-table-wrap">
            <table className="admin-table admin-table-campaigns">
                <thead>
                    <tr>
                        <th>Campaña</th>
                        <th>Artículo</th>
                        <th>Progreso</th>
                        <th>Fechas</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {loadingCampaigns
                        ? <SkeletonRows cols={6} rows={4} />
                        : publicaciones.map((publicacion) => {
                            const progress = getProgress(publicacion)
                            const isSaving = savingCampaignId === publicacion.id_publicacion

                            return (
                                <tr key={publicacion.id_publicacion}>
                                    <td>
                                        <div className="admin-table-primary">
                                            {publicacion.titulo}
                                        </div>

                                        <div className="admin-table-muted">
                                            {publicacion.descripcion}
                                        </div>
                                    </td>

                                    <td>
                                        {publicacion.articulo || 'Sin artículo'}
                                    </td>

                                    <td>
                                        <div className="admin-progress-cell">
                                            <span>{progress}%</span>

                                            <div className="progress-track admin-progress-track">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div>
                                            {formatDate(publicacion.fecha_publicacion)}
                                        </div>

                                        <div className="admin-table-muted">
                                            Límite: {formatDate(publicacion.fecha_limite)}
                                        </div>
                                    </td>

                                    <td>
                                        <select
                                            className="form-select admin-select-status"
                                            value={publicacion.estado}
                                            disabled={isSaving}
                                            onChange={(e) =>
                                                onStatusChange(
                                                    publicacion,
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="activa">Activa</option>
                                            <option value="finalizada">Finalizada</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </td>

                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button"
                                                title="Editar publicación"
                                                onClick={() => onEdit(publicacion)}
                                            >
                                                <IconEdit className="admin-action-icon" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                </tbody>
            </table>
        </div>
    )
}

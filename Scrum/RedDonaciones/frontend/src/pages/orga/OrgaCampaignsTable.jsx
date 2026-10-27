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
    onPublishResult,
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
            <table className="admin-table admin-table-campaigns orga-campaigns-table">
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
                                            className={`form-select admin-select-status campaign-select-status ${statusClass}`}
                                            aria-label={`Estado de ${publicacion.titulo}`}
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
                                        {isSaving && <span role="status" className="admin-table-muted">Guardando estado...</span>}
                                    </td>

                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button orga-edit-action"
                                                disabled={isSaving}
                                                title="Editar publicación"
                                                aria-label={`Editar publicación: ${publicacion.titulo}`}
                                                onClick={() => onEdit(publicacion)}
                                            >
                                                <IconEdit className="admin-action-icon" />
                                            </button>
                                            {publicacion.estado === 'finalizada' && (
                                                <button
                                                    type="button"
                                                    className="admin-primary-action orga-publish-result-action"
                                                    disabled={isSaving}
                                                    aria-label={`Publicar resultados de ${publicacion.titulo}`}
                                                    onClick={() => onPublishResult(publicacion)}
                                                >
                                                    Publicar resultados
                                                </button>
                                            )}
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

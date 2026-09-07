// Tabla del carrusel de la landing page en el panel admin. Recibe datos y callbacks por props.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import { IconEdit, IconTrash } from '../../components/icons'

export default function CarruselTable({
    imagenes,
    loading,
    error,
    isSubmitting,
    onRetry,
    onEdit,
    onDelete
}) {
    return (
        <>
            {error && <ErrorView message={error} onRetry={onRetry} />}
            {loading && <div className="empty-box">Cargando carrusel...</div>}
            {!loading && !error && imagenes.length === 0 && (
                <div className="empty-box">No hay imagenes en el carrusel. Se muestra el respaldo por defecto en la landing.</div>
            )}
            {!loading && !error && imagenes.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table admin-table-carrusel">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Texto alternativo</th>
                                <th>Orden</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imagenes.map((img) => (
                                <tr key={img.id_imagen}>
                                    <td>
                                        <img
                                            src={img.url_imagen}
                                            alt={img.alt_text}
                                            className="admin-carrusel-thumb"
                                        />
                                    </td>
                                    <td>{img.alt_text}</td>
                                    <td>{img.orden}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button"
                                                onClick={() => onEdit(img)}
                                                title="Editar"
                                                aria-label={`Editar imagen ${img.id_imagen}`}
                                            >
                                                <IconEdit className="admin-action-icon" />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-icon-button admin-icon-button-danger"
                                                onClick={() => onDelete(img)}
                                                disabled={isSubmitting}
                                                title="Eliminar"
                                                aria-label={`Eliminar imagen ${img.id_imagen}`}
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

// Tabla de solo lectura de los intermediarios de la organizacion del usuario.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import SkeletonRows from '../admin/SkeletonRows'

export default function OrgaIntermediariosTable({
    intermediarios,
    loadingIntermediarios,
    intermediariosError,
    onRetry
}) {
    if (intermediariosError) {
        return (
            <ErrorView
                message={intermediariosError}
                onRetry={onRetry}
            />
        )
    }

    if (!loadingIntermediarios && intermediarios.length === 0) {
        return (
            <div className="empty-box">
                No hay intermediarios registrados.
            </div>
        )
    }

    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Cargo</th>
                    </tr>
                </thead>

                <tbody>
                    {loadingIntermediarios
                        ? <SkeletonRows cols={4} rows={4} />
                        : intermediarios.map((usuario) => (
                            <tr key={usuario.id_usuario}>
                                <td>
                                    <div className="admin-table-primary">
                                        {usuario.nombre}
                                    </div>
                                </td>

                                <td>{usuario.correo}</td>

                                <td>{usuario.telefono}</td>

                                <td>{usuario.cargo || 'Sin cargo'}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    )
}

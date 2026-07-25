// Tabla de usuarios del panel admin. Recibe datos y callbacks por props;
// no maneja estado ni llama a la API directamente.
import React from 'react'
import ErrorView from '../../components/ErrorView'
import { IconEdit, IconToggle, IconTrash } from '../../components/icons'
import SkeletonRows from './SkeletonRows'
import { roleLabel, formatDate } from './adminHelpers'

export default function AdminUsersTable({
    usuarios,
    loadingUsers,
    usersError,
    usuarioSesion,
    onRetry,
    onEdit,
    onDesactivar,
    onActivar,
    onAnonimizar
}) {
    if (usersError) return <ErrorView message={usersError} onRetry={onRetry} />
    if (usuarios.length === 0 && !loadingUsers) return <div className="empty-box">No hay usuarios registrados.</div>

    return (
        <div className="admin-table-wrap">
            <table className="admin-table admin-table-users">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Telefono</th>
                        <th>Rol</th>
                        <th>Registro</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loadingUsers
                        ? <SkeletonRows cols={5} rows={4} />
                        : usuarios.map((usuario) => {
                            const isSelf = usuarioSesion?.id_usuario === usuario.id_usuario

                            return (
                                <tr key={usuario.id_usuario}>
                                    <td>
                                        <div className="admin-table-primary">{usuario.nombre}</div>
                                        <div className="admin-table-muted">{usuario.correo}</div>
                                    </td>
                                    <td>{usuario.telefono}</td>
                                    <td>
                                        <span className={`admin-status-pill admin-status-${usuario.rol}`}>
                                            {roleLabel(usuario.rol)}
                                        </span>
                                    </td>
                                    <td>{formatDate(usuario.fecha_registro)}</td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="admin-icon-button"
                                                onClick={() => onEdit(usuario)}
                                                aria-label={`Editar ${usuario.nombre}`}
                                                title="Editar"
                                            >
                                                <IconEdit className="admin-action-icon" />
                                            </button>
                                            {usuario.activo !== 0 ? (
                                                <button
                                                    type="button"
                                                    className="admin-icon-button"
                                                    onClick={() => onDesactivar(usuario)}
                                                    disabled={isSelf}
                                                    aria-label={`Desactivar ${usuario.nombre}`}
                                                    title="Desactivar"
                                                >
                                                    <IconToggle checked={true} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="admin-icon-button"
                                                    onClick={() => onActivar(usuario)}
                                                    disabled={isSelf}
                                                    aria-label={`Activar ${usuario.nombre}`}
                                                    title="Activar"
                                                >
                                                    <IconToggle checked={false} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="admin-icon-button admin-icon-button-danger"
                                                onClick={() => onAnonimizar(usuario)}
                                                disabled={isSelf || usuario.nombre === 'Usuario Anonimizado'}
                                                aria-label={`Anonimizar ${usuario.nombre}`}
                                                title="Anonimizar"
                                            >
                                                <IconTrash className="admin-action-icon" />
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

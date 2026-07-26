// Modal de confirmacion generico (desactivar, archivar, anonimizar, cancelar...).
// AdminPanel arma el titulo/mensaje/accion y este componente solo lo muestra.
import React from 'react'
import AdminModal from './AdminModal'

export default function ConfirmationModal({ isOpen, title, message, onCancel, onConfirm, isSubmitting }) {
    if (!isOpen) return null;
    return (
        <AdminModal
            title={title}
            onClose={onCancel}
            sizeClass="modal-confirm"
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="button" className="admin-danger-button" onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirmando...' : 'Confirmar'}
                    </button>
                </>
            )}
        >
            <p className="admin-confirm-text">{message}</p>
        </AdminModal>
    )
}

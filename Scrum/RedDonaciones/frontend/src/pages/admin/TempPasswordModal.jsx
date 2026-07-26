// Modal que muestra la contraseña temporal generada al crear un usuario sin password.
import React from 'react'
import AdminModal from './AdminModal'

export default function TempPasswordModal({ email, password, onClose, copied, onCopy }) {
    return (
        <AdminModal
            title="Contraseña Temporal Generada"
            description="Se ha creado el usuario con una contraseña temporal. Por favor, cópiala y compártela de forma segura."
            onClose={onClose}
            footer={(
                <button type="button" className="btn-confirmar temp-password-close-btn" onClick={onClose}>
                    He guardado la contraseña
                </button>
            )}
        >
            <div className="temp-password-box">
                <p className="temp-password-user-label">
                    <strong>Usuario:</strong> {email}
                </p>
                <div className="temp-password-value-container">
                    <span className="temp-password-monospace">
                        {password}
                    </span>
                    <button
                        type="button"
                        className="profile-edit-button temp-password-copy-btn"
                        onClick={onCopy}
                    >
                        {copied ? 'Copiado' : 'Copiar Contraseña'}
                    </button>
                </div>
            </div>
        </AdminModal>
    )
}

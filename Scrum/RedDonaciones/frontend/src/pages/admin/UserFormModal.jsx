// Modal de crear/editar usuario. AdminPanel decide cuando abrirlo y maneja
// el estado del formulario; este componente solo arma el modal alrededor de UserFormFields.
import React from 'react'
import AdminModal from './AdminModal'
import UserFormFields from './UserFormFields'

export default function UserFormModal({
    isCreate,
    form,
    errors,
    organizaciones,
    orgLoading,
    orgError,
    onChange,
    onSubmit,
    onClose,
    isSubmitting,
    modalError
}) {
    return (
        <AdminModal
            title={isCreate ? 'Nuevo usuario' : 'Editar usuario'}
            description={isCreate ? 'Crea una cuenta operativa para la plataforma.' : 'Actualiza los datos principales de esta cuenta.'}
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="submit" form="admin-user-form" className="btn-confirmar admin-submit-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
                    </button>
                </>
            )}
        >
            {modalError && <div className="error-box">{modalError}</div>}
            <form id="admin-user-form" onSubmit={onSubmit} noValidate>
                <UserFormFields
                    form={form}
                    errors={errors}
                    mode={isCreate ? 'create' : 'edit'}
                    organizaciones={organizaciones}
                    orgLoading={orgLoading}
                    orgError={orgError}
                    onChange={onChange}
                />
            </form>
        </AdminModal>
    )
}

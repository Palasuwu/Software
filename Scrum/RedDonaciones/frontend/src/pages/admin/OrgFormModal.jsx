// Modal de crear/editar organizacion.
import React from 'react'
import AdminModal from './AdminModal'

export default function OrgFormModal({
    isEdit,
    orgForm,
    orgFormErrors,
    onChange,
    onSubmit,
    onClose,
    isSubmitting,
    modalError,
    logoPreview,
    portadaPreview,
    uploadingLogo,
    uploadingPortada,
    onLogoChange,
    onPortadaChange
}) {
    return (
        <AdminModal
            title={isEdit ? 'Editar organización' : 'Nueva organización'}
            description={isEdit ? 'Actualiza los datos de la organización.' : 'Crea una organización en la plataforma'}
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="org-form"
                        className="btn-confirmar admin-submit-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </>
            )}
        >
            {modalError && <div className="error-box">{modalError}</div>}

            <form id="org-form" onSubmit={onSubmit}>
                <div className="form-grid">
                    <div className="form-field">
                        <label className="form-label">Nombre</label>
                        <input
                            className={`form-input ${orgFormErrors.nombre ? 'form-input-invalid' : ''}`}
                            name="nombre"
                            value={orgForm.nombre}
                            onChange={onChange}
                        />
                        {orgFormErrors.nombre && <span className="form-error-text org-field-error-text">{orgFormErrors.nombre}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Descripcion</label>
                        <textarea
                            className={`form-textarea ${orgFormErrors.descripcion ? 'form-input-invalid' : ''}`}
                            name="descripcion"
                            value={orgForm.descripcion}
                            onChange={onChange}
                        />
                        {orgFormErrors.descripcion && <span className="form-error-text org-field-error-text">{orgFormErrors.descripcion}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Direccion</label>
                        <input
                            className={`form-input ${orgFormErrors.direccion ? 'form-input-invalid' : ''}`}
                            name="direccion"
                            value={orgForm.direccion}
                            onChange={onChange}
                        />
                        {orgFormErrors.direccion && <span className="form-error-text org-field-error-text">{orgFormErrors.direccion}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Telefono</label>
                        <input
                            className={`form-input ${orgFormErrors.telefono ? 'form-input-invalid' : ''}`}
                            name="telefono"
                            value={orgForm.telefono}
                            onChange={onChange}
                        />
                        {orgFormErrors.telefono && <span className="form-error-text org-field-error-text">{orgFormErrors.telefono}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Correo</label>
                        <input
                            className={`form-input ${orgFormErrors.correo ? 'form-input-invalid' : ''}`}
                            name="correo"
                            value={orgForm.correo}
                            onChange={onChange}
                        />
                        {orgFormErrors.correo && <span className="form-error-text org-field-error-text">{orgFormErrors.correo}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Estado</label>
                        <select
                            className="form-select"
                            name="estado_verificacion"
                            value={orgForm.estado_verificacion}
                            onChange={onChange}
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="verificada">Verificada</option>
                            <option value="rechazada">Rechazada</option>
                            <option value="inactiva">Inactiva</option>
                            <option value="archivada">Archivada</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Logo (opcional)</label>
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onLogoChange} disabled={uploadingLogo} className="form-input form-file-input" />
                        {uploadingLogo && <span className="form-error-text form-uploading-text">Subiendo logo...</span>}
                        {logoPreview && !uploadingLogo && (
                            <img src={logoPreview} alt="Vista previa del logo" style={{ marginTop: '8px', maxHeight: '80px', borderRadius: '999px', objectFit: 'cover' }} />
                        )}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Portada (opcional)</label>
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onPortadaChange} disabled={uploadingPortada} className="form-input form-file-input" />
                        {uploadingPortada && <span className="form-error-text form-uploading-text">Subiendo portada...</span>}
                        {portadaPreview && !uploadingPortada && (
                            <img src={portadaPreview} alt="Vista previa de la portada" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                        )}
                    </div>
                </div>
            </form>
        </AdminModal>
    )
}

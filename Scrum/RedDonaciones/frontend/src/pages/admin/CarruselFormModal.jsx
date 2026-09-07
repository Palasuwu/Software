// Modal de crear/editar una imagen del carrusel de la landing page.
import React from 'react'
import AdminModal from './AdminModal'

export default function CarruselFormModal({
    isEdit,
    form,
    errors,
    onChange,
    onSubmit,
    onClose,
    isSubmitting,
    modalError,
    imagePreview,
    uploadingImage,
    onImageChange
}) {
    return (
        <AdminModal
            title={isEdit ? 'Editar imagen del carrusel' : 'Nueva imagen del carrusel'}
            description="Se muestra en la landing page publica, en la seccion de galeria."
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="carrusel-form"
                        className="btn-confirmar admin-submit-button"
                        disabled={isSubmitting || uploadingImage}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </>
            )}
        >
            {modalError && <div className="error-box">{modalError}</div>}

            <form id="carrusel-form" onSubmit={onSubmit}>
                <div className="form-grid">
                    <div className="form-field">
                        <label className="form-label">Imagen</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={onImageChange}
                            disabled={uploadingImage}
                            className="form-input form-file-input"
                        />
                        {uploadingImage && <span className="form-error-text form-uploading-text">Subiendo imagen...</span>}
                        {errors.url_imagen && <span className="form-error-text org-field-error-text">{errors.url_imagen}</span>}
                        {imagePreview && !uploadingImage && (
                            <img src={imagePreview} alt="Vista previa" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                        )}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Texto alternativo</label>
                        <input
                            className={`form-input ${errors.alt_text ? 'form-input-invalid' : ''}`}
                            name="alt_text"
                            value={form.alt_text}
                            onChange={onChange}
                            placeholder="Describe la imagen para lectores de pantalla"
                        />
                        {errors.alt_text && <span className="form-error-text org-field-error-text">{errors.alt_text}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Orden</label>
                        <input
                            type="number"
                            className="form-input"
                            name="orden"
                            value={form.orden}
                            onChange={onChange}
                            min="0"
                        />
                    </div>
                </div>
            </form>
        </AdminModal>
    )
}

import React from 'react'

export default function OrgaCampaignResultModal({ publicacion, form, onChange, onImageChange, imagePreview, uploadingImage, onSubmit, onClose, saving, error }) {
    return (
        <div className="admin-modal-backdrop">
            <section className="admin-modal">
                <header className="admin-modal-header">
                    <div>
                        <p className="page-kicker">Campaña finalizada</p>
                        <h2>Publicar resultados</h2>
                        <p>{publicacion.titulo}</p>
                    </div>
                </header>
                <div className="admin-modal-body">
                    {error && <div className="error-box">{error}</div>}
                    <form onSubmit={onSubmit}>
                        <div className="form-grid">
                            <div className="form-field form-field-full">
                                <label className="form-label">Resumen de los resultados</label>
                                <textarea
                                    className="form-textarea"
                                    name="resumen"
                                    value={form.resumen}
                                    onChange={onChange}
                                    maxLength="1000"
                                    required
                                    placeholder="Cuenta qué se logró con la campaña y cómo se entregaron las donaciones."
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Personas beneficiadas (opcional)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="0"
                                    name="personas_beneficiadas"
                                    value={form.personas_beneficiadas}
                                    onChange={onChange}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="campaign-result-image">Imagen (opcional)</label>
                                <input
                                    id="campaign-result-image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="form-input form-file-input"
                                    onChange={onImageChange}
                                    disabled={uploadingImage}
                                />
                                {uploadingImage && (
                                    <span className="form-error-text form-uploading-text" role="status">
                                        Subiendo imagen...
                                    </span>
                                )}
                                {imagePreview && (
                                    <img
                                        src={imagePreview}
                                        alt="Vista previa de resultados"
                                        style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button type="button" className="profile-cancel-button" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn-confirmar" disabled={saving || uploadingImage}>
                                {saving ? 'Publicando...' : 'Publicar resultados'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    )
}

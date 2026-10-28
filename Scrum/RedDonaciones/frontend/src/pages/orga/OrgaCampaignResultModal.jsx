import ImagenInstitucional from '../../components/ImagenInstitucional'
import React from 'react'
import useCerrarConEscape from '../../utils/useCerrarConEscape'

export default function OrgaCampaignResultModal({ publicacion, form, onChange, onImageChange, imagePreview, uploadingImage, onSubmit, onClose, saving, error }) {
    useCerrarConEscape(onClose)

    return (
        <div className="admin-modal-backdrop">
            <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="orga-resultado-modal-title">
                <header className="admin-modal-header">
                    <div>
                        <p className="page-kicker">Campaña finalizada</p>
                        <h2 id="orga-resultado-modal-title">Publicar resultados</h2>
                        <p>{publicacion.titulo}</p>
                    </div>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Cerrar modal">
                        x
                    </button>
                </header>
                <div className="admin-modal-body">
                    {error && <div className="error-box">{error}</div>}
                    <form onSubmit={onSubmit}>
                        <div className="form-grid">
                            <div className="form-field form-field-full">
                                <label className="form-label" htmlFor="orga-resultado-resumen">Resumen de los resultados</label>
                                <textarea id="orga-resultado-resumen"
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
                                <label className="form-label" htmlFor="orga-resultado-personas-beneficiadas">Personas beneficiadas (opcional)</label>
                                <input id="orga-resultado-personas-beneficiadas"
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
                                    <ImagenInstitucional
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

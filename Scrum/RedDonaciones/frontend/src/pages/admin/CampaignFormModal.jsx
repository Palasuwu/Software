// Modal de crear campaña (solo lo usa AdminPanel; OrgaPanel tiene su propio
// modal en pages/orga porque su formulario no incluye organizacion/intermediario).
import React from 'react'
import AdminModal from './AdminModal'

export default function CampaignFormModal({
    campForm,
    campFormErrors,
    articulos,
    organizaciones,
    intermediarios,
    onChange,
    onImageChange,
    onSubmit,
    onClose,
    isSubmitting,
    uploadingImage,
    imagePreview,
    modalError
}) {
    return (
        <AdminModal
            title="Nueva campaña"
            description="Crea una campaña de recolección de donaciones."
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="profile-cancel-button" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="submit" form="camp-form" className="btn-confirmar admin-submit-button" disabled={isSubmitting || uploadingImage}>
                        {isSubmitting ? 'Guardando...' : 'Crear campaña'}
                    </button>
                </>
            )}
        >
            {modalError && <div className="error-box">{modalError}</div>}
            <form id="camp-form" onSubmit={onSubmit} noValidate>
                <div className="form-grid">
                    <div className="form-field">
                        <label className="form-label">Título</label>
                        <input className={`form-input ${campFormErrors.titulo ? 'form-input-invalid' : ''}`} name="titulo" value={campForm.titulo} onChange={onChange} />
                        {campFormErrors.titulo && <span className="form-error-text">{campFormErrors.titulo}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Descripción</label>
                        <textarea className={`form-textarea ${campFormErrors.descripcion ? 'form-input-invalid' : ''}`} name="descripcion" value={campForm.descripcion} onChange={onChange} />
                        {campFormErrors.descripcion && <span className="form-error-text">{campFormErrors.descripcion}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Cantidad necesaria</label>
                        <input className={`form-input ${campFormErrors.cantidad_necesaria ? 'form-input-invalid' : ''}`} name="cantidad_necesaria" type="number" min="1" value={campForm.cantidad_necesaria} onChange={onChange} />
                        {campFormErrors.cantidad_necesaria && <span className="form-error-text">{campFormErrors.cantidad_necesaria}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Fecha de publicación</label>
                        <input className={`form-input ${campFormErrors.fecha_publicacion ? 'form-input-invalid' : ''}`} name="fecha_publicacion" type="date" value={campForm.fecha_publicacion} onChange={onChange} />
                        {campFormErrors.fecha_publicacion && <span className="form-error-text">{campFormErrors.fecha_publicacion}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Fecha límite</label>
                        <input className={`form-input ${campFormErrors.fecha_limite ? 'form-input-invalid' : ''}`} name="fecha_limite" type="date" value={campForm.fecha_limite} onChange={onChange} />
                        {campFormErrors.fecha_limite && <span className="form-error-text">{campFormErrors.fecha_limite}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Estado</label>
                        <select className="form-select" name="estado" value={campForm.estado} onChange={onChange}>
                            <option value="activa">Activa</option>
                            <option value="finalizada">Finalizada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Intermediario</label>
                        <select className={`form-select ${campFormErrors.id_intermediario ? 'form-input-invalid' : ''}`} name="id_intermediario" value={campForm.id_intermediario} onChange={onChange}>
                            <option value="">Selecciona un intermediario</option>
                            {intermediarios.map((u) => (
                                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                            ))}
                        </select>
                        {campFormErrors.id_intermediario && <span className="form-error-text">{campFormErrors.id_intermediario}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Organización</label>
                        <select className={`form-select ${campFormErrors.id_organizacion ? 'form-input-invalid' : ''}`} name="id_organizacion" value={campForm.id_organizacion} onChange={onChange}>
                            <option value="">Selecciona una organización</option>
                            {organizaciones.filter((o) => o.estado_verificacion === 'verificada').map((o) => (
                                <option key={o.id_organizacion} value={o.id_organizacion}>{o.nombre}</option>
                            ))}
                        </select>
                        {campFormErrors.id_organizacion && <span className="form-error-text">{campFormErrors.id_organizacion}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Artículo</label>
                        <select className={`form-select ${campFormErrors.id_articulo ? 'form-input-invalid' : ''}`} name="id_articulo" value={campForm.id_articulo} onChange={onChange}>
                            <option value="">Selecciona un artículo</option>
                            {articulos.map((a) => (
                                <option key={a.id_articulo} value={a.id_articulo}>{a.nombre}</option>
                            ))}
                        </select>
                        {campFormErrors.id_articulo && <span className="form-error-text">{campFormErrors.id_articulo}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Imagen</label>
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onImageChange} disabled={uploadingImage} className={`form-input ${campFormErrors.imagen_url ? 'form-input-invalid' : ''}`} />
                        {uploadingImage && <span className="form-error-text" style={{ color: 'var(--primary)' }}>Subiendo imagen...</span>}
                        {campFormErrors.imagen_url && <span className="form-error-text">{campFormErrors.imagen_url}</span>}
                        {imagePreview && !uploadingImage && (
                            <img src={imagePreview} alt="Vista previa" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                        )}
                    </div>
                </div>
            </form>
        </AdminModal>
    )
}

import ImagenInstitucional from '../../components/ImagenInstitucional'
// Modal de crear/editar publicacion del panel de organizacion.
// No reusa AdminModal porque el formulario lleva sus propios botones en el pie;
// el encabezado sí tiene el mismo botón de cerrar y también cierra con Escape.
import React from 'react'
import useCerrarConEscape from '../../utils/useCerrarConEscape'
import CampaignLocationFields from '../../components/CampaignLocationFields'

export default function OrgaCampaignFormModal({
    isCreate,
    campForm,
    campFormErrors,
    organizacion,
    articulos,
    onChange,
    onImageChange,
    uploadingImage,
    imagePreview,
    onSubmit,
    onClose,
    isSubmitting,
    modalError
}) {
    useCerrarConEscape(onClose)

    return (
        <div className="admin-modal-backdrop">
            <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="orga-camp-modal-title">
                <header className="admin-modal-header">
                    <h2 id="orga-camp-modal-title">
                        {isCreate ? 'Nueva publicación' : 'Editar publicación'}
                    </h2>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Cerrar modal">
                        x
                    </button>
                </header>

                <div className="admin-modal-body">
                    {modalError && (
                        <div className="error-box">
                            {modalError}
                        </div>
                    )}

                    <form onSubmit={onSubmit} noValidate>
                        <div className="form-grid">

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-titulo">Título</label>

                                <input id="orga-camp-titulo"
                                    className="form-input"
                                    name="titulo"
                                    value={campForm.titulo}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-descripcion">Descripción</label>

                                <textarea id="orga-camp-descripcion"
                                    className="form-textarea"
                                    name="descripcion"
                                    value={campForm.descripcion}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-cantidad-necesaria">Cantidad necesaria</label>

                                <input id="orga-camp-cantidad-necesaria"
                                    type="number"
                                    className="form-input"
                                    name="cantidad_necesaria"
                                    value={campForm.cantidad_necesaria}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-id-articulo">Artículo</label>

                                <select id="orga-camp-id-articulo"
                                    className="form-select"
                                    name="id_articulo"
                                    value={campForm.id_articulo}
                                    onChange={onChange}
                                >
                                    <option value="">Selecciona un artículo</option>

                                    {articulos.map((articulo) => (
                                        <option
                                            key={articulo.id_articulo}
                                            value={articulo.id_articulo}
                                        >
                                            {articulo.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <CampaignLocationFields form={campForm} errors={campFormErrors} onChange={onChange} organizacion={organizacion} disabled={isSubmitting} />

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-fecha-publicacion">
                                    Fecha publicación
                                </label>

                                <input id="orga-camp-fecha-publicacion"
                                    type="date"
                                    className="form-input"
                                    name="fecha_publicacion"
                                    value={campForm.fecha_publicacion}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-fecha-limite">
                                    Fecha límite
                                </label>

                                <input id="orga-camp-fecha-limite"
                                    type="date"
                                    className="form-input"
                                    name="fecha_limite"
                                    value={campForm.fecha_limite}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="orga-camp-imagen">Imagen (opcional)</label>

                                <input id="orga-camp-imagen"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="form-input form-file-input"
                                    onChange={onImageChange}
                                    disabled={uploadingImage}
                                />

                                {uploadingImage && (
                                    <span className="form-error-text form-uploading-text">
                                        Subiendo imagen...
                                    </span>
                                )}

                                {imagePreview && !uploadingImage && (
                                    <ImagenInstitucional
                                        src={imagePreview}
                                        alt="Vista previa"
                                        style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }}
                                    />
                                )}
                            </div>

                        </div>

                        <div className="admin-modal-footer">
                            <button
                                type="button"
                                className="profile-cancel-button"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="btn-confirmar"
                                disabled={isSubmitting || uploadingImage}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    )
}

// Modal de crear/editar publicacion del panel de organizacion.
// No reusa components/admin/AdminModal a proposito: el modal original de este
// panel no tiene boton de cerrar ("x"), a diferencia de AdminModal que
// siempre lo incluye. Reusarlo agregaria un boton que hoy no existe.
import React from 'react'

export default function OrgaCampaignFormModal({
    isCreate,
    campForm,
    articulos,
    onChange,
    onSubmit,
    onClose,
    isSubmitting,
    modalError
}) {
    return (
        <div className="admin-modal-backdrop">
            <section className="admin-modal">
                <header className="admin-modal-header">
                    <h2>
                        {isCreate ? 'Nueva publicación' : 'Editar publicación'}
                    </h2>
                </header>

                <div className="admin-modal-body">
                    {modalError && (
                        <div className="error-box">
                            {modalError}
                        </div>
                    )}

                    <form onSubmit={onSubmit}>
                        <div className="form-grid">

                            <div className="form-field">
                                <label className="form-label">Título</label>

                                <input
                                    className="form-input"
                                    name="titulo"
                                    value={campForm.titulo}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Descripción</label>

                                <textarea
                                    className="form-textarea"
                                    name="descripcion"
                                    value={campForm.descripcion}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Cantidad necesaria</label>

                                <input
                                    type="number"
                                    className="form-input"
                                    name="cantidad_necesaria"
                                    value={campForm.cantidad_necesaria}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Artículo</label>

                                <select
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

                            <div className="form-field">
                                <label className="form-label">
                                    Fecha publicación
                                </label>

                                <input
                                    type="date"
                                    className="form-input"
                                    name="fecha_publicacion"
                                    value={campForm.fecha_publicacion}
                                    onChange={onChange}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">
                                    Fecha límite
                                </label>

                                <input
                                    type="date"
                                    className="form-input"
                                    name="fecha_limite"
                                    value={campForm.fecha_limite}
                                    onChange={onChange}
                                />
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
                                disabled={isSubmitting}
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

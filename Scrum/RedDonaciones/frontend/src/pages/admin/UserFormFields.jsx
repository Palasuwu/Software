// Campos del formulario de usuario (crear/editar), condicionados por rol.
// No maneja estado propio: recibe form/errors/onChange desde AdminPanel.
import React from 'react'

export default function UserFormFields({ form, errors, mode, organizaciones, orgLoading, orgError, onChange }) {
    const isAdmin = form.rol === 'administrador'
    const isDonante = form.rol === 'donante'
    const isIntermediario = form.rol === 'intermediario'

    return (
        <div className="form-grid">
            <div className="form-row">
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-nombre">Nombre completo</label>
                    <input
                        id="admin-user-nombre"
                        className={`form-input ${errors.nombre ? 'form-input-invalid' : ''}`}
                        name="nombre"
                        value={form.nombre}
                        onChange={onChange}
                    />
                    {errors.nombre && <span className="form-error-text">{errors.nombre}</span>}
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-telefono">Telefono</label>
                    <input
                        id="admin-user-telefono"
                        className={`form-input ${errors.telefono ? 'form-input-invalid' : ''}`}
                        name="telefono"
                        value={form.telefono}
                        onChange={onChange}
                    />
                    {errors.telefono && <span className="form-error-text">{errors.telefono}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-correo">Correo</label>
                    <input
                        id="admin-user-correo"
                        type="email"
                        className={`form-input ${errors.correo ? 'form-input-invalid' : ''}`}
                        name="correo"
                        value={form.correo}
                        onChange={onChange}
                    />
                    {errors.correo && <span className="form-error-text">{errors.correo}</span>}
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-rol">Rol</label>
                    <select
                        id="admin-user-rol"
                        className={`form-select ${errors.rol ? 'form-input-invalid' : ''}`}
                        name="rol"
                        value={form.rol}
                        onChange={onChange}
                        disabled={mode === 'edit'}
                    >
                        <option value="donante">Donante</option>
                        <option value="intermediario">Intermediario</option>
                        <option value="administrador">Administrador</option>
                    </select>
                    {errors.rol && <span className="form-error-text">{errors.rol}</span>}
                </div>
            </div>

            {mode === 'create' && (
                <div className="form-field">
                    <label className="form-label" htmlFor="admin-user-password">Contraseña temporal</label>
                    <input
                        id="admin-user-password"
                        type="password"
                        className={`form-input ${errors.password ? 'form-input-invalid' : ''}`}
                        name="password"
                        placeholder="Dejar en blanco para autogenerar automáticamente"
                        value={form.password}
                        onChange={onChange}
                    />
                    {errors.password && <span className="form-error-text">{errors.password}</span>}
                </div>
            )}

            {isDonante && (
                <>
                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-departamento">Departamento</label>
                            <input
                                id="admin-user-departamento"
                                className={`form-input ${errors.departamento ? 'form-input-invalid' : ''}`}
                                name="departamento"
                                value={form.departamento}
                                onChange={onChange}
                            />
                            {errors.departamento && <span className="form-error-text">{errors.departamento}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-municipio">Municipio</label>
                            <input
                                id="admin-user-municipio"
                                className={`form-input ${errors.municipio ? 'form-input-invalid' : ''}`}
                                name="municipio"
                                value={form.municipio}
                                onChange={onChange}
                            />
                            {errors.municipio && <span className="form-error-text">{errors.municipio}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-zona">Zona</label>
                            <input
                                id="admin-user-zona"
                                className={`form-input ${errors.zona ? 'form-input-invalid' : ''}`}
                                name="zona"
                                value={form.zona}
                                onChange={onChange}
                            />
                            {errors.zona && <span className="form-error-text">{errors.zona}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="admin-user-direccion">Direccion</label>
                            <input
                                id="admin-user-direccion"
                                className={`form-input ${errors.direccion_detalle ? 'form-input-invalid' : ''}`}
                                name="direccion_detalle"
                                value={form.direccion_detalle}
                                onChange={onChange}
                            />
                            {errors.direccion_detalle && (
                                <span className="form-error-text">{errors.direccion_detalle}</span>
                            )}
                        </div>
                    </div>
                </>
            )}

            {isIntermediario && (
                <div className="form-row">
                    <div className="form-field">
                        <label className="form-label" htmlFor="admin-user-organizacion">Organización</label>
                        <select
                            id="admin-user-organizacion"
                            className={`form-select ${errors.id_organizacion ? 'form-input-invalid' : ''}`}
                            name="id_organizacion"
                            value={form.id_organizacion}
                            onChange={onChange}
                            disabled={orgLoading}
                        >
                            <option value="">Selecciona una organización</option>
                            {organizaciones.filter((organizacion) => organizacion.estado_verificacion === 'verificada').map((organizacion) => (
                                <option key={organizacion.id_organizacion} value={organizacion.id_organizacion}>
                                    {organizacion.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.id_organizacion && (
                            <span className="form-error-text">{errors.id_organizacion}</span>
                        )}
                        {orgLoading && <span className="form-help-text">Cargando organizaciones...</span>}
                        {orgError && <span className="form-error-text">{orgError}</span>}
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="admin-user-cargo">Cargo</label>
                        <input
                            id="admin-user-cargo"
                            className={`form-input ${errors.cargo ? 'form-input-invalid' : ''}`}
                            name="cargo"
                            value={form.cargo}
                            onChange={onChange}
                        />
                        {errors.cargo && <span className="form-error-text">{errors.cargo}</span>}
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="admin-inline-note">
                    Esta cuenta tendra acceso al Panel de Administrador.
                </div>
            )}
        </div>
    )
}

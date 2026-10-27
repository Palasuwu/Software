// Barra para buscar y filtrar campañas en los paneles. Solo presenta: el
// estado de los filtros vive en el panel para que se conserve al recargar.
import React from 'react'
import { campaignStatusLabel } from './adminHelpers'
import { ESTADOS_CAMPANA, contarCampanasPorEstado, hayFiltrosCampana } from './campaignFilters'
import './CampaignFiltersBar.css'

export default function CampaignFiltersBar({ publicaciones, visibles, filtros, onChange, onClear }) {
    const conteo = contarCampanasPorEstado(publicaciones)
    const activos = hayFiltrosCampana(filtros)
    const total = publicaciones.length

    const handleChange = (event) => {
        const { name, value } = event.target
        onChange({ ...filtros, [name]: value })
    }

    return (
        <div className="campaign-filters">
            <div className="campaign-filters-campos">
                <div className="form-field">
                    <label className="form-label" htmlFor="campaign-filtro-texto">Buscar campaña</label>
                    <input
                        id="campaign-filtro-texto"
                        type="search"
                        className="form-input"
                        name="texto"
                        placeholder="Título, categoría o artículo"
                        value={filtros.texto}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="campaign-filtro-estado">Filtrar por estado</label>
                    <select
                        id="campaign-filtro-estado"
                        className="form-select"
                        name="estado"
                        value={filtros.estado}
                        onChange={handleChange}
                    >
                        <option value="">Todos los estados ({total})</option>
                        {ESTADOS_CAMPANA.map((estado) => (
                            <option key={estado} value={estado}>
                                {campaignStatusLabel(estado)} ({conteo[estado]})
                            </option>
                        ))}
                    </select>
                </div>
                {activos && (
                    <button type="button" className="profile-cancel-button campaign-filters-limpiar" onClick={onClear}>
                        Limpiar filtros
                    </button>
                )}
            </div>

            {activos && (
                <p className="campaign-filters-resumen" role="status">
                    Mostrando {visibles} de {total} campañas
                </p>
            )}

            {activos && visibles === 0 && total > 0 && (
                <div className="empty-box">
                    Ninguna campaña coincide con los filtros. Hay {total} en total.
                </div>
            )}
        </div>
    )
}

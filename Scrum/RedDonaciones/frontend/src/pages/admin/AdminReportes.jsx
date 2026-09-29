// Vista de estadisticas y reportes del panel de administrador.
// Autocontenida: carga y filtra sus propios datos contra /api/reportes,
// igual que OrgaPerfilInstitucionalForm, para no crecer mas AdminPanel.
import React from 'react'
import { apiGet } from '../../utils/api'
import Spinner from '../../components/Spinner'
import ErrorView from '../../components/ErrorView'
import { donationStatusLabel } from './adminHelpers'
import { construirCsv, descargarCsv, sufijoFechaArchivo } from '../../utils/csv'

const ESTADOS = ['pendiente', 'recibida', 'en_proceso', 'entregada', 'rechazada']
const FILTROS_VACIOS = { fecha_inicio: '', fecha_fin: '', estado: '', id_publicacion: '' }
const TAMANO_PAGINA = 20
// Tope que acepta el backend por peticion (PAGE_SIZE_MAXIMO en reporte.py).
const TAMANO_PAGINA_MAXIMO = 100

// Arma el query string omitiendo los filtros vacios.
function construirQuery(filtros, extra = {}) {
    const params = new URLSearchParams()
    Object.entries({ ...filtros, ...extra }).forEach(([clave, valor]) => {
        if (valor !== '' && valor !== null && valor !== undefined) params.set(clave, valor)
    })
    return params.toString()
}

const COLUMNAS_DETALLE = [
    { clave: 'id_donacion', titulo: 'ID donación' },
    { clave: 'fecha_donacion', titulo: 'Fecha' },
    { clave: 'donante_nombre', titulo: 'Donante' },
    { clave: 'campana_titulo', titulo: 'Campaña' },
    { clave: 'cantidad_donada', titulo: 'Cantidad' },
    { clave: 'estado', titulo: 'Estado', formato: (valor) => donationStatusLabel(valor) }
]

const COLUMNAS_POR_CAMPANA = [
    { clave: 'titulo', titulo: 'Campaña' },
    { clave: 'total_donaciones', titulo: 'Donaciones' },
    { clave: 'total_donado', titulo: 'Total donado' }
]

export default function AdminReportes() {
    const [filtros, setFiltros] = React.useState(FILTROS_VACIOS)
    // Los filtros aplicados van aparte del formulario: la consulta solo cambia
    // al presionar "Aplicar", no en cada tecla.
    const [filtrosAplicados, setFiltrosAplicados] = React.useState(FILTROS_VACIOS)
    const [resumen, setResumen] = React.useState(null)
    const [detalle, setDetalle] = React.useState(null)
    const [pagina, setPagina] = React.useState(1)
    const [cargando, setCargando] = React.useState(true)
    const [error, setError] = React.useState('')
    const [exportando, setExportando] = React.useState(false)
    const [avisoExport, setAvisoExport] = React.useState('')

    const cargar = React.useCallback(async () => {
        setCargando(true)
        setError('')

        try {
            const queryResumen = construirQuery({
                fecha_inicio: filtrosAplicados.fecha_inicio,
                fecha_fin: filtrosAplicados.fecha_fin
            })
            const queryDetalle = construirQuery(filtrosAplicados, {
                page: pagina,
                page_size: TAMANO_PAGINA
            })

            const [datosResumen, datosDetalle] = await Promise.all([
                apiGet(`/api/reportes/resumen${queryResumen ? `?${queryResumen}` : ''}`),
                apiGet(`/api/reportes/detalle?${queryDetalle}`)
            ])

            setResumen(datosResumen)
            setDetalle(datosDetalle)
        } catch (err) {
            setError(err.message || 'No se pudieron cargar los reportes')
        } finally {
            setCargando(false)
        }
    }, [filtrosAplicados, pagina])

    React.useEffect(() => { cargar() }, [cargar])

    React.useEffect(() => {
        if (!avisoExport) return
        const t = setTimeout(() => setAvisoExport(''), 3500)
        return () => clearTimeout(t)
    }, [avisoExport])

    const handleFiltro = (event) => {
        const { name, value } = event.target
        setFiltros((previo) => ({ ...previo, [name]: value }))
    }

    const aplicarFiltros = (event) => {
        event.preventDefault()
        setPagina(1)
        setFiltrosAplicados(filtros)
    }

    const limpiarFiltros = () => {
        setFiltros(FILTROS_VACIOS)
        setPagina(1)
        setFiltrosAplicados(FILTROS_VACIOS)
    }

    // El detalle viene paginado: para exportar todo se recorren las paginas
    // hasta agotarlas, no solo la que esta en pantalla.
    const exportarDetalle = async () => {
        setExportando(true)
        setAvisoExport('')

        try {
            const filas = []
            let paginaActual = 1
            let totalPaginas = 1

            do {
                const query = construirQuery(filtrosAplicados, {
                    page: paginaActual,
                    page_size: TAMANO_PAGINA_MAXIMO
                })
                const lote = await apiGet(`/api/reportes/detalle?${query}`)
                filas.push(...(lote.items || []))
                totalPaginas = lote.total_paginas || 1
                paginaActual += 1
            } while (paginaActual <= totalPaginas)

            if (filas.length === 0) {
                setAvisoExport('No hay donaciones que coincidan con los filtros')
                return
            }

            descargarCsv(
                `reporte-donaciones-${sufijoFechaArchivo()}.csv`,
                construirCsv(filas, COLUMNAS_DETALLE)
            )
            setAvisoExport(`${filas.length} donación(es) exportada(s)`)
        } catch (err) {
            setAvisoExport(err.message || 'No se pudo exportar el detalle')
        } finally {
            setExportando(false)
        }
    }

    const exportarPorCampana = () => {
        const filas = resumen?.por_campana || []
        if (filas.length === 0) {
            setAvisoExport('No hay campañas que exportar')
            return
        }
        descargarCsv(
            `reporte-campanas-${sufijoFechaArchivo()}.csv`,
            construirCsv(filas, COLUMNAS_POR_CAMPANA)
        )
        setAvisoExport(`${filas.length} campaña(s) exportada(s)`)
    }

    const porEstado = resumen?.por_estado || []
    const porCampana = resumen?.por_campana || []
    const totalDonaciones = porEstado.reduce((acumulado, fila) => acumulado + Number(fila.total || 0), 0)
    const totalDonado = porEstado.reduce((acumulado, fila) => acumulado + Number(fila.total_donado || 0), 0)
    const campanas = porCampana.map((fila) => ({ id: fila.id_publicacion, titulo: fila.titulo }))

    return (
        <>
            <form className="rep-filtros" onSubmit={aplicarFiltros}>
                <div className="form-field">
                    <label className="form-label" htmlFor="rep-desde">Desde</label>
                    <input id="rep-desde" type="date" className="form-input" name="fecha_inicio"
                        value={filtros.fecha_inicio} onChange={handleFiltro} />
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="rep-hasta">Hasta</label>
                    <input id="rep-hasta" type="date" className="form-input" name="fecha_fin"
                        value={filtros.fecha_fin} onChange={handleFiltro} />
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="rep-estado">Estado</label>
                    <select id="rep-estado" className="form-select" name="estado"
                        value={filtros.estado} onChange={handleFiltro}>
                        <option value="">Todos</option>
                        {ESTADOS.map((estado) => (
                            <option key={estado} value={estado}>{donationStatusLabel(estado)}</option>
                        ))}
                    </select>
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="rep-campana">Campaña</label>
                    <select id="rep-campana" className="form-select" name="id_publicacion"
                        value={filtros.id_publicacion} onChange={handleFiltro}>
                        <option value="">Todas</option>
                        {campanas.map((campana) => (
                            <option key={campana.id} value={campana.id}>{campana.titulo}</option>
                        ))}
                    </select>
                </div>
                <div className="rep-filtros-acciones">
                    <button type="submit" className="admin-primary-action" disabled={cargando}>Aplicar</button>
                    <button type="button" className="profile-cancel-button" onClick={limpiarFiltros} disabled={cargando}>
                        Limpiar
                    </button>
                </div>
            </form>

            {avisoExport && <div className="admin-toast">{avisoExport}</div>}
            {error && <ErrorView message={error} onRetry={cargar} />}
            {cargando && <Spinner message="Cargando reportes..." />}

            {!cargando && !error && resumen && (
                <>
                    <div className="rep-kpis">
                        <article className="rep-kpi">
                            <span className="rep-kpi-valor">{totalDonaciones}</span>
                            <span className="rep-kpi-label">Donaciones</span>
                        </article>
                        <article className="rep-kpi">
                            <span className="rep-kpi-valor">{totalDonado}</span>
                            <span className="rep-kpi-label">Artículos donados</span>
                        </article>
                        <article className="rep-kpi">
                            <span className="rep-kpi-valor">{resumen.donantes_unicos ?? 0}</span>
                            <span className="rep-kpi-label">Donantes únicos</span>
                        </article>
                    </div>

                    <div className="rep-columnas">
                        <section className="rep-bloque">
                            <h3 className="rep-bloque-titulo">Donaciones por estado</h3>
                            {porEstado.length === 0
                                ? <div className="empty-box">Sin datos en el rango seleccionado.</div>
                                : (
                                    <div className="admin-table-wrap">
                                        <table className="admin-table admin-table-compacta">
                                            <thead>
                                                <tr><th>Estado</th><th>Donaciones</th><th>Artículos</th></tr>
                                            </thead>
                                            <tbody>
                                                {porEstado.map((fila) => (
                                                    <tr key={fila.estado}>
                                                        <td>{donationStatusLabel(fila.estado)}</td>
                                                        <td>{fila.total}</td>
                                                        <td>{fila.total_donado}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </section>

                        <section className="rep-bloque">
                            <div className="rep-bloque-head">
                                <h3 className="rep-bloque-titulo">Donaciones por campaña</h3>
                                <button type="button" className="rep-export" onClick={exportarPorCampana}>
                                    Exportar CSV
                                </button>
                            </div>
                            {porCampana.length === 0
                                ? <div className="empty-box">Sin campañas en el rango seleccionado.</div>
                                : (
                                    <div className="admin-table-wrap">
                                        <table className="admin-table admin-table-compacta">
                                            <thead>
                                                <tr><th>Campaña</th><th>Donaciones</th><th>Artículos</th></tr>
                                            </thead>
                                            <tbody>
                                                {porCampana.map((fila) => (
                                                    <tr key={fila.id_publicacion}>
                                                        <td>{fila.titulo}</td>
                                                        <td>{fila.total_donaciones}</td>
                                                        <td>{fila.total_donado}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </section>
                    </div>

                    <section className="rep-bloque">
                        <div className="rep-bloque-head">
                            <h3 className="rep-bloque-titulo">
                                Detalle de donaciones
                                {detalle ? <span className="rep-conteo">{detalle.total} registro(s)</span> : null}
                            </h3>
                            <button type="button" className="rep-export" onClick={exportarDetalle} disabled={exportando}>
                                {exportando ? 'Exportando...' : 'Exportar CSV'}
                            </button>
                        </div>

                        {!detalle || detalle.items.length === 0
                            ? <div className="empty-box">No hay donaciones que coincidan con los filtros.</div>
                            : (
                                <>
                                    <div className="admin-table-wrap">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th><th>Donante</th><th>Campaña</th>
                                                    <th>Cantidad</th><th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detalle.items.map((fila) => (
                                                    <tr key={fila.id_donacion}>
                                                        <td>{fila.fecha_donacion}</td>
                                                        <td>{fila.donante_nombre}</td>
                                                        <td>{fila.campana_titulo}</td>
                                                        <td>{fila.cantidad_donada}</td>
                                                        <td>{donationStatusLabel(fila.estado)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {detalle.total_paginas > 1 && (
                                        <div className="rep-paginacion">
                                            <button type="button" className="profile-cancel-button"
                                                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                                disabled={pagina <= 1}>
                                                Anterior
                                            </button>
                                            <span className="rep-pagina-actual">
                                                Página {detalle.page} de {detalle.total_paginas}
                                            </span>
                                            <button type="button" className="profile-cancel-button"
                                                onClick={() => setPagina((p) => Math.min(detalle.total_paginas, p + 1))}
                                                disabled={pagina >= detalle.total_paginas}>
                                                Siguiente
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                    </section>
                </>
            )}
        </>
    )
}

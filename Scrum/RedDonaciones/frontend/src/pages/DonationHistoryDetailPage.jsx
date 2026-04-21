import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerUsuarioSesion } from '../utils/session'

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Sin fecha'
    }

    const parsed = new Date(fecha)
    if (Number.isNaN(parsed.getTime())) {
        return fecha
    }

    return parsed.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

function calcularProgreso(cantidadRecibida, cantidadNecesaria) {
    const necesaria = Number(cantidadNecesaria) || 0
    const recibida = Number(cantidadRecibida) || 0

    if (necesaria <= 0) {
        return 0
    }

    return Math.min(100, Math.round((recibida / necesaria) * 100))
}

function formatearCantidad(valor) {
    const numero = Number(valor) || 0
    return numero.toLocaleString('es-CO')
}

export default function DonationHistoryDetailPage() {
    const navigate = useNavigate()
    const { idDonacion } = useParams()

    const [detalle, setDetalle] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const usuario = obtenerUsuarioSesion()
        if (!usuario?.id_usuario) {
            navigate('/login', { state: { from: `/donaciones/${idDonacion}` } })
            return
        }

        fetch(`/api/donaciones/${idDonacion}`)
            .then(async (res) => {
                const body = await res.json().catch(() => null)
                if (!res.ok) {
                    throw new Error(body?.error || 'No se pudo cargar el detalle de la donacion')
                }

                if (!body || typeof body !== 'object') {
                    throw new Error('Respuesta invalida del servidor')
                }

                if (Number(body.id_donante) !== Number(usuario.id_usuario)) {
                    throw new Error('No tienes permisos para ver esta donacion')
                }

                setDetalle(body)
            })
            .catch((err) => {
                setError(err.message || 'No se pudo cargar el detalle de la donacion')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [idDonacion, navigate])

    const progreso = useMemo(() => {
        if (!detalle) return 0
        return calcularProgreso(detalle.cantidad_recibida, detalle.cantidad_necesaria)
    }, [detalle])

    if (loading) {
        return <div className="empty-box">Cargando detalle de donacion...</div>
    }

    if (error) {
        return <div className="error-box">{error}</div>
    }

    if (!detalle) {
        return <div className="empty-box">No se encontro el detalle de la donacion.</div>
    }

    return (
        <section className="donations-page fade-in donations-page-figma">
            <button type="button" className="detail-back detail-back-figma" onClick={() => navigate('/donaciones')}>
                Volver al historial
            </button>

            <header className="donations-header-figma">
                <h1 className="donations-main-title">Detalle de Donacion #{detalle.id_donacion}</h1>
                <p className="donations-main-subtitle">Campana: {detalle.publicacion_titulo}</p>
            </header>

            <div className="stats-grid stats-grid-figma">
                <article className="stat-card stat-card-figma">
                    <p className="stat-label stat-label-figma">Estado de la campana</p>
                    <p className="stat-value stat-value-figma">{detalle.publicacion_estado}</p>
                </article>

                <article className="stat-card stat-card-figma">
                    <p className="stat-label stat-label-figma">Fecha de donacion</p>
                    <p className="stat-value stat-value-figma">{formatearFecha(detalle.fecha_donacion)}</p>
                </article>

                <article className="stat-card stat-card-figma">
                    <p className="stat-label stat-label-figma">Progreso actual</p>
                    <p className="stat-value stat-value-figma">{progreso}%</p>
                </article>

                <article className="stat-card stat-card-figma">
                    <p className="stat-label stat-label-figma">Cantidad donada</p>
                    <p className="stat-value stat-value-figma">{formatearCantidad(detalle.cantidad_donada)}</p>
                </article>
            </div>

            <section className="donations-panel-figma donation-detail-panel-figma">
                <div className="donation-detail-section-figma">
                    <article className="donation-detail-card-figma donation-detail-summary-figma">
                        <div className="donation-detail-card-head-figma">
                            <div>
                                <p className="donation-detail-eyebrow-figma">Campana</p>
                                <h3 className="donation-row-title-figma">Seguimiento del progreso</h3>
                            </div>
                            <span className={`status-badge donation-row-status-figma estado-${detalle.publicacion_estado || 'activa'}`}>
                                {detalle.publicacion_estado}
                            </span>
                        </div>

                        <div className="donation-row-progress-card-figma donation-row-progress-card-detail-figma">
                            <div className="donation-row-progress-head-figma">
                                <div>
                                    <p className="donation-row-progress-label-figma">Avance de la meta</p>
                                    <p className="donation-row-progress-amounts-figma">
                                        {formatearCantidad(detalle.cantidad_recibida)} recibidos de{' '}
                                        {formatearCantidad(detalle.cantidad_necesaria)}
                                    </p>
                                </div>
                                <span className="donation-row-progress-text-figma">{progreso}%</span>
                            </div>

                            <div className="donation-row-progress-figma">
                                <div
                                    className="progress-track donation-progress-track-figma"
                                    aria-label={`Progreso actual de la campana: ${progreso}%`}
                                >
                                    <div className="progress-fill" style={{ width: `${progreso}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="donation-detail-metrics-figma">
                            <div className="donation-detail-metric-figma">
                                <span className="donation-detail-metric-label-figma">Tu aporte</span>
                                <strong>{formatearCantidad(detalle.cantidad_donada)}</strong>
                            </div>
                            <div className="donation-detail-metric-figma">
                                <span className="donation-detail-metric-label-figma">Categoria</span>
                                <strong>{detalle.categoria || 'Sin categoria'}</strong>
                            </div>
                            <div className="donation-detail-metric-figma">
                                <span className="donation-detail-metric-label-figma">Hora preferida</span>
                                <strong>{detalle.hora_preferida || 'No especificada'}</strong>
                            </div>
                        </div>
                    </article>
                </div>

                <div className="donation-detail-section-figma donation-detail-grid-figma">
                    <article className="donation-detail-card-figma">
                        <p className="donation-detail-eyebrow-figma">Organizacion</p>
                        <h3 className="donation-row-title-figma">{detalle.organizacion_nombre}</h3>
                        <div className="donation-detail-stack-figma">
                            <p>{detalle.organizacion_direccion || 'Direccion no disponible'}</p>
                        </div>
                    </article>

                    <article className="donation-detail-card-figma">
                        <p className="donation-detail-eyebrow-figma">Tu registro</p>
                        <h3 className="donation-row-title-figma">Datos de entrega</h3>
                        <div className="donation-detail-stack-figma">
                            <p>{detalle.descripcion || 'Sin descripcion'}</p>
                            <p>
                                Contacto: {detalle.nombre_contacto || 'No disponible'} | {detalle.telefono_contacto || 'Sin telefono'}
                            </p>
                            {detalle.nota && <p>Nota: {detalle.nota}</p>}
                        </div>
                    </article>
                </div>

                <div className="donation-detail-section-figma">
                    <article className="donation-detail-card-figma">
                        <p className="donation-detail-eyebrow-figma">Articulos</p>
                        <h3 className="donation-row-title-figma">Articulos de la campana</h3>
                        {Array.isArray(detalle.articulos) && detalle.articulos.length > 0 ? (
                            <div className="donation-items-list-figma">
                                {detalle.articulos.map((articulo) => (
                                    <div key={articulo.id_articulo} className="donation-item-figma">
                                        <div className="donation-item-content-figma">
                                            <p className="donation-item-title-figma">{articulo.articulo}</p>
                                            <p className="donation-item-description-figma">
                                                {articulo.descripcion_detalle || 'Sin detalle adicional'}
                                            </p>
                                        </div>
                                        <span className="donation-row-category-figma donation-item-badge-figma">
                                            Cantidad: {formatearCantidad(articulo.cantidad)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="donation-detail-empty-figma">No hay articulos asociados en esta campana.</p>
                        )}
                    </article>
                </div>

                <div className="donation-detail-section-figma donation-detail-actions-figma">
                    <button
                        type="button"
                        className="campaign-button donation-detail-button-figma"
                        onClick={() => navigate(`/detalle/${detalle.id_publicacion}`)}
                    >
                        Ver detalle de la campana
                    </button>
                </div>
            </section>
        </section>
    )
}

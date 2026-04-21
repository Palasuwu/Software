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
    }, [idDonacion])

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
                    <p className="stat-value stat-value-figma">{detalle.cantidad_donada}</p>
                </article>
            </div>

            <section className="donations-panel-figma">
                <article className="donation-row-figma" style={{ marginBottom: 16 }}>
                    <div className="donation-row-left-figma">
                        <h3 className="donation-row-title-figma">Organizacion</h3>
                        <p>{detalle.organizacion_nombre}</p>
                        <p>{detalle.organizacion_direccion}</p>
                        <p>Categoria: {detalle.categoria || 'Sin categoria'}</p>
                    </div>
                </article>

                <article className="donation-row-figma" style={{ marginBottom: 16 }}>
                    <div className="donation-row-left-figma">
                        <h3 className="donation-row-title-figma">Tu registro de entrega</h3>
                        <p>{detalle.descripcion || 'Sin descripcion'}</p>
                        <p>
                            Contacto: {detalle.nombre_contacto} | {detalle.telefono_contacto}
                        </p>
                        <p>
                            Hora preferida: {detalle.hora_preferida || 'No especificada'}
                        </p>
                        {detalle.nota && <p>Nota: {detalle.nota}</p>}
                        <p>
                            Meta: {detalle.cantidad_necesaria} | Recibido: {detalle.cantidad_recibida}
                        </p>
                    </div>
                </article>

                <article className="donation-row-figma">
                    <div className="donation-row-left-figma">
                        <h3 className="donation-row-title-figma">Articulos de la campana</h3>
                        {Array.isArray(detalle.articulos) && detalle.articulos.length > 0 ? (
                            detalle.articulos.map((articulo) => (
                                <p key={articulo.id_articulo}>
                                    {articulo.articulo}: {articulo.descripcion_detalle || 'Sin detalle'} ({articulo.cantidad})
                                </p>
                            ))
                        ) : (
                            <p>No hay articulos asociados en esta campana.</p>
                        )}
                    </div>
                </article>

                <div style={{ marginTop: 16 }}>
                    <button
                        type="button"
                        className="campaign-button"
                        onClick={() => navigate(`/detalle/${detalle.id_publicacion}`)}
                    >
                        Ver detalle de la campana
                    </button>
                </div>
            </section>
        </section>
    )
}

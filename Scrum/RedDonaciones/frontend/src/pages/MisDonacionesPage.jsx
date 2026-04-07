import React, { useEffect, useMemo, useState } from 'react'

const DONANTE_SIMULADO_ID = 1

function calcularProgreso(cantidadRecibida, cantidadNecesaria) {
    const necesaria = Number(cantidadNecesaria) || 0
    const recibida = Number(cantidadRecibida) || 0

    if (necesaria <= 0) {
        return 0
    }

    return Math.min(100, Math.round((recibida / necesaria) * 100))
}

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Sin fecha'
    }

    const date = new Date(fecha)
    if (Number.isNaN(date.getTime())) {
        return fecha
    }

    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export default function MisDonacionesPage() {
    const [donaciones, setDonaciones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        async function cargarDonaciones() {
            setLoading(true)
            setError('')

            try {
                const response = await fetch(`/api/donaciones?id_donante=${DONANTE_SIMULADO_ID}`)
                if (!response.ok) {
                    throw new Error('No fue posible obtener tus donaciones')
                }

                const data = await response.json()
                if (!cancelled) {
                    setDonaciones(Array.isArray(data) ? data : [])
                }
            } catch (fetchError) {
                if (!cancelled) {
                    setError(fetchError.message || 'Error inesperado al cargar donaciones')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        cargarDonaciones()

        return () => {
            cancelled = true
        }
    }, [])

    const resumen = useMemo(() => {
        const total = donaciones.length
        const activas = donaciones.filter((item) => item.publicacion_estado === 'activa').length
        const finalizadas = donaciones.filter((item) => item.publicacion_estado === 'finalizada').length

        return {
            total,
            activas,
            finalizadas
        }
    }, [donaciones])

    return (
        <section className="donations-page fade-in">
            <header className="page-intro">
                <span className="page-kicker">Panel personal</span>
                <h2 className="page-title">Mis Donaciones</h2>
                <p className="page-subtitle">
                    Historial de aportes del donante simulado #{DONANTE_SIMULADO_ID}. Esta vista consume datos reales del API.
                </p>
            </header>

            <div className="stats-grid">
                <article className="stat-card">
                    <p className="stat-label">Total de aportes</p>
                    <p className="stat-value">{resumen.total}</p>
                </article>
                <article className="stat-card stat-card-strong">
                    <p className="stat-label">Campanas activas</p>
                    <p className="stat-value">{resumen.activas}</p>
                </article>
                <article className="stat-card">
                    <p className="stat-label">Campanas finalizadas</p>
                    <p className="stat-value">{resumen.finalizadas}</p>
                </article>
            </div>

            {loading && <div className="loading-box">Cargando donaciones...</div>}

            {!loading && error && <div className="error-box">{error}</div>}

            {!loading && !error && donaciones.length === 0 && (
                <div className="empty-box">No hay donaciones registradas para este donante.</div>
            )}

            {!loading && !error && donaciones.length > 0 && (
                <div className="donation-list">
                    {donaciones.map((donacion) => {
                        const estado = donacion.publicacion_estado || 'activa'
                        const progreso = calcularProgreso(donacion.cantidad_recibida, donacion.cantidad_necesaria)

                        return (
                            <article key={donacion.id_donacion} className="donation-item">
                                <div className="donation-head">
                                    <div>
                                        <p className="donation-ref">Donacion #{donacion.id_donacion}</p>
                                        <h3 className="donation-title">{donacion.publicacion_titulo || 'Publicacion sin titulo'}</h3>
                                    </div>
                                    <span className={`status-badge estado-${estado}`}>{estado}</span>
                                </div>

                                <p className="donation-description">{donacion.descripcion}</p>

                                <div className="donation-meta">
                                    <span>Fecha donacion: {formatearFecha(donacion.fecha_donacion)}</span>
                                    <span>Fecha limite: {formatearFecha(donacion.fecha_limite)}</span>
                                </div>

                                <div className="progress-row">
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${progreso}%` }} />
                                    </div>
                                    <span className="progress-text">{progreso}%</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

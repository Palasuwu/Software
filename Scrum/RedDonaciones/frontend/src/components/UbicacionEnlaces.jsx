// Muestra la ubicacion de una organizacion o campana y ofrece abrirla en
// Google Maps o Waze. Con coordenadas apunta al punto exacto; sin ellas,
// busca por la direccion en texto.
import React from 'react'
import googleMapsSvg from '../assets/google-maps.svg'
import wazeSvg from '../assets/waze.svg'
import { formatearDireccion, hayUbicacion, tieneCoordenadas, urlGoogleMaps, urlWaze } from '../utils/mapas'
import './UbicacionEnlaces.css'

export default function UbicacionEnlaces({ ubicacion, nombre = '', titulo = 'Ubicación', heredada = false }) {
    if (!ubicacion || !hayUbicacion(ubicacion)) return null

    const direccion = formatearDireccion(ubicacion)
    const conCoordenadas = tieneCoordenadas(ubicacion)
    const maps = urlGoogleMaps(ubicacion, nombre)
    const waze = urlWaze(ubicacion, nombre)

    return (
        <section className="ubi-bloque" aria-label={titulo}>
            <p className="ubi-titulo">{titulo}</p>

            {direccion && <p className="ubi-direccion">{direccion}</p>}

            {heredada && (
                <p className="ubi-nota">Esta campaña usa la ubicación de la organización.</p>
            )}

            {conCoordenadas && (
                <p className="ubi-coords">
                    {Number(ubicacion.latitud).toFixed(5)}, {Number(ubicacion.longitud).toFixed(5)}
                </p>
            )}

            <div className="ubi-acciones">
                {maps && (
                    <a className="ubi-boton" href={maps} target="_blank" rel="noopener noreferrer">
                        <img src={googleMapsSvg} alt="" aria-hidden="true" />
                        <span>Ver en Google Maps</span>
                    </a>
                )}
                {waze && (
                    <a className="ubi-boton" href={waze} target="_blank" rel="noopener noreferrer">
                        <img src={wazeSvg} alt="" aria-hidden="true" />
                        <span>Cómo llegar con Waze</span>
                    </a>
                )}
            </div>

            {!conCoordenadas && (
                <p className="ubi-nota">
                    Sin coordenadas registradas: los enlaces buscan la dirección.
                </p>
            )}
        </section>
    )
}

// Filas de carga (skeleton) para tablas del panel admin y del panel de organizacion.
import React from 'react'

export default function SkeletonRows({ cols, rows = 5 }) {
    return Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="skeleton-row">
            {Array.from({ length: cols }).map((__, j) => (
                <td key={j}><div className="skeleton-cell" /></td>
            ))}
        </tr>
    ))
}

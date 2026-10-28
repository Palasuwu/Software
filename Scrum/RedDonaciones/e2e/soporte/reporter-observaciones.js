// Junta las observaciones de todos los navegadores en un solo registro y arma la matriz de compatibilidad.
const fs = require('fs')
const path = require('path')

const SEVERIDAD = { S1: 'Baja', S2: 'Media', S3: 'Alta', S4: 'Crítica' }
const ICONO = { passed: '✅', failed: '❌', timedOut: '❌', skipped: '⏭️', interrupted: '⚠️' }

class ReporterObservaciones {
    constructor(opciones = {}) {
        this.carpeta = opciones.carpeta || 'resultados'
        this.resultados = []
    }

    onTestEnd(test, result) {
        const proyecto = test.parent.project()?.name || '?'
        const archivo = path.basename(test.location.file).replace('.e2e.js', '')
        this.resultados.push({
            proyecto,
            recorrido: `${archivo} › ${test.title}`,
            estado: result.status,
            duracionMs: result.duration,
            error: result.errors.map((e) => (e.message || '').split('\n')[0].replace(/\x1b\[[0-9;]*m/g, '')).filter(Boolean),
            anotaciones: [...new Map(test.annotations.concat(result.annotations || [])
                .map((a) => [`${a.type}|${a.description}`, a])).values()]
        })
    }

    onEnd() {
        fs.mkdirSync(this.carpeta, { recursive: true })
        const proyectos = [...new Set(this.resultados.map((r) => r.proyecto))]
        const fecha = new Date().toLocaleString('es-GT')

        // Una fila por observación, con los navegadores donde apareció.
        const obs = new Map()
        for (const r of this.resultados) {
            for (const a of r.anotaciones.filter((x) => x.type === 'observacion')) {
                const [sev, pantalla, texto] = a.description.split(' | ')
                const clave = `${sev}|${pantalla}|${texto}`
                if (!obs.has(clave)) obs.set(clave, { sev, pantalla, texto, recorrido: r.recorrido, en: new Set() })
                obs.get(clave).en.add(r.proyecto)
            }
        }
        const filas = [...obs.values()].sort((a, b) => b.sev.localeCompare(a.sev) || a.pantalla.localeCompare(b.pantalla))

        const md = []
        md.push('# Registro de observaciones de usabilidad y compatibilidad', '', `Generado: ${fecha}`, '')
        md.push('## Matriz de compatibilidad', '')
        md.push(`| Recorrido | ${proyectos.join(' | ')} |`, `|---|${proyectos.map(() => ':-:').join('|')}|`)
        for (const rec of [...new Set(this.resultados.map((r) => r.recorrido))]) {
            const celdas = proyectos.map((p) => {
                const r = this.resultados.find((x) => x.recorrido === rec && x.proyecto === p)
                return r ? ICONO[r.estado] || r.estado : '—'
            })
            md.push(`| ${rec} | ${celdas.join(' | ')} |`)
        }

        const fallas = this.resultados.filter((r) => r.estado !== 'passed' && r.estado !== 'skipped')
        if (fallas.length) {
            md.push('', '## Fallas', '')
            for (const f of fallas) md.push(`- **${f.proyecto}** · ${f.recorrido}: ${f.error.slice(0, 3).join(' / ') || f.estado}`)
        }

        md.push('', '## Observaciones', '')
        md.push('| ID | Severidad | Pantalla | Observación | Dónde se vio | Corrección | Estado |', '|---|---|---|---|---|---|---|')
        filas.forEach((o, i) => {
            const donde = o.en.size === proyectos.length ? 'Todos' : [...o.en].join(', ')
            md.push(`| OBS-${String(i + 1).padStart(2, '0')} | ${SEVERIDAD[o.sev] || o.sev} | ${o.pantalla} | ${o.texto} | ${donde} | | Pendiente |`)
        })

        const mediciones = this.resultados.flatMap((r) => r.anotaciones.filter((a) => a.type === 'medicion').map((a) => ({ p: r.proyecto, d: a.description })))
        if (mediciones.length) {
            md.push('', '## Mediciones', '', '| Navegador | Medición | Tiempo |', '|---|---|---|')
            for (const m of mediciones) {
                const [n, t] = m.d.split(' | ')
                md.push(`| ${m.p} | ${n} | ${t} |`)
            }
        }

        fs.writeFileSync(path.join(this.carpeta, 'observaciones.md'), md.join('\n') + '\n')
        fs.writeFileSync(path.join(this.carpeta, 'resultados.json'), JSON.stringify({
            fecha,
            resultados: this.resultados.map(({ anotaciones, ...r }) => ({ ...r, anotaciones }))
        }, null, 2))
        console.log(`\nRegistro de observaciones: ${path.join(this.carpeta, 'observaciones.md')} (${filas.length} observaciones)`)
    }
}

module.exports = ReporterObservaciones

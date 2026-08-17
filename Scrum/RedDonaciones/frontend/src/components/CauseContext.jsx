import React from 'react'


const MENSAJES_POR_CATEGORIA = [
  {
    palabras: ['alimento', 'comida'],
    mensaje: 'Un alimento entregado a tiempo ayuda a que una familia pueda concentrarse en salir adelante.'
  },
  {
    palabras: ['ropa', 'abrigo', 'vestimenta'],
    mensaje: 'Una prenda en buen estado ofrece abrigo, comodidad y dignidad a quien la recibe.'
  },
  {
    palabras: ['educación', 'educacion', 'escolar', 'libro'],
    mensaje: 'Los materiales adecuados abren oportunidades para aprender y continuar estudiando.'
  },
  {
    palabras: ['salud', 'higiene', 'medicina'],
    mensaje: 'Los artículos de cuidado personal contribuyen directamente al bienestar diario.'
  }
]


export function mensajeDeConcientizacion(categoria = '') {
  const categoriaNormalizada = categoria.toLowerCase()
  const coincidencia = MENSAJES_POR_CATEGORIA.find(({ palabras }) =>
    palabras.some((palabra) => categoriaNormalizada.includes(palabra))
  )

  return coincidencia?.mensaje
    || 'Cada aporte útil fortalece el trabajo de la organización y acerca la ayuda a quienes la necesitan.'
}


export default function CauseContext({ categoria, organizacion }) {
  return (
    <aside className="dp-cause-context" aria-labelledby="cause-context-title">
      <div className="dp-cause-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />
        </svg>
      </div>
      <div className="dp-cause-copy">
        <span className="dp-cause-eyebrow">El impacto de tu ayuda</span>
        <h2 id="cause-context-title">¿Por qué importa esta causa?</h2>
        <p>{mensajeDeConcientizacion(categoria)}</p>
        <p className="dp-cause-org">
          Tu donación será coordinada por <strong>{organizacion}</strong> para apoyar esta campaña.
        </p>
        <div className="dp-cause-note">
          Dona únicamente artículos útiles y en buen estado. Así cuidamos a las personas beneficiadas
          y facilitamos el trabajo de quienes reciben y distribuyen la ayuda.
        </div>
      </div>
    </aside>
  )
}

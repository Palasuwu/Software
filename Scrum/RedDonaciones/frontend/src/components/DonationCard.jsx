import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import defaultImg from '../assets/Defult.jpg'
import { IconLocation, IconUsers } from './icons'
import './DonationCard.css'

function formatAmount(value) {
  return new Intl.NumberFormat('es-GT').format(value)
}

export default function DonationCard({ org, index = 0 }) {
  const navigate = useNavigate()
  const groupPos = index % 6
  const isFeatured = groupPos === 0 || groupPos === 5

  return (
    <motion.article
      className={`campaign-card${isFeatured ? ' campaign-card--featured' : ''}`}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => navigate(`/detalle/${org.id}`)}
    >
      <div className="campaign-image-wrap">
        <img
          className="campaign-image"
          src={org.imagen}
          alt={org.title}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = defaultImg }}
        />
        <span className="campaign-tag">{org.category}</span>
      </div>

      <div className="campaign-body">
        <h3 className="campaign-title">{org.title}</h3>
        <p className="campaign-org">{org.organizacion}</p>

        <div className="campaign-location">
          <IconLocation />
          <span>{org.location || 'Ubicacion no disponible'}</span>
        </div>

        <p className="campaign-description">{org.description}</p>

        <div className="campaign-stats-head">
          <span>Progreso</span>
          <strong>{org.progress}%</strong>
        </div>

        <div className="progress-track progress-track-home">
          <div className="progress-fill" style={{ width: `${org.progress}%` }} />
        </div>

        <div className="campaign-supporters">
          <IconUsers />
          <span>{formatAmount(org.supporters)} unidades registradas</span>
        </div>

        <button
          className="campaign-button"
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/detalle/${org.id}`)
          }}
        >
          Ver detalle
        </button>
      </div>
    </motion.article>
  )
}

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function IconSearch() {
  return (
    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterSection({ title, isOpen, onToggle, children }) {
  return (
    <div className={`hf-section${isOpen ? ' hf-section--open' : ''}`}>
      <button type="button" className="hf-section-toggle" onClick={onToggle}>
        <span>{title}</span>
        <span className="hf-chevron">▾</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="section-body"
            className="hf-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HomeFilterSidebar({
  query,
  category,
  estado,
  organizacion,
  progressRange,
  categoriasDisponibles,
  organizacionesDisponibles,
  onQueryChange,
  onCategoryChange,
  onEstadoChange,
  onOrganizacionChange,
  onProgressRangeChange,
  onReset,
  isOpen,
  onClose,
}) {
  const [sections, setSections] = React.useState({
    estado: true,
    categoria: true,
    organizacion: false,
    progreso: false,
  })

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const estadoOptions = [
    { value: 'Todos', label: 'Todos' },
    { value: 'activa', label: 'Activa' },
    { value: 'finalizada', label: 'Finalizada' },
  ]

  const progresoOptions = [
    { value: 'Todos', label: 'Todos' },
    { value: 'Bajo', label: '≤ 49%' },
    { value: 'Medio', label: '≥ 50%' },
    { value: 'Completo', label: '100%' },
  ]

  return (
    <>
      {/* Overlay scrim — mobile only, animated via Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="hf-overlay"
            className="hf-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — CSS handles sticky (desktop) vs fixed drawer (mobile) */}
      <aside className={`hf-sidebar${isOpen ? ' hf-sidebar--open' : ''}`}>

        {/* ── Header ── */}
        <div className="hf-sidebar-head">
          <div className="hf-title-row">
            <h2 className="hf-title">Campañas</h2>
            <button
              type="button"
              className="hf-close-btn"
              onClick={onClose}
              aria-label="Cerrar filtros"
            >
              ✕
            </button>
          </div>

          <div className="hf-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Buscar campañas..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>
        </div>

        {/* ── Estado ── */}
        <FilterSection
          title="Estado"
          isOpen={sections.estado}
          onToggle={() => toggleSection('estado')}
        >
          {estadoOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`hf-filter-item${estado === value ? ' hf-filter-item--active' : ''}`}
              onClick={() => onEstadoChange(value)}
            >
              {label}
            </button>
          ))}
        </FilterSection>

        {/* ── Categoría ── */}
        <FilterSection
          title="Categoría"
          isOpen={sections.categoria}
          onToggle={() => toggleSection('categoria')}
        >
          <button
            type="button"
            className={`hf-filter-item${category === 'Todas' ? ' hf-filter-item--active' : ''}`}
            onClick={() => onCategoryChange('Todas')}
          >
            Todas
          </button>
          {categoriasDisponibles.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`hf-filter-item${category === cat ? ' hf-filter-item--active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </FilterSection>

        {/* ── Organización ── */}
        <FilterSection
          title="Organización"
          isOpen={sections.organizacion}
          onToggle={() => toggleSection('organizacion')}
        >
          <button
            type="button"
            className={`hf-filter-item${organizacion === 'Todas' ? ' hf-filter-item--active' : ''}`}
            onClick={() => onOrganizacionChange('Todas')}
          >
            Todas
          </button>
          {organizacionesDisponibles.map((org) => (
            <button
              key={org}
              type="button"
              className={`hf-filter-item${organizacion === org ? ' hf-filter-item--active' : ''}`}
              onClick={() => onOrganizacionChange(org)}
            >
              {org}
            </button>
          ))}
        </FilterSection>

        {/* ── Progreso ── */}
        <FilterSection
          title="Progreso"
          isOpen={sections.progreso}
          onToggle={() => toggleSection('progreso')}
        >
          {progresoOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`hf-filter-item${progressRange === value ? ' hf-filter-item--active' : ''}`}
              onClick={() => onProgressRangeChange(value)}
            >
              {label}
            </button>
          ))}
        </FilterSection>

        {/* ── Reset ── */}
        <button type="button" className="hf-reset" onClick={onReset}>
          Limpiar filtros
        </button>
      </aside>
    </>
  )
}

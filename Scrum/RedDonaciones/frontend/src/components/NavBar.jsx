import React from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'

/* ── Icon helpers ─────────────────────────────────────────────────────── */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function IconDonation() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l7 4v6c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
    </svg>
  )
}

/* ── Motion variants ──────────────────────────────────────────────────── */
const spring = { type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }

const containerVariants = {
  collapsed: { borderRadius: 20 },
  expanded:  { borderRadius: 12 },
}

const itemVariants = {
  collapsed: { height: 30, paddingLeft: 8,  paddingRight: 8  },
  expanded:  { height: 44, paddingLeft: 12, paddingRight: 12 },
}

const labelVariants = {
  collapsed: { width: 0, opacity: 0, marginLeft: 0 },
  expanded:  { width: 'auto', opacity: 1, marginLeft: 8 },
}

/* ── MotionNavLink — NavLink animable por Framer Motion ───────────────── */
const MotionNavLink = motion(NavLink)

/* ── NavItem — definido fuera de NavBar para evitar re-creación ───────── */
function NavItem({ to, icon, label, end = false, isExpanded }) {
  const state = isExpanded ? 'expanded' : 'collapsed'
  return (
    <MotionNavLink
      to={to}
      end={end}
      className={({ isActive }) => `nb-item${isActive ? ' nb-item--active' : ''}`}
      initial="collapsed"
      animate={state}
      variants={itemVariants}
      transition={spring}
    >
      <span className="nb-icon">{icon}</span>
      <motion.span
        className="nb-label"
        initial="collapsed"
        animate={state}
        variants={labelVariants}
        transition={spring}
        style={{ overflow: 'hidden', display: 'inline-block', whiteSpace: 'nowrap' }}
      >
        {label}
      </motion.span>
    </MotionNavLink>
  )
}

/* ── NavBar ───────────────────────────────────────────────────────────── */
export default function NavBar({ isAuthenticated, usuarioSesion, onLogout, isExpanded }) {
  const expanded = isExpanded ?? false
  const state = expanded ? 'expanded' : 'collapsed'
  const isAdmin = usuarioSesion?.rol === 'administrador'

  return (
    <motion.div
      className="top-nav"
      initial="collapsed"
      animate={state}
      variants={containerVariants}
      transition={spring}
    >
      <NavItem to="/home" icon={<IconHome />} label="Inicio" end isExpanded={expanded} />

      {isAuthenticated && (
        <NavItem to="/donaciones" icon={<IconDonation />} label="Mis Donaciones" isExpanded={expanded} />
      )}

      {isAuthenticated && (
        <NavItem to="/perfil" icon={<IconUser />} label="Perfil" isExpanded={expanded} />
      )}

      {isAuthenticated && isAdmin && (
        <NavItem to="/admin" icon={<IconAdmin />} label="Panel Admin" isExpanded={expanded} />
      )}

      <NavItem to="/organizaciones" icon={<IconUsers />} label="Organizaciones" isExpanded={expanded} />

      {!isAuthenticated && (
        <NavItem to="/login" icon={<IconUser />} label="Iniciar sesión" isExpanded={expanded} />
      )}

      {isAuthenticated && (
        <motion.button
          type="button"
          className="nb-item nb-logout"
          onClick={onLogout}
          initial="collapsed"
          animate={state}
          variants={itemVariants}
          transition={spring}
          whileTap={{ scale: 0.97 }}
        >
          <span className="nb-icon"><IconRegister /></span>
          <motion.span
            className="nb-label"
            initial="collapsed"
            animate={state}
            variants={labelVariants}
            transition={spring}
            style={{ overflow: 'hidden', display: 'inline-block', whiteSpace: 'nowrap' }}
          >
            Cerrar sesión
          </motion.span>
        </motion.button>
      )}
    </motion.div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { IconHome, IconDonation, IconUser, IconRegister, IconAdmin, IconUsers } from './icons'
import NotificationCenter from './NotificationCenter'

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
  const isIntermediario = usuarioSesion?.rol === 'intermediario'
  

  return (
    <motion.div
      className="top-nav"
      initial="collapsed"
      animate={state}
      variants={containerVariants}
      transition={spring}
    >
      <NavItem to="/home" icon={<IconHome className="nav-icon" />} label="Inicio" end isExpanded={expanded} />

      {isAuthenticated && (
        <NavItem to="/donaciones" icon={<IconDonation className="nav-icon" />} label="Mis Donaciones" isExpanded={expanded} />
      )}

      {isAuthenticated && (
        <NavItem to="/perfil" icon={<IconUser className="nav-icon" />} label="Perfil" isExpanded={expanded} />
      )}

      {isAuthenticated && (
        <NotificationCenter isExpanded={expanded} />
      )}

      {isAuthenticated && isAdmin && (
        <NavItem to="/admin" icon={<IconAdmin className="nav-icon" />} label="Panel Admin" isExpanded={expanded} />
      )}

      {isAuthenticated && isIntermediario && (
        <NavItem
          to="/intermediario"
          icon={<IconUsers className="nav-icon" />}
          label="Mi Organización"
          isExpanded={expanded}
        />
      )}

      <NavItem to="/organizaciones" icon={<IconUsers className="nav-icon" />} label="Organizaciones" isExpanded={expanded} />

      {!isAuthenticated && (
        <NavItem to="/login" icon={<IconUser className="nav-icon" />} label="Iniciar sesión" isExpanded={expanded} />
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
          <span className="nb-icon"><IconRegister className="nav-icon" /></span>
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

// Barra de navegacion superior de la app autenticada.
//
// Es estatica a proposito: antes se mostraba colapsada (solo iconos de 30px)
// y solo revelaba las etiquetas al pasar el mouse por el header, asi que en
// pantallas tactiles y navegando con teclado la navegacion quedaba sin texto.
// Ahora las etiquetas estan siempre visibles y los destinos miden 44px de
// alto. En pantallas medianas el CSS oculta el texto, pero cada destino
// conserva su nombre accesible (aria-label + title).
import React from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { IconHome, IconDonation, IconUser, IconRegister, IconAdmin, IconUsers } from './icons'
import NotificationCenter from './NotificationCenter'

function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nb-item${isActive ? ' nb-item--active' : ''}`}
      aria-label={label}
      title={label}
    >
      <span className="nb-icon">{icon}</span>
      <span className="nb-label">{label}</span>
    </NavLink>
  )
}

export default function NavBar({ isAuthenticated, usuarioSesion, onLogout }) {
  const isAdmin = usuarioSesion?.rol === 'administrador'
  const isIntermediario = usuarioSesion?.rol === 'intermediario'

  return (
    <nav className="top-nav" aria-label="Navegación principal">
      <NavItem to="/home" icon={<IconHome className="nav-icon" />} label="Inicio" end />

      {isAuthenticated && (
        <NavItem to="/donaciones" icon={<IconDonation className="nav-icon" />} label="Mis Donaciones" />
      )}

      {isAuthenticated && (
        <NavItem to="/perfil" icon={<IconUser className="nav-icon" />} label="Perfil" />
      )}

      {isAuthenticated && <NotificationCenter />}

      {isAuthenticated && isAdmin && (
        <NavItem to="/admin" icon={<IconAdmin className="nav-icon" />} label="Panel Admin" />
      )}

      {isAuthenticated && isIntermediario && (
        <NavItem to="/intermediario" icon={<IconUsers className="nav-icon" />} label="Mi Organización" />
      )}

      <NavItem to="/organizaciones" icon={<IconUsers className="nav-icon" />} label="Sobre Nosotros" />

      {!isAuthenticated && (
        <NavItem to="/login" icon={<IconUser className="nav-icon" />} label="Iniciar sesión" />
      )}

      {isAuthenticated && (
        // whileTap si se conserva: es realimentacion al pulsar, no depende del
        // mouse y funciona igual con dedo o teclado.
        <motion.button
          type="button"
          className="nb-item nb-logout"
          onClick={onLogout}
          whileTap={{ scale: 0.97 }}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <span className="nb-icon"><IconRegister className="nav-icon" /></span>
          <span className="nb-label">Cerrar sesión</span>
        </motion.button>
      )}
    </nav>
  )
}

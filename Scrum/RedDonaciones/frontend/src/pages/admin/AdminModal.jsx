// Modal generico del panel de administrador: header con titulo/descripcion,
// cuerpo con children, footer opcional. AdminPanel y OrgaPanel deciden que
// contenido renderizar adentro.
import React from 'react'

export default function AdminModal({ title, description, children, footer, onClose, sizeClass = '' }) {
    return (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className={`admin-modal ${sizeClass}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-modal-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="admin-modal-header">
                    <div>
                        <h2 id="admin-modal-title">{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Cerrar modal">
                        x
                    </button>
                </header>
                <div className="admin-modal-body">{children}</div>
                {footer && <footer className="admin-modal-footer">{footer}</footer>}
            </section>
        </div>
    )
}

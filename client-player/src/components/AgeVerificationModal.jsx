import React from 'react';
import '../styles/AgeVerificationModal.css';

export default function AgeVerificationModal({ onConfirm, onDecline }) {
  return (
    <div className="age-modal-overlay">
      <div className="age-modal-container">
        {/* Icono decorativo */}
        <div className="age-modal-icon">
          <span>🔞</span>
        </div>

        {/* Título */}
        <h2 className="age-modal-title">Verificación de Edad</h2>

        {/* Mensaje */}
        <p className="age-modal-message">
          Confirmá que sos mayor de <span className="age-highlight">18 años</span>
        </p>

        {/* Subtexto legal */}
        <p className="age-modal-legal">
          Este sitio contiene juegos de azar. El acceso está restringido a mayores de edad.
        </p>

        {/* Botones */}
        <div className="age-modal-buttons">
          <button 
            className="age-btn age-btn-yes"
            onClick={onConfirm}
          >
            <span className="btn-icon">✓</span>
            Sí, soy mayor de 18
          </button>
          <button 
            className="age-btn age-btn-no"
            onClick={onDecline}
          >
            <span className="btn-icon">✕</span>
            No, soy menor
          </button>
        </div>

        {/* Decoración inferior */}
        <div className="age-modal-footer">
          <img src="/logo.png" alt="Bingo 24K" className="age-modal-logo" />
        </div>
      </div>
    </div>
  );
}

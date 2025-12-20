import React from 'react';
import { FaGift, FaTimes } from 'react-icons/fa';
import '../styles/PackageSelectionModal.css';

const PackageSelectionModal = ({ onSelectPackage, onClose, roomTheme }) => {
  const packages = [
    {
      id: 'no-bonus',
      title: 'Elegir Cartones sin Yapa',
      description: 'Selecciona tus cartones normalmente',
      buy: 0,
      bonus: 0,
      total: 0,
      animationLevel: 0
    },
    {
      id: '5-plus-1',
      title: 'Elegí 5 Cartones + 1 de Yapa',
      description: '¡1 Gift Card GRATIS!',
      buy: 5,
      bonus: 1,
      total: 6,
      animationLevel: 1
    },
    {
      id: '10-plus-4',
      title: 'Elegí 10 Cartones + 4 de Yapa',
      description: '¡4 Gift Cards GRATIS!',
      buy: 10,
      bonus: 4,
      total: 14,
      animationLevel: 2
    },
    {
      id: '20-plus-10',
      title: 'Elegí 20 Cartones y llevate 10 de Yapa',
      description: '¡10 Gift Cards GRATIS! ¡MÁXIMO BENEFICIO!',
      buy: 20,
      bonus: 10,
      total: 30,
      animationLevel: 3
    }
  ];

  return (
    <div className="package-modal-overlay">
      <div className={`package-modal theme-${roomTheme}`}>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h2 className="modal-title">Selecciona tu Paquete</h2>
        <p className="modal-subtitle">Elige cuántos cartones quieres y obtén yapas gratis</p>

        <div className="packages-container">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              className={`package-option animation-level-${pkg.animationLevel}`}
              onClick={() => onSelectPackage(pkg)}
            >
              <div className="package-content">
                <div className="package-header">
                  <h3 className="package-title">{pkg.title}</h3>
                  {pkg.bonus > 0 && (
                    <div className="bonus-badge">
                      <FaGift /> +{pkg.bonus}
                    </div>
                  )}
                </div>
                
                <p className="package-description">{pkg.description}</p>
                
                {pkg.bonus > 0 && (
                  <div className="package-breakdown">
                    <span className="buy-amount">{pkg.buy} para comprar</span>
                    <span className="plus-sign">+</span>
                    <span className="bonus-amount">{pkg.bonus} Gift Cards</span>
                    <span className="equals-sign">=</span>
                    <span className="total-amount">{pkg.total} total</span>
                  </div>
                )}
              </div>
              
              <div className="package-glow"></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PackageSelectionModal;

import React from 'react';
import { FaGift, FaTimes } from 'react-icons/fa';
import uiSoundService from '../services/uiSoundService';
import '../styles/PackageSelectionModal.css';

const PackageSelectionModal = ({ onSelectPackage, onClose, roomTheme, currentCards = 0 }) => {
  const MAX_CARDS_TOTAL = 30; // Límite máximo de cartones totales (pagos + PLUS)
  const MAX_CARDS_PAID = 20;  // Límite máximo de cartones PAGOS (sin contar PLUS)

  const packages = [
    {
      id: 'no-bonus',
      title: 'Elegir Cartones sin PLUS',
      description: 'Selecciona tus cartones normalmente',
      buy: 0,
      bonus: 0,
      total: 0,
      animationLevel: 0
    },
    {
      id: '5-plus-1',
      title: 'Elegí 5 Cartones + 1 PLUS',
      description: '¡1 Gift Card GRATIS!',
      buy: 5,
      bonus: 1,
      total: 6,
      animationLevel: 1
    },
    {
      id: '10-plus-4',
      title: 'Elegí 10 Cartones + 4 PLUS',
      description: '¡4 Gift Cards GRATIS!',
      buy: 10,
      bonus: 4,
      total: 14,
      animationLevel: 2
    },
    {
      id: '20-plus-10',
      title: 'Elegí 20 Cartones y llevate 10 PLUS',
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

        <h2 className="modal-title">PACK BINGO PLUS</h2>
        <p className="modal-subtitle">Elige cuántos cartones quieres y obtén gift cards PLUS gratis</p>

        <div className="packages-container">
          {packages.map((pkg) => {
            // Validar límite TOTAL (pagos + PLUS)
            const wouldExceedTotalLimit = (currentCards + pkg.total) > MAX_CARDS_TOTAL;

            // Validar límite de COMPRA (solo cartones pagos, sin contar PLUS)
            // Asumimos que currentCards son los cartones que ya tiene (pueden incluir PLUS de compras anteriores)
            // pkg.buy es cuántos cartones PAGOS va a comprar ahora
            // El límite de compra es cuántos cartones PAGOS puede tener en total (20)
            const wouldExceedPaidLimit = (currentCards + pkg.buy) > MAX_CARDS_PAID;

            const isDisabled = wouldExceedTotalLimit || wouldExceedPaidLimit;
            const remainingTotal = MAX_CARDS_TOTAL - currentCards;
            const remainingPaid = MAX_CARDS_PAID - currentCards;

            let disabledReason = '';
            if (wouldExceedTotalLimit) {
              disabledReason = `Excede límite total de ${MAX_CARDS_TOTAL} cartones (${remainingTotal} espacios)`;
            } else if (wouldExceedPaidLimit) {
              disabledReason = `Excede límite de compra de ${MAX_CARDS_PAID} cartones (solo puedes comprar ${remainingPaid} más)`;
            }

            return (
              <button
                key={pkg.id}
                className={`package-option animation-level-${pkg.animationLevel} ${isDisabled ? 'disabled' : ''}`}
                id={pkg.id === 'no-bonus' ? 'btn-package-no-bonus' : undefined}
                onClick={() => {
                  uiSoundService.playClick();
                  !isDisabled && onSelectPackage(pkg);
                }}
                disabled={isDisabled}
                title={isDisabled ? disabledReason : ''}
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

                {isDisabled && (
                  <div className="package-disabled-overlay">
                    <span>⚠️ {wouldExceedPaidLimit ? `Solo puedes comprar ${remainingPaid} más` : `Excede límite (${remainingTotal} espacios)`}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PackageSelectionModal;

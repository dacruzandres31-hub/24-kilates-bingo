import React from 'react';
import { FaGift, FaCrown, FaSync, FaTimes } from 'react-icons/fa';
import '../styles/VIPDailyBenefitsModal.css';

const VIPDailyBenefitsModal = ({ benefits, onClaimCards, onClaimSpins, onClose }) => {
    const { freeCards, extraSpins, tierName } = benefits;

    // Si no hay beneficios, no mostrar modal
    if (freeCards === 0 && extraSpins === 0) {
        return null;
    }

    return (
        <div className="vip-benefits-modal-overlay">
            <div className="vip-benefits-modal">
                <button className="close-btn" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="modal-header">
                    <FaCrown className="header-crown" />
                    <h2>¡Beneficios VIP Diarios!</h2>
                    <p className="tier-name">{tierName}</p>
                </div>

                <div className="benefits-grid">
                    {freeCards > 0 && (
                        <div className="benefit-card cards">
                            <div className="benefit-icon">
                                <FaGift />
                            </div>
                            <h3>{freeCards} Cartón{freeCards > 1 ? 'es' : ''} Gratis</h3>
                            <p className="benefit-description">Para Sala Oro</p>
                            <button className="claim-btn" onClick={onClaimCards}>
                                Reclamar Ahora
                            </button>
                        </div>
                    )}

                    {extraSpins > 0 && (
                        <div className="benefit-card spins">
                            <div className="benefit-icon">
                                <FaSync />
                            </div>
                            <h3>{extraSpins} Giro{extraSpins > 1 ? 's' : ''} Extra VIP</h3>
                            <p className="benefit-description">Rueda de la Fortuna</p>
                            <button className="claim-btn" onClick={onClaimSpins}>
                                Usar Ahora
                            </button>
                        </div>
                    )}
                </div>

                <button className="later-btn" onClick={onClose}>
                    Más Tarde
                </button>

                <p className="modal-note">
                    Estos beneficios se renuevan cada día
                </p>
            </div>
        </div>
    );
};

export default VIPDailyBenefitsModal;

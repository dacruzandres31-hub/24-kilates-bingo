import React from 'react';
import { FaGift, FaCrown } from 'react-icons/fa';
import '../styles/DailyFreeCardsModal.css';

const DailyFreeCardsModal = ({ availableCards, tierName, onAccept, onDecline }) => {
    return (
        <div className="daily-free-modal-overlay">
            <div className="daily-free-modal">
                <div className="modal-icon-container">
                    <FaGift className="gift-icon" />
                    <FaCrown className="crown-icon" />
                </div>

                <h2 className="modal-title">¡Cartones Gratis VIP!</h2>

                <div className="cards-count-container">
                    <span className="cards-count">{availableCards}</span>
                    <span className="cards-label">
                        Cartón{availableCards > 1 ? 'es' : ''} Gratis
                    </span>
                </div>

                <p className="tier-badge">{tierName}</p>
                <p className="modal-subtitle">¿Seleccionar Ahora?</p>

                <div className="modal-actions">
                    <button onClick={onAccept} className="btn-accept">
                        <FaGift /> Sí, Elegir Ahora
                    </button>
                    <button onClick={onDecline} className="btn-decline">
                        No, Más Tarde
                    </button>
                </div>

                <p className="modal-note">
                    Los cartones gratis se renuevan cada día
                </p>
            </div>
        </div>
    );
};

export default DailyFreeCardsModal;

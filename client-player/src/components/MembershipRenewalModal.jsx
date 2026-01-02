import React from 'react';
import { FaCrown, FaTimes, FaExclamationTriangle, FaGift, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/MembershipRenewalModal.css';

const MembershipRenewalModal = ({ daysLeft, tierName, benefits, onClose }) => {
    const navigate = useNavigate();

    // Determinar nivel de urgencia
    const getUrgencyLevel = () => {
        if (daysLeft === 1) return 'critical';
        if (daysLeft <= 2) return 'high';
        if (daysLeft <= 3) return 'medium';
        return 'low';
    };

    const urgency = getUrgencyLevel();

    const handleRenew = () => {
        navigate('/membership');
        onClose();
    };

    return (
        <div className={`renewal-modal-overlay urgency-${urgency}`}>
            <div className={`renewal-modal urgency-${urgency}`}>
                <button className="close-btn" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="modal-icon-container">
                    <FaCrown className="crown-icon" />
                    {daysLeft <= 2 && <FaExclamationTriangle className="warning-icon" />}
                </div>

                <h2 className="modal-title">
                    {daysLeft === 1 ? '⚠️ ¡ÚLTIMO DÍA!' : `⏰ ${daysLeft} Días para Renovar`}
                </h2>

                <div className="tier-badge">{tierName}</div>

                <p className="expiration-message">
                    {daysLeft === 1
                        ? 'Tu membresía vence HOY. ¡Renueva ahora para no perder tus beneficios!'
                        : `Tu membresía vence en ${daysLeft} días. Renueva para seguir disfrutando de:`
                    }
                </p>

                <div className="benefits-list">
                    {benefits?.daily_free_cards > 0 && (
                        <div className="benefit-item">
                            <FaGift className="benefit-icon" />
                            <span>{benefits.daily_free_cards} Cartón{benefits.daily_free_cards > 1 ? 'es' : ''} Gratis Diarios</span>
                        </div>
                    )}

                    {benefits?.daily_wheel_spins > 0 && (
                        <div className="benefit-item">
                            <FaStar className="benefit-icon" />
                            <span>{benefits.daily_wheel_spins} Giro{benefits.daily_wheel_spins > 1 ? 's' : ''} Extra Diarios</span>
                        </div>
                    )}

                    {benefits?.pack_bingo_bonus && (
                        <div className="benefit-item">
                            <FaStar className="benefit-icon" />
                            <span>Bonus Compra: {benefits.pack_bingo_bonus.free_cards} cartones gratis</span>
                        </div>
                    )}

                    <div className="benefit-item">
                        <FaCrown className="benefit-icon" />
                        <span>Insignia VIP y Chat Animado</span>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-renew" onClick={handleRenew}>
                        <FaCrown /> Renovar Ahora
                    </button>
                    <button className="btn-later" onClick={onClose}>
                        Más Tarde
                    </button>
                </div>

                {daysLeft === 1 && (
                    <p className="critical-note">
                        ⚠️ Después de hoy perderás acceso a todos los beneficios VIP
                    </p>
                )}
            </div>
        </div>
    );
};

export default MembershipRenewalModal;

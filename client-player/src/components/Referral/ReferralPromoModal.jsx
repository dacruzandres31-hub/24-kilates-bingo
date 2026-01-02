import React from 'react';
import { Gift, Users, X, Share2, Rocket } from 'lucide-react';
import './ReferralPromoModal.css';

const ReferralPromoModal = ({ onClose, onOpenDashboard }) => {
    return (
        <div className="referral-promo-overlay">
            <div className="referral-promo-card-v2">
                <button className="promo-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="promo-badge">
                    <Rocket size={16} />
                    <span>¡NUEVO PROGRAMA!</span>
                </div>

                <div className="promo-icon-container">
                    <div className="icon-glow"></div>
                    <Gift size={64} className="main-promo-icon" />
                </div>

                <div className="promo-text-content">
                    <h2>¿Querés jugar GRATIS en la Sala Plata?</h2>
                    <p>
                        ¡Invitá a tus amigos y ganá premios increíbles! Por cada amigo
                        que realice su primera compra, te acreditamos:
                    </p>
                </div>

                <div className="promo-reward-highlight">
                    <span className="reward-count">5</span>
                    <div className="reward-details">
                        <span className="reward-item">Cartones Sala Plata</span>
                        <span className="reward-sub">Acreditación instantánea</span>
                    </div>
                </div>

                <div className="promo-actions">
                    <button
                        className="btn-promo-share"
                        onClick={() => {
                            onOpenDashboard();
                            onClose();
                        }}
                    >
                        <Users size={20} />
                        <span>¡Quiero mis cartones!</span>
                    </button>
                    <button className="btn-promo-maybe" onClick={onClose}>
                        Quizás más tarde
                    </button>
                </div>

                <div className="promo-footer">
                    <Share2 size={12} />
                    <span>Compartí tu link y empezá a ganar hoy</span>
                </div>
            </div>
        </div>
    );
};

export default ReferralPromoModal;

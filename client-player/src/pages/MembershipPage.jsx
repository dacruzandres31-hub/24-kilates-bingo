import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaGem, FaCrown, FaStar, FaCheck, FaArrowLeft, FaGift, FaSync, FaMoneyBillWave } from 'react-icons/fa';
import '../styles/MembershipPage.css';
import logoFull from '../assets/logo.png'; // Import Logo
import MembershipPurchaseModal from '../components/MembershipPurchaseModal'; // Import Modal

const MembershipPage = ({ user, onLogout }) => {
    const [plans, setPlans] = useState([]);
    const [currentSub, setCurrentSub] = useState(null);
    const [pendingReq, setPendingReq] = useState(null); // New state for pending request
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Modal State
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansRes, subRes] = await Promise.all([
                axios.get('/api/memberships'),
                axios.get('/api/memberships/my-subscription')
            ]);
            setPlans(plansRes.data);

            if (subRes.data) {
                if (subRes.data.subscription && subRes.data.subscription.status === 'active') {
                    setCurrentSub(subRes.data.subscription);
                } else {
                    setCurrentSub(null);
                }
                setPendingReq(subRes.data.pendingRequest || null);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading membership data:', error);
            setLoading(false);
        }
    };

    const handleOpenPurchase = (plan) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleCancel = async () => {
        if (!window.confirm('¿Seguro que quieres cancelar tu suscripción? Perderás la renovación automática.')) return;

        try {
            await axios.post('/api/memberships/cancel');
            setMessage({ type: 'success', text: 'Suscripción cancelada exitosamente.' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Error al cancelar' });
        }
    };

    const getTierIcon = (name) => {
        if (name.includes('Bronce')) return <FaStar className="tier-icon bronze" />;
        if (name.includes('Plata')) return <FaGem className="tier-icon silver" />;
        if (name.includes('Oro')) return <FaCrown className="tier-icon gold" />;
        if (name.includes('Embajador')) return <FaCrown className="tier-icon ambassador" />;
        return <FaStar />;
    };

    const getTierColorClass = (name) => {
        if (name.includes('Bronce')) return 'tier-bronze';
        if (name.includes('Plata')) return 'tier-silver';
        if (name.includes('Oro')) return 'tier-gold';
        if (name.includes('Embajador')) return 'tier-ambassador';
        return '';
    };

    if (loading) return <div className="membership-loading">Cargando Club VIP...</div>;

    return (
        <div className="membership-page">
            <MembershipPurchaseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                plan={selectedPlan}
                onSuccess={fetchData} // Refresh state immediately after success
            />

            <div className="membership-header">
                <button onClick={() => navigate('/')} className="back-btn">
                    <FaArrowLeft /> Volver al Lobby
                </button>

                <div className="header-title-container">
                    <span className="title-club">CLUB</span>
                    <img src={logoFull} alt="24 Kilates" className="title-logo-img" />
                    <span className="title-vip">VIP</span>
                </div>

                <p className="shining-text">Únete a la élite y disfruta de beneficios exclusivos</p>
            </div>

            {message && (
                <div className={`message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

            {currentSub && (
                <div className="current-subscription-status">
                    <p>Tu Membresía Actual: <strong className="gold-text">{currentSub.plan_name}</strong></p>
                    <p className="small-text">Renueva en: {Math.max(0, Math.ceil((new Date(currentSub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)))} Días</p>
                </div>
            )}

            <div className="plans-container">
                {plans.map(plan => {
                    const config = (typeof plan.benefits_config === 'string' ? JSON.parse(plan.benefits_config) : plan.benefits_config) || {};
                    const tierName = plan.name.toUpperCase().replace('SOCIO ', '').replace('PLAN ', '');

                    const isActive = currentSub && (currentSub.membership_id === plan.id || currentSub.subscription_tier_id === plan.id);

                    // Logic for "Combinable":
                    // Ambassador is combinable with everything.
                    // Others are mutually exclusive unless upgrading/switching.
                    // Since backend only supports 1 tier ID right now, "combining" might strictly mean "Upgrade to Combo" or we need to handle it.
                    // BUT user said: "Ambassador is the only one that can be combined".
                    // User also said: "Bronze/Silver should be able to renew to others at any time".
                    // So we ALWAYS enable the buy button, unless it's the SAME active plan (then it's renew).

                    let isPending = false;
                    if (pendingReq && pendingReq.details) {
                        let details = pendingReq.details;
                        if (typeof details === 'string') {
                            try { details = JSON.parse(details); } catch (e) { }
                        }
                        if (details.membershipId == plan.id) isPending = true;
                    }

                    return (
                        <div key={plan.id} className={`plan-card ${getTierColorClass(plan.name)} ${isActive ? 'active-card-border' : ''}`}>
                            {plan.name.includes('Embajador') && (
                                <div className="ambassador-banner">
                                    <span>GANANCIA</span>
                                    <span className="x-mark">X</span>
                                    <span>REFERIDOS</span>
                                </div>
                            )}
                            {isActive && <div className="active-badge"><FaCheck /> ACTIVO</div>}

                            <div className="card-content-wrapper">
                                <div className="card-header">
                                    <div className="tier-icon">{getTierIcon(plan.name)}</div>
                                    <h2 className="tier-name">SOCIO {tierName.replace(' 24K', '')}</h2>
                                    <div className="tier-price-container">
                                        <span className="price">${parseFloat(plan.price).toLocaleString()} ARS</span>
                                        <span className="period">/mes</span>
                                    </div>
                                </div>
                                <div className="separator-line"></div>
                                <div className="benefits-list">
                                    <div className="benefit-row highlight">
                                        <FaGift className="icon" />
                                        <div>
                                            <strong>
                                                {plan.name.includes('Embajador') ? '1 Cartón Gratis Diario' :
                                                    plan.name.includes('Plata') ? '2 Cartones Gratis Diarios' :
                                                        plan.name.includes('Oro') ? '3 Cartones Gratis Diarios' : '1 Cartón Gratis Diario'}
                                            </strong>
                                            <span className="subtext">
                                                {plan.name.includes('Embajador') ? 'Se renuevan cada día (Sala BRONCE)' : 'Se renuevan cada día (Sala ORO)'}
                                            </span>
                                        </div>
                                    </div>

                                    {!plan.name.includes('Embajador') && (
                                        <>
                                            <div className="benefit-row">
                                                <FaStar className="icon" />
                                                <div>
                                                    <strong>Bonus Compra</strong>
                                                    <span className="subtext">
                                                        {plan.name.includes('Bronce') && 'Compra 10 → Paga 9, recibe 10'}
                                                        {plan.name.includes('Plata') && 'Compra 20 → Paga 18, recibe 20'}
                                                        {plan.name.includes('Oro') && 'Compra 20 → Paga 16, recibe 20'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="benefit-row">
                                                <FaSync className="icon" />
                                                <div>
                                                    <strong>Rueda de la Fortuna</strong>
                                                    <span className="subtext">
                                                        {config.wheel_daily_spins ? `¡${config.wheel_daily_spins} Tiro Extra DIARIO!` : '1 Tiro Extra al renovar'}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="benefit-row">
                                        <FaCrown className="icon" />
                                        <div>
                                            <strong>Insignia VIP</strong>
                                            <span className="subtext">Chat animado y Medalla</span>
                                        </div>
                                    </div>
                                    {plan.name.includes('Embajador') && (
                                        <div className="benefit-row highlight-emerald">
                                            <FaMoneyBillWave className="icon" />
                                            <div>
                                                <strong>Ganancias por Red</strong>
                                                <span className="subtext">4%, 3%, 2% y 1% de tu red L1-L4</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    className={`subscribe-btn ${isPending ? 'pending' : ''} ${isActive ? 'renew-btn-small' : ''}`}
                                    onClick={() => !isPending && handleOpenPurchase(plan)}
                                    disabled={isPending}
                                >
                                    {isPending ? 'EN TRÁMITE ⏳' : isActive ? 'RENOVAR AHORA' : '¡QUIERO SER VIP!'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MembershipPage;

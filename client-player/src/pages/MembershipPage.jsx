import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaGem, FaCrown, FaStar, FaCheck, FaArrowLeft, FaGift, FaSync, FaMoneyBillWave, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import '../styles/MembershipPage.css';
import logoFull from '../assets/logo.png'; // Import Logo
import MembershipPurchaseModal from '../components/MembershipPurchaseModal'; // Import Modal
import { io } from 'socket.io-client';

const MembershipPage = ({ user, onLogout }) => {
    const [plans, setPlans] = useState([]);
    const [currentSub, setCurrentSub] = useState(null);         // Main tier (Bronce/Plata/Oro)
    const [embajadorSub, setEmbajadorSub] = useState(null);     // Embajador sub (can combine)
    const [activeSubscriptions, setActiveSubscriptions] = useState([]); // All active subs
    const [pendingRequests, setPendingRequests] = useState([]); // Array of pending requests
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Modal State
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Upgrade confirmation modal
    const [upgradeConfirmModal, setUpgradeConfirmModal] = useState({ show: false, plan: null, currentTier: null });

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        
        // Socket.IO para actualizaciones en tiempo real
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const socket = io(API_URL);
        
        // Escuchar cambios de estado de membresía
        socket.on('membership_status_updated', (data) => {
            console.log('📩 Estado de membresía actualizado:', data);
            if (data.status === 'approved') {
                setMessage({ type: 'success', text: '✅ ¡Tu membresía ha sido activada!' });
            } else if (data.status === 'rejected') {
                setMessage({ type: 'error', text: `❌ Solicitud rechazada: ${data.reason || 'Ver detalles con soporte'}` });
            }
            fetchData(); // Refrescar datos
        });
        
        // Escuchar actualizaciones de recursos
        socket.on('resources_updated', (data) => {
            if (data.type === 'membership_purchase') {
                fetchData(); // Refrescar datos
            }
        });
        
        return () => {
            socket.off('membership_status_updated');
            socket.off('resources_updated');
            socket.disconnect();
        };
    }, []);

    const fetchData = async () => {
        try {
            // Fetch plans first (public endpoint)
            const plansRes = await axios.get('/api/memberships');
            setPlans(plansRes.data || []);
            
            // Then try to fetch subscription (requires auth)
            try {
                const token = localStorage.getItem('playerToken');
                if (token) {
                    const subRes = await axios.get('/api/memberships/my-subscription', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (subRes.data) {
                        // Handle new structure with separate subscription and embajadorSubscription
                        if (subRes.data.subscription && subRes.data.subscription.status === 'active') {
                            setCurrentSub(subRes.data.subscription);
                        } else {
                            setCurrentSub(null);
                        }
                        
                        // Handle Embajador subscription separately
                        if (subRes.data.embajadorSubscription && subRes.data.embajadorSubscription.status === 'active') {
                            setEmbajadorSub(subRes.data.embajadorSubscription);
                        } else {
                            setEmbajadorSub(null);
                        }
                        
                        // Store all active subscriptions
                        setActiveSubscriptions(subRes.data.activeSubscriptions || []);
                        
                        // Handle both old (pendingRequest) and new (pendingRequests) format
                        setPendingRequests(subRes.data.pendingRequests || (subRes.data.pendingRequest ? [subRes.data.pendingRequest] : []));
                    }
                }
            } catch (subError) {
                console.log('No subscription found or not logged in');
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading membership data:', error);
            setLoading(false);
        }
    };

    // Get tier level for hierarchy (bronce=1, plata=2, oro=3)
    const getTierLevel = (planName) => {
        const name = planName.toLowerCase();
        if (name.includes('oro')) return 3;
        if (name.includes('plata')) return 2;
        if (name.includes('bronce')) return 1;
        return 0;
    };

    const handleOpenPurchase = (plan) => {
        const planName = plan.name.toLowerCase();
        const isEmbajador = planName.includes('embajador');
        
        // If buying Embajador and already have it active
        if (isEmbajador && embajadorSub) {
            setMessage({ type: 'error', text: 'Ya tienes la membresía Embajador activa.' });
            return;
        }
        
        // If buying a tier (not Embajador) and have an active tier
        if (!isEmbajador && currentSub) {
            const currentLevel = getTierLevel(currentSub.plan_name);
            const newLevel = getTierLevel(plan.name);
            
            // If current is Oro, can't replace
            if (currentLevel === 3) {
                setMessage({ type: 'error', text: 'Ya tienes la membresía Oro activa. No puede ser reemplazada.' });
                return;
            }
            
            // If trying to downgrade
            if (newLevel <= currentLevel) {
                setMessage({ type: 'error', text: `No puedes cambiar de ${currentSub.plan_name} a ${plan.name}. Solo puedes subir de nivel.` });
                return;
            }
            
            // Show upgrade confirmation
            setUpgradeConfirmModal({ show: true, plan, currentTier: currentSub });
            return;
        }
        
        // Normal purchase (no conflict)
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleConfirmUpgrade = () => {
        setSelectedPlan(upgradeConfirmModal.plan);
        setUpgradeConfirmModal({ show: false, plan: null, currentTier: null });
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

    // Check if a specific plan has a pending request
    const isPlanPending = (planId) => {
        return pendingRequests.some(req => {
            let details = req.details;
            if (typeof details === 'string') {
                try { details = JSON.parse(details); } catch (e) { return false; }
            }
            return details && details.membershipId == planId;
        });
    };

    // Check if plan is active for current user (check both tier and embajador)
    const isPlanActive = (planId, planName) => {
        const name = planName.toLowerCase();
        if (name.includes('embajador')) {
            return embajadorSub && embajadorSub.membership_id === planId;
        }
        return currentSub && (currentSub.membership_id === planId || currentSub.subscription_tier_id === planId);
    };

    // Get days remaining for a specific subscription
    const getDaysRemaining = (sub) => {
        if (!sub || !sub.next_billing_date) return 0;
        return Math.max(0, Math.ceil((new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)));
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

            {/* Upgrade Confirmation Modal */}
            {upgradeConfirmModal.show && (
                <div className="upgrade-modal-overlay">
                    <div className="upgrade-modal">
                        <div className="upgrade-modal-icon">
                            <FaExclamationTriangle />
                        </div>
                        <h3>⚠️ Cambio de Membresía</h3>
                        <p>
                            Actualmente tienes la membresía <strong>{upgradeConfirmModal.currentTier?.plan_name}</strong>.
                        </p>
                        <p>
                            Al comprar <strong>{upgradeConfirmModal.plan?.name}</strong>, tu membresía anterior será <span className="highlight-text">reemplazada</span>.
                        </p>
                        <p className="upgrade-note">
                            Los días restantes de tu membresía actual no se acumulan.
                        </p>
                        <div className="upgrade-modal-buttons">
                            <button className="cancel-btn" onClick={() => setUpgradeConfirmModal({ show: false, plan: null, currentTier: null })}>
                                Cancelar
                            </button>
                            <button className="confirm-btn" onClick={handleConfirmUpgrade}>
                                Sí, Cambiar a {upgradeConfirmModal.plan?.name}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            <div className="plans-container">
                {plans.map(plan => {
                    const config = (typeof plan.benefits_config === 'string' ? JSON.parse(plan.benefits_config) : plan.benefits_config) || {};
                    const tierName = plan.name.toUpperCase().replace('SOCIO ', '').replace('PLAN ', '');

                    const isActive = isPlanActive(plan.id, plan.name);
                    const isPending = isPlanPending(plan.id);
                    const isEmbajador = plan.name.toLowerCase().includes('embajador');
                    const activeSub = isEmbajador ? embajadorSub : currentSub;
                    const daysRemaining = isActive ? getDaysRemaining(activeSub) : 0;

                    // If active, show ACTIVE badge with tier color
                    if (isActive) {
                        const tierClass = getTierColorClass(plan.name);
                        return (
                            <div key={plan.id} className={`plan-card ${tierClass} active-card`}>
                                {/* Pulsing ACTIVA badge with tier color */}
                                <div className={`active-badge-floating ${tierClass.replace('tier-', 'badge-')}`}>
                                    <span className="badge-text">ACTIVA</span>
                                    <div className="badge-reflection"></div>
                                </div>

                                <div className="card-content-wrapper">
                                    <div className="card-header">
                                        <div className="tier-icon">{getTierIcon(plan.name)}</div>
                                        <h2 className="tier-name">SOCIO {tierName.replace(' 24K', '')}</h2>
                                    </div>
                                    
                                    <div className={`active-timer ${tierClass.replace('tier-', 'timer-')}`}>
                                        <FaClock className="timer-icon" />
                                        <div className="timer-content">
                                            <span className="timer-label">Tiempo Restante</span>
                                            <span className="timer-value">{daysRemaining} días</span>
                                        </div>
                                    </div>

                                    <div className="credential-benefits-summary">
                                        <p>✓ Beneficios VIP Activos</p>
                                        <p>✓ Cartones Gratis Diarios</p>
                                        <p>✓ Insignia Exclusiva</p>
                                    </div>

                                    <button
                                        className={`subscribe-btn renew-btn ${tierClass.replace('tier-', 'renew-')}`}
                                        onClick={() => handleOpenPurchase(plan)}
                                    >
                                        🔄 RENOVAR MEMBRESÍA
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={plan.id} className={`plan-card ${getTierColorClass(plan.name)} ${isPending ? 'pending-card' : ''}`}>
                            {plan.name.includes('Embajador') && !isPending && (
                                <div className="ambassador-banner">
                                    <span>GANANCIA</span>
                                    <span className="x-mark">X</span>
                                    <span>REFERIDOS</span>
                                </div>
                            )}
                            {isPending && <div className="pending-badge">⏳ EN TRÁMITE</div>}

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
                                    className={`subscribe-btn ${isPending ? 'pending' : ''}`}
                                    onClick={() => !isPending && handleOpenPurchase(plan)}
                                    disabled={isPending}
                                >
                                    {isPending ? 'EN TRÁMITE ⏳' : '¡QUIERO SER VIP!'}
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

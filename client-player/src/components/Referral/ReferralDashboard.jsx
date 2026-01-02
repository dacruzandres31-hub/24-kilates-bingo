import React, { useState, useEffect } from 'react';
import { Copy, Users, Gift, ChevronRight, Share2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './ReferralDashboard.css';

const ReferralDashboard = ({ onClose }) => {
    const [referralCode, setReferralCode] = useState('');
    const [referredUsers, setReferredUsers] = useState([]);
    const [rewardsHistory, setRewardsHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('network'); // 'network' or 'rewards'
    const [stats, setStats] = useState({
        totalEarned: 0,
        pending: 0,
        registered: 0,
        levels: { l1: 0, l2: 0, l3: 0, l4: 0 }
    });
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
            // Step 1: Get profile for referral code
            const profileRes = await axios.get('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setReferralCode(profileRes.data.referral_code);

            // Step 2: Get referral stats/list
            const referralsRes = await axios.get('/api/referrals/my-referrals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setReferredUsers(referralsRes.data.referrals || []);
            setRewardsHistory(referralsRes.data.rewards || []);
            setStats(referralsRes.data.stats || {
                totalEarned: 0,
                pending: 0,
                registered: 0,
                levels: { l1: 0, l2: 0, l3: 0, l4: 0 }
            });
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnWhatsApp = () => {
        const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
        const text = encodeURIComponent(`¡Únete a 24K Bingo y gana conmigo! Regístrate aquí: ${referralLink}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="referral-modal-overlay">
            <div className="referral-dashboard">
                <div className="referral-header">
                    <h2>🎁 Programa de Referidos</h2>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <div className="referral-content">
                    <div className="referral-promo-card">
                        <div className="promo-text">
                            <h3>¡Ganá 5 Cartones Plata!</h3>
                            <p>Invita a tus amigos. Cuando realicen su primera compra, recibirás 5 cartones para Sala Plata ¡Gratis!</p>
                        </div>
                        <Gift className="promo-icon" size={48} />
                    </div>

                    <div className="stats-grid">
                        <div className="stat-box">
                            <span className="stat-val">{stats.registered}</span>
                            <span className="stat-label">Red Total</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-val">{stats.totalEarned}</span>
                            <span className="stat-label">Cartones Ganados</span>
                        </div>
                    </div>

                    <div className="network-levels-summary">
                        <div className="level-item">
                            <span className="l-name">Nivel 1</span>
                            <span className="l-val">{stats.levels?.l1 || 0}</span>
                        </div>
                        <div className="level-item">
                            <span className="l-name">Nivel 2</span>
                            <span className="l-val">{stats.levels?.l2 || 0}</span>
                        </div>
                        <div className="level-item">
                            <span className="l-name">Nivel 3</span>
                            <span className="l-val">{stats.levels?.l3 || 0}</span>
                        </div>
                        <div className="level-item">
                            <span className="l-name">Nivel 4</span>
                            <span className="l-val">{stats.levels?.l4 || 0}</span>
                        </div>
                    </div>

                    <div className="referral-link-section">
                        <label>Tu enlace de invitación:</label>
                        <div className="link-copy-group">
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/register?ref=${referralCode}`}
                            />
                            <button
                                className={`btn-copy ${copied ? 'copied' : ''}`}
                                onClick={copyToClipboard}
                            >
                                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <button className="btn-whatsapp" onClick={shareOnWhatsApp}>
                            <Share2 size={18} />
                            <span>Compartir por WhatsApp</span>
                        </button>
                    </div>

                    <div className="referral-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'network' ? 'active' : ''}`}
                            onClick={() => setActiveTab('network')}
                        >
                            Mi Red
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
                            onClick={() => setActiveTab('rewards')}
                        >
                            Historial Premios
                        </button>
                    </div>

                    <div className="tab-content-section">
                        {activeTab === 'network' ? (
                            <div className="referrals-list-section">
                                <h4>Tus Referidos (4 Niveles)</h4>
                                {loading ? (
                                    <p className="loading-text">Cargando...</p>
                                ) : referredUsers.length > 0 ? (
                                    <div className="referrals-list">
                                        {referredUsers.map((ref, idx) => (
                                            <div key={idx} className="referral-item">
                                                <div className="ref-info">
                                                    <div className="name-level-row">
                                                        <div className="name-with-indicator">
                                                            <span className={`ambassador-indicator ${ref.is_ambassador ? 'active' : ''}`} title={ref.tier_name || 'Sin membresía'}></span>
                                                            <span className="ref-name">{ref.username}</span>
                                                        </div>
                                                        <span className={`level-badge level-${ref.level}`}>N{ref.level}</span>
                                                    </div>
                                                    <span className="ref-date">Registrado: {new Date(ref.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-text">Aún no tienes referidos. ¡Empieza a invitar!</p>
                                )}
                            </div>
                        ) : (
                            <div className="rewards-history-section">
                                <h4>Tus Recompensas (5 Cartones Plata c/u)</h4>
                                {loading ? (
                                    <p className="loading-text">Cargando...</p>
                                ) : rewardsHistory.length > 0 ? (
                                    <div className="rewards-list">
                                        {rewardsHistory.map((reward, idx) => (
                                            <div key={idx} className={`reward-item-row ${reward.status}`}>
                                                <div className="reward-info">
                                                    <div className="reward-source">
                                                        <span className="source-label">De:</span>
                                                        <span className="source-name">{reward.source_username}</span>
                                                    </div>
                                                    <span className="reward-date">
                                                        {reward.status === 'credited'
                                                            ? `Cobrado: ${new Date(reward.credited_at).toLocaleDateString()}`
                                                            : `En cola desde: ${new Date(reward.created_at).toLocaleDateString()}`
                                                        }
                                                    </span>
                                                </div>
                                                <div className="reward-status-col">
                                                    <span className={`status-badge ${reward.status}`}>
                                                        {reward.status === 'credited' ? 'COBRADO' : 'PENDIENTE'}
                                                    </span>
                                                    <span className="reward-amount">+5 Cartones</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-text">Aún no has generado premios. Los verás aquí cuando tus amigos depositen.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferralDashboard;

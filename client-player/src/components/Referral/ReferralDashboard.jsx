import React, { useState, useEffect } from 'react';
import { 
    Copy, Users, Gift, Share2, CheckCircle, Crown, 
    TrendingUp, Calendar, DollarSign, HelpCircle,
    ChevronDown, ChevronUp, Wallet, Award
} from 'lucide-react';
import axios from 'axios';
import ReferralTree from './ReferralTree';
import EmbajadorInfoModal from './EmbajadorInfoModal';
import './ReferralDashboard.css';

// Referral Dashboard v2.0 - Red de Referidos con comisiones
const API_BASE = import.meta.env.VITE_API_URL || '';

const ReferralDashboard = ({ onClose }) => {
    const [referralData, setReferralData] = useState(null);
    const [commissions, setCommissions] = useState(null);
    const [claimStatus, setClaimStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('tree');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [expandedStats, setExpandedStats] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch referrals data - principal
        try {
            const referralsRes = await axios.get(`${API_BASE}/api/referrals/my-referrals`, { headers });
            setReferralData(referralsRes.data.data || referralsRes.data);
        } catch (error) {
            console.error('Error fetching referrals:', error);
        }

        // Fetch commissions - secundario
        try {
            const commissionsRes = await axios.get(`${API_BASE}/api/referrals/commissions`, { headers });
            setCommissions(commissionsRes.data.data || commissionsRes.data);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        }

        // Fetch claim status - secundario
        try {
            const claimRes = await axios.get(`${API_BASE}/api/referrals/claim-status`, { headers });
            setClaimStatus(claimRes.data.data || claimRes.data);
        } catch (error) {
            console.error('Error fetching claim status:', error);
        }

        setLoading(false);
    };

    // Generar link de referido - usar API o fallback local
    const getReferralLink = () => {
        if (loading) {
            return 'Cargando...';
        }
        if (referralData?.referral_link) {
            return referralData.referral_link;
        }
        if (referralData?.referral_code) {
            return `https://24kilates.xyz/register?ref=${referralData.referral_code}`;
        }
        // Si no hay código, mostrar mensaje
        return 'Generando código...';
    };

    const copyToClipboard = () => {
        const link = getReferralLink();
        if (link) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            alert('No tienes un código de referido asignado aún. Contacta a soporte.');
        }
    };

    const shareOnWhatsApp = () => {
        const link = getReferralLink();
        if (link) {
            const text = encodeURIComponent(
                `🎰 ¡Únete a 24K Bingo Club VIP! \n\n` +
                `💰 Juega y gana premios reales\n` +
                `🎁 Bonus de bienvenida\n` +
                `👑 Programa de referidos con comisiones\n\n` +
                `Regístrate aquí: ${link}`
            );
            window.open(`https://wa.me/?text=${text}`, '_blank');
        } else {
            alert('No tienes un código de referido asignado aún. Contacta a soporte.');
        }
    };

    const handleClaimCommissions = async () => {
        if (!claimStatus?.canClaim) return;
        
        setClaiming(true);
        try {
            const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
            const res = await axios.post(
                `${API_BASE}/api/referrals/commissions/claim`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            alert(`✅ ${res.data.data?.message || '¡Comisiones cobradas!'}`);
            fetchAllData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error al cobrar comisiones');
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="referral-modal-overlay">
                <div className="referral-dashboard loading-state">
                    <div className="loading-spinner"></div>
                    <p>Cargando tu red de referidos...</p>
                </div>
            </div>
        );
    }

    const stats = referralData?.stats || {};
    const commissionSummary = referralData?.commissions || commissions?.summary || {};

    return (
        <div className="referral-modal-overlay">
            <div className="referral-dashboard enhanced">
                {/* Header */}
                <div className="referral-header">
                    <div className="header-title">
                        <Crown className="crown-icon" />
                        <h2>Red de Referidos</h2>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="btn-info" 
                            onClick={() => setShowInfoModal(true)}
                            title="¿Cómo funciona?"
                        >
                            <HelpCircle size={20} />
                        </button>
                        <button className="btn-close" onClick={onClose}>&times;</button>
                    </div>
                </div>

                {/* Hero Stats */}
                <div className="hero-stats-section">
                    <div className="hero-stat primary">
                        <div className="stat-icon">
                            <Users size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.total || 0}</span>
                            <span className="stat-label">Referidos Totales</span>
                        </div>
                    </div>
                    <div className="hero-stat embajador">
                        <div className="stat-icon">
                            <Crown size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.embajadores || 0}</span>
                            <span className="stat-label">Embajadores Activos</span>
                        </div>
                    </div>
                    <div className="hero-stat earnings">
                        <div className="stat-icon">
                            <DollarSign size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">
                                ${(commissionSummary.pending?.total || 0).toLocaleString()}
                            </span>
                            <span className="stat-label">Pendiente Cobrar</span>
                        </div>
                    </div>
                </div>

                {/* Claim Period Banner */}
                {claimStatus && (
                    <div className={`claim-period-banner ${claimStatus.isClaimPeriod ? 'active' : 'inactive'}`}>
                        <Calendar size={18} />
                        <span>{claimStatus.message}</span>
                        {claimStatus.canClaim && (
                            <button 
                                className="btn-claim"
                                onClick={handleClaimCommissions}
                                disabled={claiming}
                            >
                                <Wallet size={16} />
                                {claiming ? 'Cobrando...' : `Cobrar $${claimStatus.pendingAmount}`}
                            </button>
                        )}
                    </div>
                )}

                {/* Level Stats Collapsible */}
                <div className="levels-stats-container">
                    <button 
                        className="levels-toggle"
                        onClick={() => setExpandedStats(!expandedStats)}
                    >
                        <span>Referidos por Nivel</span>
                        {expandedStats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandedStats && (
                        <div className="levels-grid">
                            <div className="level-stat level-1">
                                <div className="level-badge">N1</div>
                                <div className="level-info">
                                    <span className="level-count">{stats.levels?.l1 || 0}</span>
                                    <span className="level-percent">4% comisión</span>
                                </div>
                            </div>
                            <div className="level-stat level-2">
                                <div className="level-badge">N2</div>
                                <div className="level-info">
                                    <span className="level-count">{stats.levels?.l2 || 0}</span>
                                    <span className="level-percent">3% comisión</span>
                                </div>
                            </div>
                            <div className="level-stat level-3">
                                <div className="level-badge">N3</div>
                                <div className="level-info">
                                    <span className="level-count">{stats.levels?.l3 || 0}</span>
                                    <span className="level-percent">2% comisión</span>
                                </div>
                            </div>
                            <div className="level-stat level-4">
                                <div className="level-badge">N4</div>
                                <div className="level-info">
                                    <span className="level-count">{stats.levels?.l4 || 0}</span>
                                    <span className="level-percent">1% comisión</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Referral Link Section */}
                <div className="referral-link-section enhanced">
                    <div className="link-header">
                        <Gift size={20} />
                        <span>Tu enlace de invitación</span>
                    </div>
                    <div className="link-copy-group">
                        <input
                            type="text"
                            readOnly
                            value={getReferralLink()}
                            className={loading ? 'loading' : ''}
                        />
                        <button
                            className={`btn-copy ${copied ? 'copied' : ''}`}
                            onClick={copyToClipboard}
                        >
                            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    <div className="share-buttons">
                        <button className="btn-whatsapp" onClick={shareOnWhatsApp}>
                            <Share2 size={18} />
                            <span>Compartir por WhatsApp</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="referral-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tree')}
                    >
                        <Users size={16} />
                        Árbol de Red
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'commissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('commissions')}
                    >
                        <TrendingUp size={16} />
                        Historial Comisiones
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content-section">
                    {activeTab === 'tree' ? (
                        <ReferralTree referrals={referralData?.referrals || []} />
                    ) : (
                        <div className="commissions-history">
                            <div className="commission-summary-cards">
                                <div className="summary-card pending">
                                    <Award size={24} />
                                    <div className="summary-info">
                                        <span className="amount">
                                            ${(commissionSummary.pending?.total || 0).toLocaleString()}
                                        </span>
                                        <span className="label">
                                            {commissionSummary.pending?.count || 0} pendientes
                                        </span>
                                    </div>
                                </div>
                                <div className="summary-card claimed">
                                    <CheckCircle size={24} />
                                    <div className="summary-info">
                                        <span className="amount">
                                            ${(commissionSummary.claimed?.total || 0).toLocaleString()}
                                        </span>
                                        <span className="label">
                                            {commissionSummary.claimed?.count || 0} cobradas
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {commissions?.commissions?.length > 0 ? (
                                <div className="commissions-list">
                                    {commissions.commissions.map((c, idx) => (
                                        <div key={idx} className={`commission-item ${c.status}`}>
                                            <div className="commission-left">
                                                <div className="commission-source">
                                                    <span className="source-name">{c.sourceUsername}</span>
                                                    <span className={`level-badge small level-${c.level}`}>
                                                        N{c.level}
                                                    </span>
                                                </div>
                                                <span className="commission-date">
                                                    {new Date(c.createdAt).toLocaleDateString('es-AR')}
                                                </span>
                                            </div>
                                            <div className="commission-right">
                                                <span className="commission-amount">
                                                    +${c.amount.toLocaleString()}
                                                </span>
                                                <span className={`status-badge ${c.status}`}>
                                                    {c.status === 'claimed' ? 'COBRADA' : 'PENDIENTE'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-commissions">
                                    <Gift size={48} />
                                    <p>Aún no tienes comisiones</p>
                                    <span>Las comisiones se generan cuando tus referidos compran la Membresía Embajador</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA Banner */}
                <div className="cta-banner" onClick={() => setShowInfoModal(true)}>
                    <Crown size={24} />
                    <div className="cta-text">
                        <strong>¿Querés ganar comisiones por tu red?</strong>
                        <span>Activá la Membresía Embajador y empezá a ganar</span>
                    </div>
                    <ChevronDown size={20} className="cta-arrow" />
                </div>
            </div>

            {/* Info Modal */}
            {showInfoModal && (
                <EmbajadorInfoModal onClose={() => setShowInfoModal(false)} />
            )}
        </div>
    );
};

export default ReferralDashboard;

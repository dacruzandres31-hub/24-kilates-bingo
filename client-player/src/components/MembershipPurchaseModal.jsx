import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCopy, FaCheck, FaTimes, FaCamera, FaUpload, FaMoneyBillWave, FaCrown } from 'react-icons/fa';

const MembershipPurchaseModal = ({ isOpen, onClose, plan, themeColor = '#ffd700', onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Info CBU, 2: Upload Proof, 3: Success
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [proofUrl, setProofUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAccount();
            setStep(1);
            setProofUrl('');
        }
    }, [isOpen]);

    const fetchAccount = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('playerToken');
            // We use the same endpoint as deposits to get the Transfer Info
            const { data } = await axios.get('/api/deposits/info?purpose=membership', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setAccount(data.data);
            }
        } catch (error) {
            console.error('Error fetching account:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proofUrl) return alert('Debes cargar el comprobante');

        setSubmitting(true);
        try {
            const token = localStorage.getItem('playerToken');
            await axios.post('/api/deposits/claim', {
                accountId: account.id,
                amount: plan.price, // Fixed price from plan
                proofUrl,
                requestType: 'membership_purchase',
                details: {
                    membershipId: plan.id,
                    planName: plan.name
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Show success step instead of alert
            setStep(3);
            if (onSuccess) onSuccess(); // Notify parent to refresh
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen || !plan) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '450px',
                border: `2px solid ${themeColor}`,
                boxShadow: `0 0 50px ${themeColor}40`,
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: `1px solid ${themeColor}30`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 215, 0, 0.05)'
                }}>
                    <h2 style={{ color: themeColor, margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCrown /> Comprar Membresía {plan.name}
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1.5rem'
                    }}>
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {loading ? (
                        <div style={{ color: 'white', textAlign: 'center' }}>Obteniendo datos de pago...</div>
                    ) : !account ? (
                        <div style={{ color: '#ef4444', textAlign: 'center' }}>
                            ⚠️ No hay cuentas disponibles para transferir. Intenta más tarde.
                        </div>
                    ) : step === 3 ? (
                        /* SUCCESS STEP */
                        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)'
                            }}>
                                <FaCheck size={40} color="white" />
                            </div>
                            <h3 style={{ color: '#10b981', fontSize: '1.5rem', marginBottom: '1rem' }}>
                                ¡Solicitud Enviada!
                            </h3>
                            <p style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                Tu membresía <b style={{ color: themeColor }}>{plan.name}</b>
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>
                                está en proceso de ser activada.
                            </p>
                            <div style={{
                                background: 'rgba(255, 215, 0, 0.1)',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                borderRadius: '1rem',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <p style={{ color: '#fbbf24', fontSize: '0.9rem', margin: 0 }}>
                                    ⏳ 24Kilates revisará tu comprobante y activará tu membresía en breve.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: `linear-gradient(90deg, ${themeColor}, #b8860b)`,
                                    border: 'none',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    borderRadius: '0.8rem',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: `0 4px 15px ${themeColor}50`
                                }}
                            >
                                Entendido ✓
                            </button>
                        </div>
                    ) : step === 1 ? (
                        <div className="animate-fade-in">
                            <p style={{ color: '#e2e8f0', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                                Para activar tu plan por <b>${parseFloat(plan.price).toLocaleString()}</b>, transfiere a esta cuenta:
                            </p>

                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                border: `1px solid ${themeColor}40`,
                                marginBottom: '2rem'
                            }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>ALIAS (Toca para copiar)</label>
                                    <div
                                        onClick={() => handleCopy(account.alias)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: `1px dashed ${themeColor}60`
                                        }}
                                    >
                                        <span style={{ color: themeColor, fontSize: '1.4rem', fontWeight: 'bold' }}>{account.alias}</span>
                                        <FaCopy color={themeColor} />
                                    </div>
                                    {copied && <span style={{ color: '#4ade80', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>¡Copiado al portapapeles!</span>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>BANCO</label>
                                        <span style={{ color: 'white', fontWeight: '500' }}>{account.bank_name}</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem' }}>TITULAR</label>
                                        <span style={{ color: 'white', fontWeight: '500' }}>{account.holder_name}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: `linear-gradient(90deg, ${themeColor}, #b8860b)`,
                                    border: 'none',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    borderRadius: '0.8rem',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: `0 4px 15px ${themeColor}50`
                                }}
                            >
                                Ya Transferí, Subir Comprobante 👉
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="animate-fade-in">
                            <h3 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>Confirmar Pago</h3>
                            <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '1.5rem' }}>
                                Sube la captura de tu transferencia de <b>${parseFloat(plan.price).toLocaleString()}</b>
                            </p>

                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{
                                    border: `2px dashed ${proofUrl ? '#10b981' : '#334155'}`,
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    background: proofUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s'
                                }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0, width: '100%', height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer'
                                        }}
                                        required={!proofUrl}
                                    />
                                    {proofUrl ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <FaCheck size={40} color="#10b981" />
                                            <span style={{ color: '#10b981', marginTop: '10px' }}>Comprobante Cargado</span>
                                            <img src={proofUrl} alt="cheque" style={{ height: '60px', marginTop: '10px', borderRadius: '4px', border: '1px solid #ffffff50' }} />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <FaCamera size={40} color="#94a3b8" />
                                            <span style={{ color: '#94a3b8', marginTop: '10px' }}>Toca para subir foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        background: 'transparent',
                                        border: '1px solid #475569',
                                        color: '#cbd5e1',
                                        borderRadius: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Volver
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 2,
                                        padding: '1rem',
                                        background: submitting ? '#475569' : `linear-gradient(90deg, ${themeColor}, #b8860b)`,
                                        border: 'none',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        borderRadius: '0.8rem',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: submitting ? 'none' : `0 4px 15px ${themeColor}40`
                                    }}
                                >
                                    {submitting ? 'Enviando...' : 'Confirmar Envío'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MembershipPurchaseModal;

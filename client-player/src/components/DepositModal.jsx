
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCopy, FaCheck, FaTimes, FaCamera, FaUpload, FaMoneyBillWave } from 'react-icons/fa';

const DepositModal = ({ isOpen, onClose, themeColor = '#00ffff', accentColor = '#ff00ff' }) => {
    const [step, setStep] = useState(1); // 1: Info CBU, 2: Upload Proof
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [proofUrl, setProofUrl] = useState(''); // Simulated file upload for now (should be Cloudinary)
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAccount();
            setStep(1);
            setAmount('');
            setProofUrl('');
        }
    }, [isOpen]);

    const fetchAccount = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('playerToken');
            const { data } = await axios.get('/api/deposits/info', {
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
        if (!amount || !proofUrl) return alert('Completa todos los datos');

        setSubmitting(true);
        try {
            const token = localStorage.getItem('playerToken');
            await axios.post('/api/deposits/claim', {
                accountId: account.id,
                amount: parseFloat(amount),
                proofUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Solicitud enviada. Tus fichas se acreditarán en breve.');
            onClose();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Simulate Image Upload (Cloudinary logic would go here)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // In a real app, upload to Cloudinary/S3 here.
            // For now, we simulate with a fake URL or Base64 if small.
            // Let's assume we just store the filename for demo or Base64.
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofUrl(reader.result); // Base64
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

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
                background: 'linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%)',
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '450px',
                border: `2px solid ${themeColor}`,
                boxShadow: `0 0 40px ${themeColor}30`,
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
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <h2 style={{ color: themeColor, margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaMoneyBillWave /> Cargar Saldo
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
                        <div style={{ color: 'white', textAlign: 'center' }}>Buscando cuenta disponible...</div>
                    ) : !account ? (
                        <div style={{ color: '#ef4444', textAlign: 'center' }}>
                            ⚠️ No hay cuentas disponibles en este momento. Intenta más tarde.
                        </div>
                    ) : step === 1 ? (
                        <div className="animate-fade-in">
                            <p style={{ color: '#cbd5e1', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.95rem' }}>
                                Transfiere el monto deseado a la siguiente cuenta y guarda el comprobante.
                            </p>

                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                border: `1px solid ${themeColor}40`,
                                marginBottom: '2rem'
                            }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>ALIAS (Click para copiar)</label>
                                    <div
                                        onClick={() => handleCopy(account.alias)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: 'rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <span style={{ color: themeColor, fontSize: '1.4rem', fontWeight: 'bold' }}>{account.alias}</span>
                                        <FaCopy color={themeColor} />
                                    </div>
                                    {copied && <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>¡Copiado!</span>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>BANCO/APP</label>
                                        <span style={{ color: 'white', fontWeight: '500' }}>{account.bank_name}</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>TITULAR</label>
                                        <span style={{ color: 'white', fontWeight: '500' }}>{account.holder_name}</span>
                                    </div>
                                    {account.cbu && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>CBU/CVU</label>
                                            <span style={{ color: 'white', fontFamily: 'monospace' }}>{account.cbu}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: `linear-gradient(90deg, ${themeColor}, ${accentColor})`,
                                    border: 'none',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    borderRadius: '0.8rem',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: `0 4px 15px ${themeColor}50`
                                }}
                            >
                                Ya Transferí, Continuar 👉
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="animate-fade-in">
                            <h3 style={{ color: 'white', marginBottom: '1.5rem', textAlign: 'center' }}>Subir Comprobante</h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Monto Transferido ($)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Ej: 5000"
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '0.8rem',
                                        color: 'white',
                                        fontSize: '1.2rem',
                                        outline: 'none'
                                    }}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Foto del Comprobante</label>
                                <div style={{
                                    border: `2px dashed ${proofUrl ? '#10b981' : '#334155'}`,
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    background: proofUrl ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
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
                                            <span style={{ color: '#10b981', marginTop: '10px' }}>Imagen Cargada</span>
                                            <img src={proofUrl} alt="Preview" style={{ height: '60px', marginTop: '10px', borderRadius: '4px' }} />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <FaCamera size={40} color="#64748b" />
                                            <span style={{ color: '#64748b', marginTop: '10px' }}>Toca para subir foto</span>
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
                                        background: submitting ? '#475569' : '#10b981',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        borderRadius: '0.8rem',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: submitting ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)'
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

export default DepositModal;

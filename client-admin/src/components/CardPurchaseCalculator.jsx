import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FaCopy, FaCheck, FaTimes, FaCamera, FaShoppingCart } from 'react-icons/fa';

const CardPurchaseCalculator = ({ isOpen, onClose, userRole }) => {
    const [step, setStep] = useState(1); // 1: Calculator, 2: Superior Info & Upload
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState({ bronce: 0, plata: 0, oro: 0 });
    const [quantities, setQuantities] = useState({ bronce: 0, plata: 0, oro: 0 });
    const [superiorInfo, setSuperiorInfo] = useState(null);
    const [proofUrl, setProofUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    // Role-based discount
    const getDiscount = () => {
        if (userRole === 'admin') return 0.20; // 20% off = 80% price
        if (userRole === 'agente') return 0.15; // 15% off = 85% price
        return 0; // Players pay full price
    };

    useEffect(() => {
        if (isOpen) {
            fetchPrices();
            setStep(1);
            setQuantities({ bronce: 0, plata: 0, oro: 0 });
            setProofUrl('');
        }
    }, [isOpen]);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const { data } = await axios.get('/api/game/lobby-data', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setPrices({
                    bronce: data.data.bronce?.price || 0,
                    plata: data.data.plata?.price || 0,
                    oro: data.data.oro?.price || 0
                });
            }
        } catch (error) {
            console.error('Error fetching prices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuperiorInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const { data } = await axios.get('/api/deposits/info', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setSuperiorInfo(data.data);
            }
        } catch (error) {
            console.error('Error fetching superior info:', error);
            alert('❌ No se pudo obtener la información de tu superior. Verifica que tengas un superior asignado.');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        const discount = getDiscount();
        let total = 0;
        Object.keys(quantities).forEach(room => {
            const qty = quantities[room];
            const price = prices[room] || 0;
            total += qty * price * (1 - discount);
        });
        return total;
    };

    const getTotalCards = () => {
        return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    };

    const handleContinue = async () => {
        const totalCards = getTotalCards();
        if (totalCards === 0) {
            alert('⚠️ Debes seleccionar al menos 1 cartón para continuar.');
            return;
        }
        await fetchSuperiorInfo();
        setStep(2);
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofUrl(reader.result); // Base64
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proofUrl) {
            alert('⚠️ Debes subir el comprobante de transferencia.');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');

            // Prepare items array
            const items = [];
            Object.keys(quantities).forEach(room => {
                if (quantities[room] > 0) {
                    items.push({ room, quantity: quantities[room] });
                }
            });

            await axios.post('/api/deposits/claim', {
                accountId: superiorInfo.id,
                amount: calculateTotal(),
                proofUrl,
                requestType: 'card_purchase',
                details: { items }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Solicitud de compra enviada. Tus cartones se acreditarán una vez aprobada.');
            onClose();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const themeColor = '#00ffff';
    const accentColor = '#ff00ff';
    const discount = getDiscount();
    const total = calculateTotal();

    return createPortal(
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
                maxWidth: '500px',
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
                        <FaShoppingCart /> Comprar Cartones
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
                        <div style={{ color: 'white', textAlign: 'center' }}>Cargando...</div>
                    ) : step === 1 ? (
                        <div className="animate-fade-in">
                            {/* Discount Badge */}
                            {discount > 0 && (
                                <div style={{
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    marginBottom: '1.5rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>
                                    🎉 {userRole === 'admin' ? 'Administrador' : 'Agente'}: {discount * 100}% de descuento aplicado
                                </div>
                            )}

                            <p style={{ color: '#cbd5e1', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.95rem' }}>
                                Selecciona la cantidad de cartones que deseas comprar:
                            </p>

                            {/* Room Selectors */}
                            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {['bronce', 'plata', 'oro'].map(room => {
                                    const roomColors = {
                                        bronce: { bg: 'rgba(251, 146, 60, 0.1)', border: '#fb923c', text: '#fb923c' },
                                        plata: { bg: 'rgba(203, 213, 225, 0.1)', border: '#cbd5e1', text: '#cbd5e1' },
                                        oro: { bg: 'rgba(250, 204, 21, 0.1)', border: '#facc15', text: '#facc15' }
                                    };
                                    const colors = roomColors[room];
                                    const price = prices[room] || 0;
                                    const finalPrice = price * (1 - discount);

                                    return (
                                        <div key={room} style={{
                                            background: colors.bg,
                                            padding: '1rem',
                                            borderRadius: '1rem',
                                            border: `1px solid ${colors.border}40`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ color: colors.text, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    {room}
                                                </span>
                                                <span style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                                                    ${finalPrice.toFixed(2)}
                                                    {discount > 0 && <span style={{ textDecoration: 'line-through', marginLeft: '8px', color: '#64748b', fontSize: '1rem' }}>${price.toFixed(2)}</span>}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={quantities[room] === 0 ? '' : quantities[room]}
                                                onChange={(e) => setQuantities({ ...quantities, [room]: parseInt(e.target.value) || 0 })}
                                                style={{
                                                    width: '120px',
                                                    padding: '0.5rem',
                                                    background: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: '0.5rem',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    outline: 'none',
                                                    textAlign: 'center'
                                                }}
                                                placeholder="0"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                border: `1px solid ${themeColor}40`,
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Total de Cartones:</span>
                                    <span style={{ color: 'white', fontWeight: 'bold' }}>{getTotalCards()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#94a3b8' }}>Total a Pagar:</span>
                                    <span style={{ color: themeColor, fontWeight: 'bold', fontSize: '1.4rem' }}>
                                        ${total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleContinue}
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
                                Continuar 👉
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="animate-fade-in">
                            <h3 style={{ color: 'white', marginBottom: '1.5rem', textAlign: 'center' }}>Transferir a tu Superior</h3>

                            {superiorInfo && (
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
                                            onClick={() => handleCopy(superiorInfo.alias)}
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
                                            <span style={{ color: themeColor, fontSize: '1.4rem', fontWeight: 'bold' }}>{superiorInfo.alias}</span>
                                            <FaCopy color={themeColor} />
                                        </div>
                                        {copied && <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>¡Copiado!</span>}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>BANCO/APP</label>
                                            <span style={{ color: 'white', fontWeight: '500' }}>{superiorInfo.bank_name}</span>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>TITULAR</label>
                                            <span style={{ color: 'white', fontWeight: '500' }}>{superiorInfo.holder_name}</span>
                                        </div>
                                        {superiorInfo.cbu && (
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>CBU/CVU</label>
                                                <span style={{ color: 'white', fontFamily: 'monospace' }}>{superiorInfo.cbu}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                        <p style={{ color: '#60a5fa', fontSize: '0.85rem', margin: 0 }}>
                                            💰 Monto a transferir: <strong>${total.toFixed(2)}</strong>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Comprobante de Transferencia</label>
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
                                    {submitting ? 'Enviando...' : 'Confirmar Compra'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CardPurchaseCalculator;

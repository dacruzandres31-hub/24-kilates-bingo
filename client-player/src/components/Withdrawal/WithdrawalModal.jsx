import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaMoneyBillWave, FaTimes, FaHistory, FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import './WithdrawalModal.css';

export default function WithdrawalModal({ isOpen, onClose, onWithdrawalSuccess }) {
    const [activeTab, setActiveTab] = useState('request'); // 'request', 'history'
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cbu');
    const [bankAccountHolder, setBankAccountHolder] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [accountDetails, setAccountDetails] = useState('');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchBalance();
            setActiveTab('request');
        }
    }, [isOpen]);

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem('playerToken');
            const res = await axios.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(parseFloat(res.data.balance));
        } catch (err) { console.error(err); }
    };

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('playerToken');
            // Using /history endpoint which returns all requests
            const res = await axios.get('/api/withdrawals/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                // Backend returns 'data', not 'withdrawals'
                setHistory(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching history', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) return alert('Monto inválido');
        if (amount > balance) return alert('Saldo insuficiente');
        if (!accountDetails) return alert('Datos de cuenta requeridos');

        setIsLoading(true);
        try {
            const token = localStorage.getItem('playerToken');
            const res = await axios.post('/api/withdrawals/request', {
                amount: parseFloat(amount),
                method,
                cbu: accountDetails, // Send as cbu specifically as backend expects it or notes
                bankAccountHolder,
                whatsappNumber, // Send new field
                notes: accountDetails
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Solicitud enviada exitosamente');
            setAmount('');
            setAccountDetails('');
            setBankAccountHolder('');
            setWhatsappNumber('');
            fetchBalance();
            setActiveTab('history');
            fetchHistory();
            if (onWithdrawalSuccess) onWithdrawalSuccess();

        } catch (err) {
            console.error('Error requesting withdrawal', err);
            alert(err.response?.data?.message || err.response?.data?.error || 'Error al solicitar retiro');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="withdrawal-modal-overlay">
            <div className="withdrawal-modal-container">

                <div className="withdrawal-header">
                    <div className="withdrawal-title">
                        <FaMoneyBillWave className="withdrawal-icon" />
                        <h2>Retirar Premios</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="withdrawal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
                        onClick={() => setActiveTab('request')}
                    >
                        Solicitar Retiro
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('history'); fetchHistory(); }}
                    >
                        <FaHistory /> Historial
                    </button>
                </div>

                <div className="withdrawal-content">

                    {activeTab === 'request' && (
                        <form onSubmit={handleRequest} className="withdrawal-form">
                            <div className="balance-info">
                                <span>Tu Saldo Disponible:</span>
                                <span className="balance-amount">${balance?.toLocaleString()}</span>
                            </div>

                            <div className="form-group">
                                <label>Monto a Retirar</label>
                                <div className="input-with-icon">
                                    <span className="currency-symbol">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="100"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Método de Pago</label>
                                <select value={method} onChange={e => setMethod(e.target.value)}>
                                    <option value="cbu">Transferencia CBU / CVU</option>
                                    <option value="alias">Alias Bancario / Virtual</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Titular de la Cuenta</label>
                                <input
                                    type="text"
                                    value={bankAccountHolder}
                                    onChange={e => setBankAccountHolder(e.target.value)}
                                    placeholder="Nombre y Apellido del Titular"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Tu WhatsApp (para enviar el recibo)</label>
                                <input
                                    type="tel"
                                    value={whatsappNumber}
                                    onChange={e => setWhatsappNumber(e.target.value)}
                                    placeholder="Ej: +54911..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Datos de la Cuenta (CBU/Alias/Email)</label>
                                <textarea
                                    value={accountDetails}
                                    onChange={e => setAccountDetails(e.target.value)}
                                    placeholder={method === 'cbu' ? 'Ingresa tu CBU (22 dígitos)' : method === 'alias' ? 'Ingresa tu Alias' : 'Ingresa tu Email de Mercado Pago'}
                                    rows={3}
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-withdrawal-btn" disabled={isLoading || !balance || amount > balance}>
                                {isLoading ? <FaSpinner className="spin" /> : 'Confirmar Retiro'}
                            </button>

                            <p className="withdrawal-note">
                                <FaExclamationCircle /> Los retiros son procesados exclusivamente por 24Kilates. El saldo se descontará al momento de la solicitud. Si se rechaza, se reintegrará automáticamente.
                            </p>
                        </form>
                    )}

                    {activeTab === 'history' && (
                        <div className="history-list">
                            {isLoading && <div className="loading-state"><FaSpinner className="spin" /></div>}

                            {!isLoading && history.length === 0 && (
                                <div className="empty-state">No hay retiros registrados.</div>
                            )}

                            {history.map(item => (
                                <div key={item.id} className="history-item">
                                    <div className="history-info">
                                        <div className="history-amount text-gold">${parseFloat(item.amount).toLocaleString()}</div>
                                        <div className="history-date">{new Date(item.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className={`history-status status-${item.status}`}>
                                        {item.status === 'approved' ? 'Aprobado' : item.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* FOOTER ACTION */}
                <div className="withdrawal-footer-action">
                    <button className="back-lobby-btn" onClick={onClose}>
                        Volver al Lobby
                    </button>
                </div>
            </div>
        </div>
    );
}

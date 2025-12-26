import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Check, X, Bell, RefreshCw, Smartphone, Copy, Share2, ExternalLink } from 'lucide-react';
import CardReceiptModal from './CardReceiptModal';

export default function WithdrawalsPanel() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // 'pending', 'all'
    const [modalData, setModalData] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            // Using /all endpoint for admin
            const res = await axios.get('/api/withdrawals/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setRequests(res.data.data || []); // Backend returns 'data', not 'withdrawals'
            }
        } catch (err) {
            console.error('Error fetching withdrawals', err);
            if (err.response?.status === 403) {
                alert("Acceso Denegado: Solo 24Kilates puede ver esto.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (id, action) => {
        // action: 'process' (Approve) or 'reject'
        if (!window.confirm(`¿Estás seguro de ${action === 'process' ? 'APROBAR y PAGAR' : 'RECHAZAR'} esta solicitud?`)) return;

        try {
            const token = localStorage.getItem('adminToken');
            const endpoint = action === 'process'
                ? `/api/withdrawals/${id}/process`
                : `/api/withdrawals/${id}/reject`;

            await axios.post(endpoint,
                action === 'reject' ? { rejectionReason: 'Rechazado por administrador' } : {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert(action === 'process' ? '✅ Retiro Procesado Exitósamente' : '❌ Retiro Rechazado (Saldo Reintegrado)');
            fetchRequests(); // Refresh
        } catch (err) {
            console.error('Error processing', err);
            console.error('Error response:', err.response);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error desconocido';
            alert('Error: ' + errorMsg);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copiado al portapapeles');
    };

    const handleShareDetails = (req) => {
        const text = `*SOLICITUD DE RETIRO*\n\n` +
            `👤 Usu: ${req.username}\n` +
            `💰 Monto: $${parseFloat(req.amount).toLocaleString()}\n` +
            `🏦 Banco: ${req.method?.toUpperCase()}\n` +
            `📋 Datos: ${req.notes || req.account_details}\n` +
            (req.bank_account_holder ? `👤 Titular: ${req.bank_account_holder}\n` : '') +
            `\nPor favor procesar pago.`;

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleOpenReceipt = (req) => {
        setModalData({
            type: 'dinero',
            operation: 'RETIRO EXITOSO',
            quantity: parseFloat(req.amount),
            userName: req.username,
            recipientId: req.user_id,
            transactionId: req.transfer_receipt || req.id, // Use transfer receipt if available
            timestamp: new Date(req.requested_at || req.created_at).toLocaleString(),
            extraDetails: {
                bank: req.bank_name || req.method,
                cbu: req.cbu || req.account_details,
                holder: req.bank_account_holder
            }
        });
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'pending') return req.status === 'pending';
        return true;
    });

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" /> Gestión de Retiros (24Kilates)
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-3 py-1 rounded text-sm font-bold ${filter === 'pending' ? 'bg-gold-500 text-black' : 'bg-gray-700 text-gray-300'}`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded text-sm font-bold ${filter === 'all' ? 'bg-gold-500 text-black' : 'bg-gray-700 text-gray-300'}`}
                    >
                        Todos
                    </button>
                    <button onClick={fetchRequests} className="p-2 bg-gray-700 rounded hover:bg-gray-600 ml-2">
                        <RefreshCw className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/50 text-xs uppercase text-gray-400">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Usuario</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3">Método / Datos</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredRequests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-700/30">
                                <td className="px-4 py-3 font-mono text-gray-500">#{req.id}</td>
                                <td className="px-4 py-3 font-bold text-white">{req.username}</td>
                                <td className="px-4 py-3 text-green-400 font-bold text-lg">${parseFloat(req.amount).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold uppercase text-xs text-gold-400 mb-1">{req.method}</div>
                                    <div className="text-xs text-gray-300 mb-1">
                                        <span className="text-gray-500">Titular:</span> {req.bank_account_holder || '-'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-gray-800 px-1 py-0.5 rounded text-xs font-mono text-white select-all">
                                            {req.cbu || req.account_details || req.notes}
                                        </code>
                                        <button
                                            onClick={() => handleCopy(req.cbu || req.account_details || req.notes)}
                                            className="text-gray-400 hover:text-white transition"
                                            title="Copiar CBU/Alias"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleShareDetails(req)}
                                            className="text-green-500 hover:text-green-400 transition"
                                            title="Enviar datos por WhatsApp"
                                        >
                                            <Share2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{new Date(req.requested_at || req.created_at).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${req.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                                            (req.status === 'approved' || req.status === 'completed') ? 'bg-green-900 text-green-300' :
                                                'bg-red-900 text-red-300'}`
                                    }>
                                        {req.status === 'pending' ? 'PENDIENTE' :
                                            (req.status === 'approved' || req.status === 'completed') ? 'APROBADO' :
                                                req.status === 'rejected' ? 'RECHAZADO' : req.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    {req.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleProcess(req.id, 'reject')}
                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition"
                                                title="Rechazar y Reintegrar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleProcess(req.id, 'process')}
                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition"
                                                title="Aprobar y Pagar"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {(req.status === 'approved' || req.status === 'completed') && (
                                        <button
                                            onClick={() => handleOpenReceipt(req)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition flex items-center gap-1"
                                            title="Generar Recibo"
                                        >
                                            <Smartphone className="w-3 h-3" /> Info
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No hay solicitudes {filter === 'pending' ? 'pendientes' : ''}.
                    </div>
                )}
            </div>
            {/* Receipt Modal */}
            {modalData && (
                <CardReceiptModal
                    isOpen={!!modalData}
                    onClose={() => setModalData(null)}
                    data={modalData}
                />
            )}
        </div>
    );
}

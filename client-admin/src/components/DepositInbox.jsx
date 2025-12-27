
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Eye, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DepositInbox() {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState(null);
    const [processing, setProcessing] = useState(null);

    const fetchDeposits = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const { data } = await axios.get(`${API_URL}/api/deposits/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeposits(data.data || []);
        } catch (error) {
            console.error('Error fetching deposits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeposits();
        // Podríamos añadir un intervalo de polling o socket listener aquí
        const interval = setInterval(fetchDeposits, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('¿Confirmar depósito y acreditar fichas?')) return;
        setProcessing(id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_URL}/api/deposits/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDeposits();
        } catch (error) {
            alert('Error aprobando: ' + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Motivo del rechazo (Opcional):');
        if (reason === null) return;

        setProcessing(id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_URL}/api/deposits/${id}/reject`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDeposits();
        } catch (error) {
            alert('Error rechazando: ' + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div>
                    <h3 className="text-xl font-bold text-white">📥 Bandeja de Depósitos</h3>
                    <p className="text-emerald-400 text-sm font-medium">Revisa los comprobantes y acredita saldo</p>
                </div>
                <button
                    onClick={fetchDeposits}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {deposits.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/50 rounded-lg border border-gray-800 border-dashed">
                    <p className="text-gray-500 text-lg">📭 No hay depósitos pendientes</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {deposits.map(deposit => (
                        <div key={deposit.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-emerald-400 font-bold text-lg">${Number(deposit.amount_declared).toLocaleString()}</span>
                                    <span className="text-gray-500 text-xs">#{deposit.id}</span>
                                </div>
                                <h4 className="text-white font-medium truncate">{deposit.username}</h4>
                                <p className="text-sm text-gray-400">
                                    {deposit.request_type === 'b2b_stock' ? (
                                        <>
                                            Tipo: <span className="text-purple-400 font-bold">SOLICITUD STOCK</span>
                                            {(() => {
                                                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;
                                                const items = details?.items || (details?.room ? [details] : []);

                                                return items.length > 0 && (
                                                    <div className="mt-1 bg-purple-900/30 p-2 rounded border border-purple-500/30 space-y-1">
                                                        <span className="text-white text-xs block mb-1">Items del Pedido:</span>
                                                        {items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="text-yellow-400 font-bold">{item.quantity}</span>
                                                                <span className="text-gray-300 text-xs"> cartones </span>
                                                                <span className="text-blue-400 font-bold text-xs">{item.room?.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <>
                                            Destino: <span className="text-blue-300">{deposit.account_alias || 'Desconocido'}</span> ({deposit.bank_name})
                                        </>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(deposit.created_at).toLocaleString()}
                                </p>
                            </div>

                            {/* Proof Thumbnail */}
                            <div className="relative group cursor-pointer" onClick={() => setSelectedProof(deposit.proof_image_url)}>
                                {deposit.proof_image_url ? (
                                    <img
                                        src={deposit.proof_image_url}
                                        alt="Comprobante"
                                        className="w-24 h-24 object-cover rounded border border-gray-600 group-hover:border-emerald-500 transition-colors"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs text-center p-2">
                                        Sin Imagen
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                                    <Eye className="text-white" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleReject(deposit.id)}
                                    disabled={processing === deposit.id}
                                    className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 rounded-lg px-4 py-3 disabled:opacity-50 transition-colors flex flex-col items-center gap-1 min-w-[80px]"
                                >
                                    <X size={20} />
                                    <span className="text-xs font-bold">Rechazar</span>
                                </button>
                                <button
                                    onClick={() => handleApprove(deposit.id)}
                                    disabled={processing === deposit.id}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-3 disabled:opacity-50 shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105 flex flex-col items-center gap-1 min-w-[100px]"
                                >
                                    <Check size={20} />
                                    <span className="text-xs font-bold">APROBAR</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Proof Modal */}
            {selectedProof && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedProof(null)}>
                    <img
                        src={selectedProof}
                        alt="Comprobante Full"
                        className="max-w-full max-h-[90vh] rounded shadow-2xl"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                        <X size={32} />
                    </button>
                </div>
            )}
        </div>
    );
}

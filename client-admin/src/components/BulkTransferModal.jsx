import React, { useState } from 'react';
import axios from 'axios';

const BulkTransferModal = ({ isOpen, onClose, data, targetUser, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !data) return null;

    const { details, summary, role } = data;
    const rooms = ['bronce', 'plata', 'oro'].filter(r => details[r].qty > 0);

    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');

            // Construir payload para backend
            const items = rooms.map(r => ({
                room: r,
                quantity: details[r].qty,
                bonusQuantity: details[r].bonusQty, // Backend might calculate this too, but we pass it or let BE decide. 
                // Better: Let backend re-calculate to be safe, OR pass it if we trust frontend.
                // Plan said: Backend endpoint accepts quantities. Backend calculates logic. 
                // We send: { room: 'bronce', quantity: 100 }, { room: 'plata', quantity: 50 }, etc.
                // AND we send the 'role' or 'pricing_tier' applied? 
                // Actually the backend endpoint needs to just "transfer cards". The pricing calculation is for what the Admin CHARGES the agent outside the system.
                // BUT, the GIFT CARDS are system generated.
                // SO: Backend needs to know "apply bonus". 
                // Current backend logic applies bonus automatically based on "Agent Bonus Percentage".
                // We should rely on backend logic for consistency.
            }));

            // We need a new endpoint for BULK transfer that handles multiple rooms transactionally.
            const response = await axios.post('/api/admin/cards/bulk-transfer', {
                targetUserId: targetUser.id,
                items: items,
                applyBonus: role !== 'player' // Only apply bonus if NOT player (or explicit logic)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                onSuccess(response.data);
                onClose();
            }
        } catch (err) {
            console.error('Error en carga masiva:', err);
            setError(err.response?.data?.message || 'Error al procesar la carga masiva');
        } finally {
            setLoading(false);
        }
    };

    const isPlayer = role === 'player';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10003] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-900 to-green-900 p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🚀 Confirmar Carga Masiva
                    </h2>
                    <p className="text-green-200 text-sm mt-1">
                        Resumen de operación para: <span className="font-bold text-white">{targetUser?.username}</span>
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Role Badge */}
                    <div className="flex justify-center">
                        <span className={`px-4 py-1 rounded-full text-sm font-bold border ${role === 'admin' ? 'bg-blue-900/30 text-blue-300 border-blue-500/50' :
                                role === 'agent' ? 'bg-purple-900/30 text-purple-300 border-purple-500/50' :
                                    'bg-gray-800 text-gray-300 border-gray-600'
                            }`}>
                            Precio Aplicado: {
                                role === 'admin' ? 'Administrador (80%)' :
                                    role === 'agent' ? 'Agente (85%)' :
                                        'Estándar (100%)'
                            }
                        </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-gray-700">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3">Sala</th>
                                    <th className="px-6 py-3 text-center">Cant.</th>
                                    <th className="px-6 py-3 text-right">Precio Unit.</th>
                                    <th className="px-6 py-3 text-right">Subtotal</th>
                                    {!isPlayer && <th className="px-6 py-3 text-center text-purple-400">🎁 Bono</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map(r => {
                                    const d = details[r];
                                    return (
                                        <tr key={r} className="bg-gray-800/50 border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="px-6 py-4 font-bold capitalize text-white">
                                                {r}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium">
                                                {d.qty}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ${d.finalPrice.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-400">
                                                ${d.subtotal.toLocaleString()}
                                            </td>
                                            {!isPlayer && (
                                                <td className="px-6 py-4 text-center font-bold text-purple-400">
                                                    +{d.bonusQty}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {/* Totals Row */}
                                <tr className="bg-gray-900 font-bold border-t-2 border-gray-600">
                                    <td className="px-6 py-4 text-white">TOTALES</td>
                                    <td className="px-6 py-4 text-center text-white">
                                        {summary.totalQty}
                                    </td>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4 text-right text-xl text-green-400">
                                        ${summary.totalPay.toLocaleString()}
                                    </td>
                                    {!isPlayer && (
                                        <td className="px-6 py-4 text-center text-purple-400">
                                            +{summary.totalBonus}
                                        </td>
                                    )}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {error && (
                        <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center animate-pulse">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-800/50 p-4 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 text-gray-400 hover:text-white font-semibold transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            '✅ Confirmar Operación'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkTransferModal;

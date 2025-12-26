import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CostCalculatorModal = ({ isOpen, onClose, onApply, targetRole = 'agent' }) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    // V2 Config: Multi-room & Roles
    const [quantities, setQuantities] = useState({ bronce: '', plata: '', oro: '' });
    const [selectedRole, setSelectedRole] = useState(targetRole === 'player' ? 'player' : 'agent'); // 'admin' | 'agent' | 'player'

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
            setQuantities({ bronce: '', plata: '', oro: '' });
            // If targetRole is player, force 'player'. Else default to 'agent' or keep previous selection logic if needed
            // But usually we reset.
            setSelectedRole(targetRole === 'player' ? 'player' : 'agent');
        }
    }, [isOpen, targetRole]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/api/admin/room-settings/config', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const settingsMap = {};
                response.data.settings.forEach(s => {
                    settingsMap[s.room] = s;
                });
                setSettings(settingsMap);
            }
        } catch (error) {
            console.error('Error fetching room settings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helpes
    const handleQtyChange = (room, val) => {
        setQuantities(prev => ({ ...prev, [room]: val }));
    };

    // Calculations
    const calculateRoomData = (room) => {
        const setting = settings[room] || {};
        const basePrice = parseFloat(setting.card_price || 0);

        // Pricing Logic
        let multiplier = 1.0;
        if (selectedRole === 'admin') multiplier = 0.80;
        if (selectedRole === 'agent') multiplier = 0.85;
        // if player, multiplier remains 1.0

        const finalPrice = basePrice * multiplier;

        const qty = parseInt(quantities[room]) || 0;
        const subtotal = qty * finalPrice;

        // Bonus Logic: 10% Fixed for Agents/Admins only
        const isAgentOrAdmin = selectedRole === 'admin' || selectedRole === 'agent';

        let bonusQty = 0;
        const bonusPercentage = parseFloat(setting.agent_bonus_percentage || 10);

        if (isAgentOrAdmin) {
            bonusQty = Math.floor(qty * (bonusPercentage / 100));
        }

        return {
            room,
            qty,
            basePrice,
            finalPrice,
            subtotal,
            bonusQty,
            bonusPercentage: isAgentOrAdmin ? bonusPercentage : 0
        };
    };

    const totals = ['bronce', 'plata', 'oro'].reduce((acc, room) => {
        const data = calculateRoomData(room);
        acc.totalPay += data.subtotal;
        acc.totalQty += data.qty;
        acc.totalBonus += data.bonusQty;
        acc.details[room] = data;
        return acc;
    }, { totalPay: 0, totalQty: 0, totalBonus: 0, details: {} });

    const handleApply = () => {
        onApply({
            role: selectedRole,
            details: totals.details,
            summary: {
                totalPay: totals.totalPay,
                totalQty: totals.totalQty,
                totalBonus: totals.totalBonus
            }
        });
        onClose();
    };

    if (!isOpen) return null;

    const isPlayer = selectedRole === 'player';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10002] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 flex justify-between items-center border-b border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            🧮 Calculadora de Costos {isPlayer && '(Jugador)'}
                        </h2>
                        <p className="text-blue-200 text-sm mt-1">
                            {isPlayer
                                ? 'Calcula el costo de cartones para el jugador.'
                                : 'Calcula costos masivos y bonificaciones automáticas.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors text-3xl">
                        &times;
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Role Selector (Only if not player) */}
                            {!isPlayer && (
                                <div className="flex justify-center mb-6">
                                    <div className="bg-gray-800 p-1 rounded-xl flex border border-gray-700">
                                        <button
                                            onClick={() => setSelectedRole('admin')}
                                            className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedRole === 'admin'
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                        >
                                            Administrador (80%)
                                        </button>
                                        <button
                                            onClick={() => setSelectedRole('agent')}
                                            className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedRole === 'agent'
                                                ? 'bg-purple-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                        >
                                            Agente (85%)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Inputs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['bronce', 'plata', 'oro'].map(room => {
                                    const data = totals.details[room]; // Recalculated on render
                                    const color = room === 'bronce' ? 'orange' : room === 'plata' ? 'gray' : 'yellow';
                                    const borderClass = room === 'bronce' ? 'border-orange-500/30 focus-within:border-orange-500' :
                                        room === 'plata' ? 'border-gray-500/30 focus-within:border-gray-400' :
                                            'border-yellow-500/30 focus-within:border-yellow-500';
                                    const textClass = room === 'bronce' ? 'text-orange-400' : room === 'plata' ? 'text-gray-300' : 'text-yellow-400';

                                    return (
                                        <div key={room} className={`bg-gray-800/50 border ${borderClass} rounded-xl p-4 transition-all`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className={`font-bold capitalize ${textClass}`}>{room}</h3>
                                                <div className="text-xs text-gray-500">
                                                    Base: ${data.basePrice}
                                                </div>
                                            </div>

                                            <div className="relative mb-3">
                                                <input
                                                    type="number"
                                                    value={quantities[room]}
                                                    onChange={(e) => handleQtyChange(room, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-bold text-center focus:outline-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">unid.</span>
                                            </div>

                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Precio ({isPlayer ? 'Normal' : (selectedRole === 'admin' ? '80%' : '85%')}):</span>
                                                    <span className="text-white font-medium">${data.finalPrice.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Subtotal:</span>
                                                    <span className="text-green-400 font-bold">${data.subtotal.toLocaleString()}</span>
                                                </div>
                                                {!isPlayer && (
                                                    <div className="flex justify-between text-purple-400 bg-purple-900/20 px-2 py-1 rounded">
                                                        <span>🎁 Bono ({data.bonusPercentage}%):</span>
                                                        <span className="font-bold">+{data.bonusQty}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-gray-700 my-2"></div>

                            {/* Totals Footer */}
                            <div className="bg-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex gap-8">
                                    <div>
                                        <div className="text-gray-400 text-xs uppercase font-bold">Total a Pagar</div>
                                        <div className="text-3xl font-bold text-green-400">
                                            ${totals.totalPay.toLocaleString('es-CO')}
                                        </div>
                                    </div>
                                    <div className="w-px bg-gray-600"></div>
                                    <div>
                                        <div className="text-gray-400 text-xs uppercase font-bold">Total Cartones</div>
                                        <div className="text-xl text-white font-medium">
                                            {totals.totalQty} {!isPlayer && <span className="text-gray-500 text-sm">Pagos</span>}
                                        </div>
                                        {!isPlayer && (
                                            <div className="text-purple-400 text-sm font-bold">
                                                + {totals.totalBonus} Regalo
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleApply}
                                    disabled={totals.totalQty <= 0}
                                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all transform hover:scale-105"
                                >
                                    Continuar a Carga ➔
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostCalculatorModal;


import React, { useState, useEffect } from 'react';
import { FaCalculator, FaTimes, FaCheck, FaShoppingCart, FaUserTie, FaUserShield } from 'react-icons/fa';

const WholesaleCalculatorModal = ({ isOpen, onClose, user, onConfirm }) => {
    const [superiorInfo, setSuperiorInfo] = useState(null);
    const [loadingSuperior, setLoadingSuperior] = useState(false);
    const [room, setRoom] = useState('bronze');
    const [cart, setCart] = useState({
        bronze: 0,
        silver: 0,
        gold: 0
    });
    const [manualRole, setManualRole] = useState(null);

    const [prices, setPrices] = useState({
        bronze: 1000,
        silver: 2000,
        gold: 5000
    });
    const [loadingPrices, setLoadingPrices] = useState(false);

    // Detect Role logic
    const detectedRole = user?.role === 'admin' ? 'admin' : 'agent';
    const effectiveRole = manualRole || detectedRole;

    // Pricing Logic
    const discount = effectiveRole === 'admin' ? 0.20 : 0.15; // 20% Admin, 15% Agent
    const discountLabel = effectiveRole === 'admin' ? '20% (Admin)' : '15% (Agente)';

    // Calculations (Grand Total)
    const items = Object.entries(cart).map(([roomId, quantity]) => {
        const uPrice = prices[roomId] || 0;
        const gross = uPrice * quantity;
        const discAmount = gross * discount;
        const net = gross - discAmount;
        return { room: roomId, quantity, unitPrice: uPrice, gross, discountAmount: discAmount, net };
    }).filter(i => i.quantity > 0);

    const totalGross = items.reduce((acc, i) => acc + i.gross, 0);
    const totalDiscount = items.reduce((acc, i) => acc + i.discountAmount, 0);
    const totalNet = items.reduce((acc, i) => acc + i.net, 0);
    const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);

    useEffect(() => {
        if (isOpen) {
            setCart({ bronze: 0, silver: 0, gold: 0 });
            setManualRole(null); // Reset override on open

            // Si es "Auto-Compra" (el usuario logueado en el panel se compra a sí mismo para stock), buscamos datos del superior
            // Ojo: "user" aquí es el "Target User". Si el target es el mismo que currentUser (esto lo decidimos al abrir el modal), buscamos al padre via API.
            // Asumiremos que si se abre el modal, buscamos la info de pago SIEMPRE, ya sea para mostrarla o tenerla.
            // Pero la logica es: El usuario PAGA al superior. Necesitamos los datos del SUPERIOR del usuario 'user'.

            fetchSuperiorData();
            fetchRoomPrices();
        }
    }, [isOpen, user]);

    const fetchRoomPrices = async () => {
        try {
            setLoadingPrices(true);
            const res = await fetch('/api/game/lobby-data');
            const data = await res.json();
            if (data.success && data.data) {
                const newPrices = {
                    bronze: data.data.bronce?.price || 1000,
                    silver: data.data.plata?.price || 2000,
                    gold: data.data.oro?.price || 5000
                };
                setPrices(newPrices);
            }
        } catch (error) {
            console.error('Error fetching room prices:', error);
        } finally {
            setLoadingPrices(false);
        }
    };

    const fetchSuperiorData = async () => {
        try {
            setLoadingSuperior(true);
            const token = localStorage.getItem('adminToken');
            const res = await fetch('/api/admin/users/superior-info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.hasSuperior) {
                setSuperiorInfo(data.superior);
                if (data.error) {
                    console.warn('⚠️ ' + data.error);
                }
            } else {
                setSuperiorInfo(null);
            }
        } catch (error) {
            console.error('Error fetching superior info:', error);
            setSuperiorInfo(null);
        } finally {
            setLoadingSuperior(false);
        }
    };

    if (!isOpen) return null;

    const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-gray-900 to-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FaShoppingCart /> Solicitud de Stock B2B
                    </h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* User Info & Role Selection */}
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                        <div>
                            <p className="text-gray-400 text-sm">Comprador (Tu Cuenta)</p>
                            <p className="text-white font-bold text-lg">{user?.username}</p>
                        </div>
                        <div className="px-3 py-1 rounded-lg border bg-indigo-600 border-indigo-500 text-white text-sm flex items-center gap-1">
                            <FaUserTie /> {discountLabel}
                        </div>
                    </div>

                    {/* Selector Sala */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Seleccionar Sala</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'bronze', label: 'Bronce', price: prices.bronze, color: 'border-orange-500 text-orange-400' },
                                { id: 'silver', label: 'Plata', price: prices.silver, color: 'border-gray-400 text-gray-300' },
                                { id: 'gold', label: 'Oro', price: prices.gold, color: 'border-yellow-500 text-yellow-400' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setRoom(opt.id)}
                                    className={`p-3 rounded-xl border-2 transition-all relative ${room === opt.id
                                        ? `bg-white/10 ${opt.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]`
                                        : 'border-gray-700 text-gray-500 hover:bg-white/5'}`}
                                >
                                    <div className="font-bold">{opt.label}</div>
                                    <div className="text-xs opacity-80">${opt.price}</div>
                                    {cart[opt.id] > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900">
                                            {cart[opt.id]}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity Input */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Cantidad para {room.toUpperCase()}</label>
                        <input
                            type="number"
                            value={cart[room] || ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setCart(prev => ({ ...prev, [room]: val }));
                            }}
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-indigo-500"
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    {/* Superior Payment Info */}
                    {superiorInfo && (
                        <div className="bg-indigo-900/40 p-5 rounded-xl border-2 border-indigo-500/50 shadow-lg">
                            <h3 className="text-indigo-300 text-sm font-bold mb-3 flex items-center gap-2">
                                🏦 Transfiere a tu Superior: <span className="text-white">{superiorInfo.username}</span>
                            </h3>
                            <div className="space-y-2 text-sm text-gray-300">
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span>Titular:</span>
                                    <span className="font-bold text-white uppercase">{superiorInfo.holder_name}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span>{superiorInfo.cbu !== 'No definido' ? 'CBU / CVU' : 'Alias'}:</span>
                                    <span className="font-mono text-white select-all text-lg font-bold tracking-wider">
                                        {superiorInfo.cbu !== 'No definido' ? superiorInfo.cbu : superiorInfo.alias}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span>Banco:</span>
                                    <span className="text-white font-semibold">{superiorInfo.bank_name}</span>
                                </div>
                                <div className="flex justify-between mt-3 pt-3 border-t border-indigo-500/30 text-xs">
                                    <span className="text-gray-400 italic">Esta cuenta rotativa se asigna automáticamente.</span>
                                    <span className="text-white font-bold">{superiorInfo.contact}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Card */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-2">
                        {items.length > 0 ? (
                            <div className="space-y-1 mb-2">
                                {items.map(i => (
                                    <div key={i.room} className="flex justify-between text-xs text-gray-300">
                                        <span>{i.room.toUpperCase()} ({i.quantity} x {formatMoney(i.unitPrice)})</span>
                                        <span>{formatMoney(i.gross)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-700/50 my-2" />
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 text-sm py-2 italic">Sin ítems seleccionados</div>
                        )}

                        <div className="flex justify-between text-gray-400 text-sm">
                            <span>Subtotal Bruto</span>
                            <span>{formatMoney(totalGross)}</span>
                        </div>
                        <div className="flex justify-between text-green-400 text-sm">
                            <span>Descuento {discountLabel}</span>
                            <span>- {formatMoney(totalDiscount)}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-700 flex justify-between items-end">
                            <span className="text-white font-semibold">Total a Transferir</span>
                            <span className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                                {formatMoney(totalNet)}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-semibold hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (totalQuantity <= 0) return alert('Ingresa cantidad en al menos una sala');
                                if (!superiorInfo) return alert('No se pudo determinar el superior para enviar la solicitud.');

                                onConfirm({
                                    items: items, // Send all selected rooms
                                    totalQuantity,
                                    role: effectiveRole,
                                    prices: { gross: totalGross, discount: totalDiscount, net: totalNet },
                                    superiorId: superiorInfo.id,
                                    amount: totalNet,
                                    isRequest: true
                                });
                                onClose();
                            }}
                            className={`${totalQuantity > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-700 cursor-not-allowed'} flex-3 w-full py-3 rounded-xl text-white font-bold shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2`}
                            disabled={totalQuantity <= 0}
                        >
                            <span>📤</span> Notificar Pedido
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WholesaleCalculatorModal;

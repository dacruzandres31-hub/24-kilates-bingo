import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Check, X, Eye, RefreshCw, AlertTriangle, Calculator } from 'lucide-react';
import CardReceiptModal from './CardReceiptModal';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

export default function DepositInbox() {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, deposit: null });
    const [modalRecibo, setModalRecibo] = useState({ isOpen: false, data: null }); // Receipt modal state

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
        
        // Socket.IO para actualizaciones en tiempo real
        const socket = io(API_URL || window.location.origin);
        
        // Escuchar nuevas solicitudes
        socket.on('deposit_request_created', (data) => {
            console.log('📩 Nueva solicitud de depósito:', data);
            fetchDeposits(); // Refrescar lista
        });
        
        // Escuchar cuando otra persona procesa un depósito
        socket.on('deposit_request_processed', (data) => {
            console.log('✅ Depósito procesado:', data);
            fetchDeposits(); // Actualizar lista
        });
        
        const interval = setInterval(fetchDeposits, 15000); // Backup polling
        
        return () => {
            clearInterval(interval);
            socket.off('deposit_request_created');
            socket.off('deposit_request_processed');
            socket.disconnect();
        };
    }, []);

    const handleApproveClick = (deposit) => {
        setConfirmModal({ open: true, deposit });
    };

    const confirmApproval = async () => {
        const { deposit } = confirmModal;
        if (!deposit) return;

        setConfirmModal({ open: false, deposit: null });
        setProcessing(deposit.id);

        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post(`${API_URL}/api/deposits/${deposit.id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Determinar tipo de transacción y mostrar recibo apropiado
            const items = getDepositItems(deposit);
            const isCardPurchase = deposit.request_type === 'card_purchase' || deposit.request_type === 'b2b_stock';
            const isMembership = deposit.request_type === 'membership_purchase';
            
            if (isMembership && response.data?.data?.membershipTicket) {
                // Membresía - usar CardReceiptModal con color dorado
                const ticket = response.data.data.membershipTicket;
                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;
                setModalRecibo({
                    isOpen: true,
                    data: {
                        type: 'membresia',
                        operationType: 'membership',
                        operation: `MEMBRESÍA ${details?.planName?.toUpperCase() || 'VIP'}`,
                        userName: deposit.username,
                        recipientId: deposit.user_id,
                        quantity: parseFloat(deposit.amount_declared),
                        timestamp: new Date().toLocaleString(),
                        transactionId: `VIP-${deposit.id}`,
                        extraDetails: {
                            plan: ticket.planName,
                            activacion: new Date(ticket.activatedAt).toLocaleDateString('es-AR'),
                            vencimiento: new Date(ticket.expiresAt).toLocaleDateString('es-AR')
                        }
                    }
                });
            } else if (isCardPurchase && items.length > 0) {
                // Compra de cartones - color púrpura/sala
                setModalRecibo({
                    isOpen: true,
                    data: {
                        type: 'cartones',
                        operationType: 'cards',
                        operation: 'VENTA DE CARTONES',
                        userName: deposit.username,
                        recipientId: deposit.user_id,
                        quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
                        room: items.length === 1 ? items[0].room : null,
                        timestamp: new Date().toLocaleString(),
                        transactionId: `STK-${deposit.id}`,
                        items: items.map(i => ({ room: i.room, qty: i.quantity })),
                        extraDetails: null
                    }
                });
            } else {
                // Depósito de dinero/fichas - color azul
                setModalRecibo({
                    isOpen: true,
                    data: {
                        type: 'dinero',
                        operationType: 'deposit',
                        operation: 'DEPÓSITO ACREDITADO',
                        userName: deposit.username,
                        recipientId: deposit.user_id,
                        quantity: parseFloat(deposit.amount_declared),
                        timestamp: new Date().toLocaleString(),
                        transactionId: `DEP-${deposit.id}`,
                        extraDetails: deposit.bank_name ? {
                            bank: deposit.bank_name,
                            alias: deposit.account_alias
                        } : null
                    }
                });
            }
            
            fetchDeposits();
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            if (msg.includes('INSUFFICIENT_SELLER_STOCK')) {
                alert('⚠️ NO TIENES STOCK SUFICIENTE\n\nDebes recargar stock para seguir vendiendo. Cómprale a tu superior.');
            } else {
                alert('Error aprobando: ' + msg);
            }
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

    // Helper para parsear detalles
    const getDepositItems = (deposit) => {
        try {
            const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;
            return details?.items || (details?.room ? [details] : []);
        } catch (e) {
            return [];
        }
    };

    // Render del modal de confirmación
    const renderConfirmationModal = () => {
        if (!confirmModal.open || !confirmModal.deposit) return null;
        const { deposit } = confirmModal; // Contiene campos como 'username', 'role', 'details'
        const items = getDepositItems(deposit);
        const isBonusEligible = deposit.role === 'agente' || deposit.role === 'admin';
        const isCardPurchase = deposit.request_type === 'card_purchase' || deposit.request_type === 'b2b_stock';

        return createPortal(
            <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Check className="text-emerald-400" /> Confirmar Acreditación
                    </h3>

                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Usuario:</span>
                                <span className="text-white font-medium">{deposit.username}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Rol Detectado:</span>
                                <span className="text-blue-300 font-bold uppercase text-xs px-2 py-0.5 bg-blue-900/40 rounded">
                                    {deposit.role || 'DESCONOCIDO'}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                <span className="text-gray-400">Monto Declarado:</span>
                                <span className="text-emerald-400 font-bold text-lg">
                                    ${Number(deposit.amount_declared).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {isCardPurchase && items.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-gray-300 text-sm font-bold flex items-center gap-2">
                                    <Calculator size={14} /> Detalle de Acreditación:
                                </p>
                                <div className="space-y-2 bg-gray-900/30 p-3 rounded border border-gray-700/50">
                                    {items.map((item, idx) => {
                                        const bonus = isBonusEligible ? Math.floor(item.quantity * 0.1) : 0;
                                        return (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400 capitalize">{item.room}</span>
                                                <div className="text-right">
                                                    <span className="text-white font-bold">{item.quantity}</span>
                                                    {bonus > 0 && (
                                                        <span className="text-emerald-400 text-xs ml-2 font-bold">
                                                            (+{bonus} Regalo)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {isBonusEligible && (
                                    <p className="text-emerald-400 text-xs text-center italic mt-1">
                                        ✨ Incluye 10% de bonificación por rol {deposit.role}
                                    </p>
                                )}
                            </div>
                        )}

                        {!isCardPurchase && deposit.request_type !== 'membership_purchase' && (
                            <p className="text-yellow-400 text-sm bg-yellow-900/20 p-2 rounded border border-yellow-900/50 text-center">
                                Se acreditará saldo en efectivo al balance del usuario.
                            </p>
                        )}

                        {deposit.request_type === 'membership_purchase' && (
                            <p className="text-emerald-400 text-sm bg-emerald-900/20 p-2 rounded border border-emerald-900/50 text-center font-bold">
                                ✅ Al confirmar, se activará la Membresía Automáticamente.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setConfirmModal({ open: false, deposit: null })}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors font-medium border border-gray-600"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmApproval}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg transition-colors font-bold shadow-lg shadow-emerald-900/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
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
                                <div className="flex items-center gap-2">
                                    <h4 className="text-white font-medium truncate">{deposit.username}</h4>
                                    {deposit.role && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${deposit.role === 'admin' ? 'bg-indigo-900 text-indigo-300' :
                                            deposit.role === 'agente' ? 'bg-purple-900 text-purple-300' :
                                                'bg-gray-700 text-gray-400'
                                            }`}>
                                            {deposit.role}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-400 mt-1">
                                    {deposit.request_type === 'b2b_stock' || deposit.request_type === 'card_purchase' ? (
                                        <>
                                            Tipo: <span className="text-purple-400 font-bold">SOLICITUD STOCK</span>
                                            {(() => {
                                                const items = getDepositItems(deposit);
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
                                    ) : deposit.request_type === 'membership_purchase' ? (
                                        <>
                                            Tipo: <span className="text-gold-400 font-bold" style={{ color: '#ffd700' }}>MEMBRESÍA VIP</span>
                                            {(() => {
                                                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;
                                                return (
                                                    <div className="mt-1 bg-yellow-900/30 p-2 rounded border border-yellow-500/30">
                                                        <span className="text-white text-xs block">Plan Solicitado:</span>
                                                        <span className="text-white font-bold uppercase" style={{ color: '#ffd700' }}>
                                                            {details?.planName || 'VIP'}
                                                        </span>
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
                                        className="w-32 h-32 object-contain bg-gray-900 rounded border border-gray-600 group-hover:border-emerald-500 transition-colors"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs text-center p-2">
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
                                    onClick={() => handleApproveClick(deposit)}
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

            {/* Confirmation Modal */}
            {renderConfirmationModal()}

            {/* Proof Modal */}
            {selectedProof && createPortal(
                <div
                    className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 m-0"
                    onClick={() => setSelectedProof(null)}
                >
                    <img
                        src={selectedProof}
                        alt="Comprobante Full"
                        className="w-full h-full object-contain block"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 bg-transparent rounded-full p-2 z-[10000]">
                        <X size={40} strokeWidth={3} className="drop-shadow-lg" />
                    </button>
                </div>,
                document.body
            )}

            {/* Receipt Modal for deposits and card purchases */}
            {modalRecibo.isOpen && createPortal(
                <CardReceiptModal
                    isOpen={modalRecibo.isOpen}
                    onClose={() => setModalRecibo({ isOpen: false, data: null })}
                    data={modalRecibo.data}
                />,
                document.body
            )}
        </div>
    );
}

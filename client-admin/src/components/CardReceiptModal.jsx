import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';

const CardReceiptModal = ({ isOpen, onClose, data }) => {
    const receiptRef = useRef(null);

    if (!isOpen || !data) return null;

    const {
        type,        // 'cartones', 'dinero', 'membresia', 'retiro'
        operation,   // 'Carga', 'Descarga', 'Transferencia', 'COMPRA MEMBRESÍA', 'RETIRO EXITOSO'
        userName,
        quantity,
        room,        // 'bronce', 'plata', 'oro' (solo para cartones)
        timestamp,
        transactionId,
        recipientId, // Asegurarnos de recibir esto
        operationType // 'membership', 'withdrawal', 'deposit', 'cards' - para colores
    } = data;

    const [waConfig, setWaConfig] = useState(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchWAConfig();
        }
    }, [isOpen]);

    const fetchWAConfig = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/whatsapp/config', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.config?.is_active) {
                setWaConfig(res.data.config);
            }
        } catch (error) {
            console.warn('WA Config not available');
        }
    };

    const handleDownload = async () => {
        if (!receiptRef.current) return;

        try {
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: null,
                scale: 2, // Mejor calidad
                logging: false,
                useCORS: true
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Recibo_${userName}_${transactionId}.png`;
            link.click();
        } catch (error) {
            console.error("Error generating image:", error);
            alert("❌ No se pudo generar la imagen del recibo.");
        }
    };

    const handleShareWhatsApp = async () => {
        if (!receiptRef.current) return;

        // Texto descriptivo para el mensaje
        const text = `*BINGO 24 KILATES - COMPROBANTE OFICIAL*\n\n` +
            `🔹 *Operación:* ${operation?.toUpperCase()}\n` +
            `👤 *Usuario:* ${userName}\n` +
            `💰 *Cantidad:* ${type === 'dinero' ? `$${quantity.toLocaleString('es-CO')}` : quantity}${room ? ` (${room.toUpperCase()})` : ''}\n` +
            `📅 *Fecha:* ${timestamp}\n` +
            `🆔 *ID:* ${transactionId}\n\n` +
            `¡Gracias por tu confianza! 🎰💎`;

        try {
            // Intentar usar el API de Compartir de Web (funciona en móviles)
            const canvas = await html2canvas(receiptRef.current, { scale: 2 });
            const imageBase64 = canvas.toDataURL('image/png'); // Usar base64 para la API
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `recibo_${transactionId}.png`, { type: 'image/png' });

            // SI HAY CONFIGURACIÓN DE GATEWAY AUTOMÁTICO
            if (waConfig && waConfig.is_active && recipientId) {
                setIsSending(true);
                try {
                    const token = localStorage.getItem('adminToken');
                    await axios.post('/api/whatsapp/send-receipt', {
                        recipientId,
                        transactionId,
                        message: text,
                        imageUrl: imageBase64
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    alert("✅ ¡Enviado automáticamente por WhatsApp!");
                    return; // Éxito
                } catch (sendErr) {
                    console.error("Auto send failed:", sendErr);
                    // Continúa con el fallback manual
                } finally {
                    setIsSending(false);
                }
            }

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Comprobante 24 Kilates',
                    text: text,
                });
            } else {
                // Fallback: Solo WhatsApp wa.me con texto
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
                alert("💡 Tu navegador no soporta compartir imágenes directamente. Se abrirá WhatsApp con el texto; recuerda adjuntar la imagen descargada.");
            }
        } catch (error) {
            console.error("Error sharing:", error);
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    };

    const getRoomColor = (room) => {
        switch (room?.toLowerCase()) {
            case 'bronce': return 'from-orange-500 to-orange-700';
            case 'plata': return 'from-gray-300 to-gray-500';
            case 'oro': return 'from-yellow-400 to-yellow-600';
            default: return 'from-blue-500 to-indigo-600';
        }
    };

    // Colores según tipo de operación
    const getOperationColor = () => {
        // Si hay operationType específico, usarlo
        if (operationType) {
            switch (operationType) {
                case 'membership': return 'from-amber-500 via-yellow-400 to-amber-600'; // Dorado VIP
                case 'withdrawal': return 'from-emerald-500 to-green-600'; // Verde éxito
                case 'deposit': return 'from-blue-500 to-indigo-600'; // Azul depósito
                case 'cards': return room ? getRoomColor(room) : 'from-purple-500 to-indigo-600'; // Color de sala o púrpura
                default: break;
            }
        }
        // Fallback: detectar por operación
        const op = operation?.toLowerCase() || '';
        if (op.includes('membresía') || op.includes('membresia') || op.includes('vip')) {
            return 'from-amber-500 via-yellow-400 to-amber-600';
        }
        if (op.includes('retiro') || op.includes('premio')) {
            return 'from-emerald-500 to-green-600';
        }
        if (op.includes('depósito') || op.includes('deposito') || op.includes('acredit')) {
            return 'from-blue-500 to-indigo-600';
        }
        // Default: usar color de sala si hay, sino azul
        return room ? getRoomColor(room) : 'from-blue-500 to-indigo-600';
    };

    // Mensaje de felicitación según tipo
    const getCelebrationMessage = () => {
        if (operationType === 'membership' || operation?.toLowerCase().includes('membresía')) {
            return '¡BIENVENIDO AL CLUB VIP!';
        }
        if (operationType === 'withdrawal' || operation?.toLowerCase().includes('retiro')) {
            return '¡MUCHAS FELICIDADES!';
        }
        if (type === 'dinero') {
            return '¡SALDO ACREDITADO!';
        }
        return '¡BUENA SUERTE!';
    };

    // Color del monto según tipo
    const getAmountColor = () => {
        if (operationType === 'membership') return 'text-amber-600';
        if (operationType === 'withdrawal') return 'text-emerald-600';
        if (type === 'dinero') return 'text-green-600';
        return 'text-indigo-600';
    };

    // Color del mensaje según tipo
    const getMessageColor = () => {
        if (operationType === 'membership') return 'text-amber-600';
        if (operationType === 'withdrawal') return 'text-emerald-600';
        if (type === 'dinero') return 'text-blue-600';
        return 'text-blue-600';
    };

    return (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm">
                {/* Ticket Container */}
                <div
                    ref={receiptRef}
                    className="bg-white rounded-t-2xl overflow-hidden shadow-2xl relative"
                >
                    {/* Header con Perforación Decorativa */}
                    <div className={`h-24 bg-gradient-to-r ${getOperationColor()} flex items-center justify-center relative`}>
                        <div className="text-white text-center">
                            <h2 className="text-2xl font-black tracking-tighter">BINGO 24K</h2>
                            <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Comprobante Oficial</p>
                        </div>

                        {/* Círculos de perforación laterales */}
                        <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-black/80 rounded-full"></div>
                        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/80 rounded-full"></div>
                    </div>

                    {/* Contenido del Ticket */}
                    <div className="px-8 pt-8 pb-4 text-gray-800 font-mono text-sm border-x-8 border-white">
                        <div className="text-center mb-6">
                            <p className="text-xs text-gray-400 mb-1">{timestamp || new Date().toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">ID: {transactionId || Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                <span className="text-gray-500">OPERACIÓN:</span>
                                <span className="font-bold text-gray-900">{operation?.toUpperCase()}</span>
                            </div>

                            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                <span className="text-gray-500">DESTINATARIO:</span>
                                <span className="font-bold text-gray-900">{userName}</span>
                            </div>

                            {/* Si hay items detallados (ej: Multi-Sala) */}
                            {data.items && data.items.length > 0 ? (
                                <div className="border-b border-dashed border-gray-200 pb-2">
                                    <div className="text-gray-500 text-xs mb-1">DETALLE:</div>
                                    <div className="space-y-1">
                                        {data.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span className="text-gray-800 capitalize">• {item.room}</span>
                                                <span className="font-bold text-gray-900">{item.qty} u.</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                room && (
                                    <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                        <span className="text-gray-500">SALA:</span>
                                        <span className="font-bold text-gray-900">{room.toUpperCase()}</span>
                                    </div>
                                )
                            )}

                            {/* Banking Details for Withdrawals */}
                            {data.extraDetails && (
                                <div className="bg-gray-50 rounded-lg p-3 text-xs border border-dashed border-gray-200">
                                    <p className="font-bold text-gray-700 mb-1 border-b border-gray-200 pb-1">DATOS DE TRANSFERENCIA</p>
                                    <div className="space-y-1 mt-1">
                                        {data.extraDetails.holder && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Titular:</span>
                                                <span className="font-bold text-gray-800 uppercase">{data.extraDetails.holder}</span>
                                            </div>
                                        )}
                                        {data.extraDetails.bank && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Banco/Método:</span>
                                                <span className="font-bold text-gray-800 uppercase">{data.extraDetails.bank}</span>
                                            </div>
                                        )}
                                        {data.extraDetails.cbu && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">CBU/Alias:</span>
                                                <span className="font-mono text-gray-800">{data.extraDetails.cbu}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="py-6 text-center">
                                <p className="text-gray-400 text-xs mb-1">CANTIDAD TOTAL</p>
                                <p className={`text-5xl font-black tracking-tighter ${getAmountColor()}`}>
                                    {type === 'dinero' || type === 'membresia' || type === 'retiro' ? `$${quantity.toLocaleString('es-CO')}` : quantity}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    {type === 'membresia' ? 'membresía activada' : 
                                     type === 'retiro' ? 'fichas acreditadas' :
                                     type === 'dinero' ? 'fichas acreditadas' : 'cartones transferidos'}
                                </p>
                            </div>
                        </div>

                        {/* Footer del Ticket */}
                        <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-100 text-center">
                            <p className={`text-xs font-bold ${getMessageColor()} mb-1 tracking-widest`}>
                                {getCelebrationMessage()}
                            </p>
                            <p className="text-[9px] text-gray-400">Este es un comprobante digital de 24 Kilates.</p>
                        </div>
                    </div>

                    {/* Borde Zig-Zag inferior */}
                    <div className="h-4 w-full bg-white flex" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col gap-3 px-4">
                    <button
                        onClick={handleShareWhatsApp}
                        disabled={isSending}
                        className={`w-full py-3 ${isSending ? 'bg-slate-600' : 'bg-green-600 hover:bg-green-500'} text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}
                    >
                        <span>{isSending ? '⏳' : '📱'}</span>
                        {isSending ? 'ENVIANDO...' : (waConfig ? 'ENVIAR POR WHATSAPP (AUTO)' : 'COMPARTIR POR WHATSAPP')}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <span>💾</span> DESCARGAR IMAGEN
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/20"
                    >
                        LISTO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardReceiptModal;

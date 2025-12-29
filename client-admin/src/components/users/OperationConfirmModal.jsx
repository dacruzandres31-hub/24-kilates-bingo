import React from 'react';
import { createPortal } from 'react-dom';

const OperationConfirmModal = ({
    isOpen,
    onClose,
    modalConfirmacion,
    modalGestionUsuario,
    sharedCartonesStock,
    onCantidadChange,
    onConfirm
}) => {
    if (!isOpen) return null;

    const { tipo, sala, cantidad, isProcessing } = modalConfirmacion;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                {/* Header Dinámico según tipo */}
                <div className={`px-6 py-4 flex items-center justify-between text-white ${tipo === 'superadmin-add-balance' || tipo === 'superadmin-add-cards' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                    tipo === 'dinero-cargar' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                        tipo === 'dinero-descargar' ? 'bg-gradient-to-r from-gray-700 to-gray-800' :
                            tipo === 'cartones-agregar' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' :
                                tipo === 'gift-agregar' ? 'bg-gradient-to-r from-pink-600 to-rose-600' :
                                    'bg-gradient-to-r from-gray-700 to-gray-800'
                    }`}>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        {tipo === 'superadmin-add-balance' ? '💰 Generar Balance SuperAdmin' :
                            tipo === 'superadmin-add-cards' ? `🎫 Generar Cartones ${sala.toUpperCase()}` :
                                tipo === 'dinero-cargar' ? '💵 Cargar Dinero' :
                                    tipo === 'dinero-descargar' ? '💸 Pago de Premio (Descargar)' :
                                        tipo === 'cartones-agregar' ? `🎫 Cargar Cartones ${sala.toUpperCase()}` :
                                            tipo === 'cartones-quitar' ? `🎫 Quitar Cartones ${sala.toUpperCase()}` :
                                                tipo === 'gift-agregar' ? `🎁 Regalar Cartones ${sala.toUpperCase()}` :
                                                    tipo === 'gift-quitar' ? `🎁 Quitar Regalo ${sala.toUpperCase()}` :
                                                        'Confirmar Operación'
                        }
                    </h3>
                    <button onClick={onClose} className="hover:text-red-200 transition-colors">✕</button>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    <p className="text-gray-300 text-center mb-6 text-lg">
                        Ingresa la cantidad a {
                            tipo.includes('cargar') || tipo.includes('agregar') ? 'CARGAR' : 'QUITAR / DESCARGAR'
                        } para <span className="text-white font-bold">{modalGestionUsuario.usuario?.username}</span>:
                    </p>

                    {/* Mostrar stock disponible del admin para cargar */}
                    {(tipo === 'cartones-agregar') && (
                        <div className="mb-3 p-3 bg-purple-900/30 border border-purple-600/50 rounded-lg">
                            <p className="text-purple-300 text-sm text-center">
                                📦 Stock disponible en tu panel: <span className="font-bold">{(sharedCartonesStock?.[sala] || 0).toLocaleString('es-CO')}</span>
                            </p>
                        </div>
                    )}

                    {/* Mostrar saldo disponible para CARGAR dinero */}
                    {tipo === 'dinero-cargar' && !tipo.includes('superadmin') && (
                        <div className="mb-3 p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                            <p className="text-green-300 text-sm text-center">
                                💰 Tu saldo disponible: <span className="font-bold">${Math.floor(modalGestionUsuario.adminBalance || 0).toLocaleString('es-CO')}</span>
                            </p>
                        </div>
                    )}

                    {/* Mostrar cartones del usuario para quitar */}
                    {tipo === 'cartones-quitar' && (() => {
                        const usuario = modalGestionUsuario.usuario;
                        const cartonesUsuario = usuario ? (usuario[`cards_${sala}`] || 0) : 0;
                        return (
                            <div className="mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                                <p className="text-gray-300 text-sm text-center">
                                    🎫 Cartones {sala} del usuario: <span className="font-bold">{cartonesUsuario.toLocaleString('es-CO')}</span>
                                </p>
                            </div>
                        );
                    })()}

                    {/* Mostrar gift cards disponibles para quitar */}
                    {tipo === 'gift-quitar' && (() => {
                        const giftCardsActuales = modalGestionUsuario.giftCards?.[sala] || 0;
                        return (
                            <div className="mb-3 p-3 bg-pink-900/30 border border-pink-600/50 rounded-lg">
                                <p className="text-pink-300 text-sm text-center">
                                    🎁 Cartones de regalo disponibles: <span className="font-bold">{giftCardsActuales.toLocaleString('es-CO')}</span>
                                </p>
                            </div>
                        );
                    })()}

                    <input
                        type="text"
                        value={cantidad ? parseInt(cantidad || '0').toLocaleString('es-CO') : ''}
                        onChange={(e) => onCantidadChange(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onConfirm();
                            if (e.key === 'Escape') onClose();
                            if (e.key === '.' || e.key === ',') e.preventDefault();
                        }}
                        placeholder={tipo.includes('dinero') ? '$ 0' : '0'}
                        className="w-full bg-gray-700/50 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white text-center text-xl font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                        autoFocus
                    />

                    <p className="text-gray-400 text-xs text-center mt-2">
                        Presiona <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Enter</kbd> para confirmar o <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Esc</kbd> para cancelar
                    </p>
                </div>

                {/* Footer con botones */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${tipo.includes('superadmin') ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500' :
                                tipo === 'dinero-cargar' ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' :
                                    tipo === 'dinero-descargar' ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700' :
                                        tipo === 'cartones-agregar' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' :
                                            tipo === 'gift-agregar' ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500' :
                                                'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                            }`}
                    >
                        {isProcessing ? '⏳ PROCESANDO...' : '✓ ACEPTAR'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OperationConfirmModal;

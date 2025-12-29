import React from 'react';

const UserManagementDetail = ({
    modalGestionUsuario,
    currentUser,
    onClose,
    onManageMoney,
    onManageCards,
    onManageGiftCards,
    onShowCalculator
}) => {
    const { usuario, giftCards } = modalGestionUsuario;
    if (!usuario) return null;

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {usuario.role === 'agente' ? '🏢' : '👤'} {usuario.username}
                        </h2>
                        <p className="text-sm text-purple-200 mt-1">
                            {usuario.role === 'agente' ? 'Agente' : 'Jugador'} • ID: {usuario.id}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                    >
                        <span className="text-2xl">✕</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Balance - Solo visible para SuperAdmin y SOLO para Jugadores */}
                {currentUser.role === 'superadmin' && usuario.role === 'jugador' && (
                    <div>
                        <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                            💰 Balance
                        </h3>
                        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-600/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-green-300 font-semibold">Saldo Actual:</span>
                                <span className="text-white font-bold text-2xl">
                                    ${Math.floor(usuario.balance || 0).toLocaleString('es-CO')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onManageMoney('cargar')}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-all"
                                >
                                    + Cargar
                                </button>
                                <button
                                    onClick={() => onManageMoney('descargar')}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-all"
                                >
                                    - Descargar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Carga Masiva (B2B) */}
                <div>
                    <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                        ⚡ Carga Rápida & Mayorista
                    </h3>
                    <button
                        onClick={onShowCalculator}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
                    >
                        <span className="text-2xl">🧮</span>
                        <span>CALCULADORA DE COSTOS (B2B)</span>
                    </button>
                </div>

                {/* Cartones Normales */}
                <div>
                    <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                        🎫 Cartones Normales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['bronce', 'plata', 'oro'].map(sala => (
                            <div key={sala} className={`p-4 rounded-xl border-2 ${sala === 'bronce' ? 'bg-orange-900/20 border-orange-500/50' :
                                    sala === 'plata' ? 'bg-gray-700/20 border-gray-400/50' :
                                        'bg-yellow-900/20 border-yellow-500/50'
                                }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`font-bold uppercase ${sala === 'bronce' ? 'text-orange-400' :
                                            sala === 'plata' ? 'text-gray-300' :
                                                'text-yellow-400'
                                        }`}>{sala}</span>
                                    <span className="text-xl font-bold text-white">
                                        {(usuario[`cards_${sala}`] || 0).toLocaleString('es-CO')}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onManageCards('agregar', sala)}
                                        className="flex-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 py-1 rounded-lg text-sm font-bold border border-green-500/30 transition-all"
                                    >
                                        + Agregar
                                    </button>
                                    <button
                                        onClick={() => onManageCards('quitar', sala)}
                                        className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 py-1 rounded-lg text-sm font-bold border border-red-500/30 transition-all"
                                    >
                                        - Quitar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gift Cards */}
                <div>
                    <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                        🎁 Cartones de Regalo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['bronce', 'plata', 'oro'].map(sala => (
                            <div key={sala} className={`p-4 rounded-xl border-2 ${sala === 'bronce' ? 'bg-pink-900/20 border-pink-500/50' :
                                    sala === 'plata' ? 'bg-pink-900/20 border-pink-500/50' :
                                        'bg-pink-900/20 border-pink-500/50'
                                }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold uppercase text-pink-400">{sala}</span>
                                    <span className="text-xl font-bold text-white">
                                        {(giftCards?.[sala] || 0).toLocaleString('es-CO')}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onManageGiftCards('agregar', sala)}
                                        className="flex-1 bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 py-1 rounded-lg text-sm font-bold border border-pink-500/30 transition-all"
                                    >
                                        + Regalar
                                    </button>
                                    <button
                                        onClick={() => onManageGiftCards('quitar', sala)}
                                        className="flex-1 bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 py-1 rounded-lg text-sm font-bold border border-gray-500/30 transition-all"
                                    >
                                        - Quitar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-900/50 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                >
                    CERRAR
                </button>
            </div>
        </div>
    );
};

export default UserManagementDetail;

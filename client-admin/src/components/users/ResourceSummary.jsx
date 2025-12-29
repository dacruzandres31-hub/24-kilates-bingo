import React from 'react';

const ResourceSummary = ({
    sharedUserData,
    currentUser,
    sharedCartonesStock,
    onOpenConfirmModal,
    onOpenWholesaleModal,
    onOpenCardPurchase
}) => {
    return (
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                💼 Recursos Disponibles - Panel de {sharedUserData?.username || currentUser.username}
                {currentUser.role === 'superadmin' && (
                    <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold ml-2">SUPERADMIN</span>
                )}
            </h2>

            {/* BOTÓN COMPRAR STOCK (Solo Agentes y Admins) */}
            {(currentUser.role === 'agente' || currentUser.role === 'admin') && (
                <button
                    onClick={onOpenCardPurchase}
                    className="mb-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                    <span className="text-xl">🛒</span>
                    <span>COMPRAR STOCK</span>
                </button>
            )}

            <div className={`grid gap-4 ${currentUser.role === 'superadmin' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
                {/* Balance - Oculto para Agentes */}
                {currentUser.role !== 'agente' && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
                        <p className="text-sm text-purple-200">Balance (Premios)</p>
                        <p className="text-2xl font-bold text-white mb-2">${Math.floor((sharedUserData?.balance || currentUser.balance) || 0).toLocaleString('es-CO')}</p>
                        {currentUser.role === 'superadmin' && (
                            <button
                                onClick={() => onOpenConfirmModal('superadmin-add-balance')}
                                className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                                title="Agregar balance"
                            >
                                +
                            </button>
                        )}
                    </div>
                )}

                {/* Cartones Bronce */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
                    <p className="text-sm text-orange-200">Cartones Bronce</p>
                    <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.bronce || currentUser.cards_bronce || 0).toLocaleString('es-CO')}</p>
                    {currentUser.role === 'superadmin' && (
                        <button
                            onClick={() => onOpenConfirmModal('superadmin-add-cards', 'bronce')}
                            className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                            title="Agregar cartones bronce"
                        >
                            +
                        </button>
                    )}
                </div>

                {/* Cartones Plata */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
                    <p className="text-sm text-gray-200">Cartones Plata</p>
                    <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.plata || currentUser.cards_plata || 0).toLocaleString('es-CO')}</p>
                    {currentUser.role === 'superadmin' && (
                        <button
                            onClick={() => onOpenConfirmModal('superadmin-add-cards', 'plata')}
                            className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                            title="Agregar cartones plata"
                        >
                            +
                        </button>
                    )}
                </div>

                {/* Cartones Oro */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
                    <p className="text-sm text-yellow-200">Cartones Oro</p>
                    <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.oro || currentUser.cards_oro || 0).toLocaleString('es-CO')}</p>
                    {currentUser.role === 'superadmin' && (
                        <button
                            onClick={() => onOpenConfirmModal('superadmin-add-cards', 'oro')}
                            className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                            title="Agregar cartones oro"
                        >
                            +
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceSummary;

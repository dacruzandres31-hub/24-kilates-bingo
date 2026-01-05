import React from 'react';
import { createPortal } from 'react-dom';

const EditUserModal = ({
    isOpen,
    onClose,
    usuario,
    datosPersonales,
    datosBancarios,
    isProcessing,
    onPersonalDataChange,
    onBankDataChange,
    onSubmit
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-blue-500/50 w-full max-w-md">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                    <h3 className="text-xl font-bold">✏️ Modificar Usuario</h3>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-red-300 transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    {/* Usuario */}
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-6">
                        <p className="text-sm text-gray-400">Modificando datos de:</p>
                        <p className="text-lg font-bold text-white">{usuario?.username}</p>
                    </div>

                    {/* Formulario: Datos personales */}
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={datosPersonales.nombre_completo}
                            onChange={(e) => onPersonalDataChange('nombre_completo', e.target.value)}
                            placeholder="Nombre completo (opcional)"
                            className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 rounded-t-lg transition-colors"
                        />
                        <input
                            type="text"
                            value={datosPersonales.documento}
                            onChange={(e) => onPersonalDataChange('documento', e.target.value)}
                            placeholder="Documento (opcional)"
                            className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                        />
                        <input
                            type="email"
                            value={datosPersonales.email}
                            onChange={(e) => onPersonalDataChange('email', e.target.value)}
                            placeholder="Email (opcional)"
                            className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                        />
                        <input
                            type="tel"
                            value={datosPersonales.telefono}
                            onChange={(e) => onPersonalDataChange('telefono', e.target.value)}
                            placeholder="Teléfono (opcional)"
                            className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 rounded-b-lg transition-colors"
                        />

                        {/* Datos Bancarios (Solo Agentes/Admins) */}
                        {(usuario?.role === 'agente' || usuario?.role === 'admin') && (
                            <div className="pt-4 space-y-4 border-t border-gray-700">
                                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">🏦 Datos Bancarios B2B</p>
                                <input
                                    type="text"
                                    value={datosBancarios.bank_name}
                                    onChange={(e) => onBankDataChange('bank_name', e.target.value)}
                                    placeholder="Nombre del Banco"
                                    className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                                />
                                <input
                                    type="text"
                                    value={datosBancarios.cbu}
                                    onChange={(e) => onBankDataChange('cbu', e.target.value.replace(/\D/g, '').slice(0, 22))}
                                    placeholder="CBU (22 dígitos)"
                                    maxLength={22}
                                    className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                                />
                                {datosBancarios.cbu && datosBancarios.cbu.length !== 22 && datosBancarios.cbu.length > 0 && (
                                    <span className="text-yellow-400 text-xs">{datosBancarios.cbu.length}/22 dígitos</span>
                                )}
                                <input
                                    type="text"
                                    value={datosBancarios.alias}
                                    onChange={(e) => onBankDataChange('alias', e.target.value)}
                                    placeholder="Alias"
                                    className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 rounded-b-lg transition-colors"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 font-semibold rounded-xl transition-all"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isProcessing}
                        className={`flex-1 py-3 text-white font-semibold rounded-xl transition-all ${isProcessing
                            ? 'opacity-50 cursor-not-allowed bg-gray-600'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                            }`}
                    >
                        {isProcessing ? '⏳ GUARDANDO...' : 'ACEPTAR'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditUserModal;

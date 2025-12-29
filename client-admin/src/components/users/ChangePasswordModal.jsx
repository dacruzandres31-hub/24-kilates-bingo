import React from 'react';
import { createPortal } from 'react-dom';

const calculatePasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, text: 'Débil', color: 'text-red-500' };
    if (strength <= 3) return { level: 2, text: 'Media', color: 'text-yellow-500' };
    return { level: 3, text: 'Fuerte', color: 'text-green-500' };
};

const ChangePasswordModal = ({
    isOpen,
    onClose,
    usuario,
    newPassword,
    confirmPassword,
    showPassword,
    isProcessing,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onToggleShowPassword,
    onSubmit
}) => {
    if (!isOpen) return null;

    const strength = calculatePasswordStrength(newPassword);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                    <h3 className="text-xl font-bold">🔑 Cambiar Contraseña</h3>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-red-300 transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4">
                    {/* Usuario */}
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                        <p className="text-sm text-gray-400">Cambiando contraseña de:</p>
                        <p className="text-lg font-bold text-white">{usuario?.username}</p>
                    </div>

                    {/* Nueva Contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => onNewPasswordChange(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={onToggleShowPassword}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {/* Indicador de fortaleza */}
                        {newPassword && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${strength.level === 1 ? 'bg-red-500 w-1/3' :
                                            strength.level === 2 ? 'bg-yellow-500 w-2/3' :
                                                'bg-green-500 w-full'
                                            }`}
                                    ></div>
                                </div>
                                <span className={`text-sm font-semibold ${strength.color}`}>
                                    {strength.text}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confirmar Contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirmar Contraseña
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => onConfirmPasswordChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="Repetir contraseña"
                        />
                        {/* Indicador de coincidencia */}
                        {confirmPassword && (
                            <p className={`text-sm mt-2 ${newPassword === confirmPassword
                                ? 'text-green-400'
                                : 'text-red-400'
                                }`}>
                                {newPassword === confirmPassword
                                    ? '✓ Las contraseñas coinciden'
                                    : '✗ Las contraseñas no coinciden'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isProcessing}
                        className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${isProcessing
                            ? 'opacity-50 cursor-not-allowed bg-gray-600'
                            : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500'
                            }`}
                    >
                        {isProcessing ? '⏳ CAMBIANDO...' : '✓ CAMBIAR CONTRASEÑA'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ChangePasswordModal;

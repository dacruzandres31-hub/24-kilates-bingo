import React from 'react';
import { createPortal } from 'react-dom';

const calculatePasswordStrengthLocal = (password) => {
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

const CreateUserModal = ({
    isOpen,
    tipoUsuario,
    isAdmin,
    tabActiva,
    datosIngreso,
    datosPersonales,
    datosBancarios,
    showPassword,
    passwordStrength,
    onClose,
    onTipoChange,
    onAdminChange,
    onTabChange,
    onDatosIngresoChange,
    onDatosPersonalesChange,
    onDatosBancariosChange,
    onPasswordVisibilityToggle,
    onPasswordChange,
    onConfirm
}) => {
    if (!isOpen) return null;

    // Fallback strength calculation if not provided
    const currentStrength = passwordStrength || calculatePasswordStrengthLocal(datosIngreso.password);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-indigo-500/30 w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        ✨ Crear Nuevo {tipoUsuario === 'agente' ? (isAdmin ? 'Administrador' : 'Agente') : 'Jugador'}
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-red-300 transition-colors text-2xl">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-900/50 p-1">
                    <button
                        onClick={() => onTabChange('ingreso')}
                        className={`flex-1 py-2 text-sm font-bold transition-all ${tabActiva === 'ingreso' ? 'bg-indigo-600 text-white rounded-lg shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        🔑 LOGIN
                    </button>
                    <button
                        onClick={() => onTabChange('datos_personales')}
                        className={`flex-1 py-2 text-sm font-bold transition-all ${tabActiva === 'datos_personales' ? 'bg-indigo-600 text-white rounded-lg shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        👤 PERSONALES
                    </button>
                    {tipoUsuario === 'agente' && (
                        <button
                            onClick={() => onTabChange('datos_bancarios')}
                            className={`flex-1 py-2 text-sm font-bold transition-all ${tabActiva === 'datos_bancarios' ? 'bg-indigo-600 text-white rounded-lg shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            🏦 BANCARIOS
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {/* Tab: Login */}
                    {tabActiva === 'ingreso' && (
                        <div className="space-y-4">
                            {/* Role Selector for Agents */}
                            {tipoUsuario === 'agente' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoría de Agente</label>
                                    <div className="flex gap-2 p-1 bg-gray-950 rounded-xl border border-gray-700/50">
                                        <button
                                            type="button"
                                            onClick={() => onAdminChange(true)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isAdmin
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:bg-gray-800'}`}
                                        >
                                            <span className="text-base">🛡️</span> Administrador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAdminChange(false)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isAdmin
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:bg-gray-800'}`}
                                        >
                                            <span className="text-base">🏢</span> Agente Común
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 italic">
                                        {isAdmin
                                            ? '🛡️ Los administradores tienen un costo de cartón del 80%.'
                                            : '🏢 Los agentes comunes tienen un costo de cartón del 85%.'}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mt-4">
                                <span className="text-white text-xl w-8 text-center">👤</span>
                                <input
                                    type="text"
                                    value={datosIngreso.username}
                                    onChange={(e) => onDatosIngresoChange({ ...datosIngreso, username: e.target.value })}
                                    placeholder="Nombre de Usuario"
                                    className="flex-1 px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-white text-xl w-8 text-center">👁️</span>
                                    <div className="flex-1 relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={datosIngreso.password}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                onDatosIngresoChange({ ...datosIngreso, password: val });
                                                if (onPasswordChange) onPasswordChange(val);
                                            }}
                                            placeholder="Contraseña"
                                            className="w-full px-4 py-2 pr-10 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={onPasswordVisibilityToggle}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-indigo-400 transition-colors text-lg"
                                        >
                                            {showPassword ? '👁' : '🔒'}
                                        </button>
                                    </div>
                                </div>
                                {datosIngreso.password && currentStrength.level > 0 && (
                                    <div className="ml-11 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${currentStrength.level === 1 ? 'bg-red-500 w-1/3' :
                                                    currentStrength.level === 2 ? 'bg-yellow-500 w-2/3' :
                                                        'bg-green-500 w-full'
                                                    }`}
                                            ></div>
                                        </div>
                                        <span className={`text-sm font-semibold ${currentStrength.color}`}>
                                            {currentStrength.text}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Datos personales */}
                    {tabActiva === 'datos_personales' && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={datosPersonales.nombre_completo}
                                onChange={(e) => onDatosPersonalesChange({ ...datosPersonales, nombre_completo: e.target.value })}
                                placeholder="Nombre completo (opcional)"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                            <input
                                type="text"
                                value={datosPersonales.documento}
                                onChange={(e) => onDatosPersonalesChange({ ...datosPersonales, documento: e.target.value })}
                                placeholder="Documento (opcional)"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                            <input
                                type="email"
                                value={datosPersonales.email}
                                onChange={(e) => onDatosPersonalesChange({ ...datosPersonales, email: e.target.value })}
                                placeholder="Email (opcional)"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                            <input
                                type="tel"
                                value={datosPersonales.telefono}
                                onChange={(e) => onDatosPersonalesChange({ ...datosPersonales, telefono: e.target.value })}
                                placeholder="Teléfono (opcional)"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                        </div>
                    )}

                    {/* Tab: Datos bancarios (Solo Agente) */}
                    {tabActiva === 'datos_bancarios' && (
                        <div className="space-y-4">
                            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20 mb-2">
                                <p className="text-xs text-blue-300">
                                    ℹ️ Estos datos se mostrarán a tus sub-agentes cuando intenten comprar stock.
                                </p>
                            </div>
                            <input
                                type="text"
                                value={datosBancarios.bank_name}
                                onChange={(e) => onDatosBancariosChange({ ...datosBancarios, bank_name: e.target.value })}
                                placeholder="Nombre del Banco"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                            <input
                                type="text"
                                value={datosBancarios.cbu}
                                onChange={(e) => onDatosBancariosChange({ ...datosBancarios, cbu: e.target.value })}
                                placeholder="CBU (22 dígitos)"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                            <input
                                type="text"
                                value={datosBancarios.alias}
                                onChange={(e) => onDatosBancariosChange({ ...datosBancarios, alias: e.target.value })}
                                placeholder="Alias"
                                className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                            />
                        </div>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 px-6 pb-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 font-semibold rounded-xl transition-all"
                    >
                        CANCELAR
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                        ACEPTAR
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateUserModal;

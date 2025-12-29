import React from 'react';
import { createPortal } from 'react-dom';

const UserInfoModal = ({
    isOpen,
    onClose,
    usuario,
    estructura,
    agentesCount,
    jugadoresCount,
    parent,
    gamificationStats,
    onGrantAchievement
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                    <h3 className="text-xl font-bold">Informacion del Usuario</h3>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-red-300 transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4 text-gray-200">
                    {/* ID */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">ID:</span>
                        <span className="font-semibold">{usuario?.id}</span>
                    </div>

                    {/* Usuario */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Usuario:</span>
                        <span className="font-semibold">{usuario?.username}</span>
                    </div>

                    {/* Padre */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Padre:</span>
                        <span className="font-semibold">
                            {parent?.username || 'Sin padre'}
                        </span>
                    </div>

                    {/* Rol */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Rol:</span>
                        <span className="font-semibold">
                            {usuario?.role === 'jugador' ? 'Jugador' : 'Agente'}
                        </span>
                    </div>

                    {/* Marca */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Marca:</span>
                        <span className="font-semibold">{usuario?.username}</span>
                    </div>

                    {/* Agentes */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Agentes:</span>
                        <span className="font-semibold text-blue-400">{agentesCount}</span>
                    </div>

                    {/* Jugadores */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Jugadores:</span>
                        <span className="font-semibold text-green-400">{jugadoresCount}</span>
                    </div>

                    {/* Creado */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Creado:</span>
                        <span className="font-semibold">
                            {usuario?.created_at
                                ? new Date(usuario.created_at).toLocaleString('es-CO', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                                : 'No disponible'}
                        </span>
                    </div>

                    {/* Sección Gamificación */}
                    {gamificationStats && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                                🎮 Progreso del Jugador
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                    <p className="text-gray-400">Nivel</p>
                                    <p className="text-white font-bold text-lg">⭐ {gamificationStats.level}</p>
                                </div>
                                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                    <p className="text-gray-400">XP</p>
                                    <p className="text-purple-400 font-bold">{gamificationStats.currentXp}</p>
                                </div>
                                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                    <p className="text-gray-400">Racha Actual</p>
                                    <p className="text-orange-400 font-bold">🔥 {gamificationStats.currentStreak} días</p>
                                </div>
                                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                    <p className="text-gray-400">Logros</p>
                                    <p className="text-yellow-400 font-bold">🏅 {gamificationStats.achievementsCount}</p>
                                </div>
                            </div>
                            {/* Misiones Hoy */}
                            <div className="mt-3 bg-blue-900/20 border border-blue-600/30 p-2 rounded flex justify-between">
                                <span className="text-gray-300">Misiones Hoy:</span>
                                <span className="text-white font-bold">{gamificationStats.questProgress}</span>
                            </div>

                            {/* Botón Manual Unlock */}
                            <button
                                onClick={() => onGrantAchievement(usuario.id, usuario.username)}
                                className="mt-3 w-full py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold rounded text-sm transition-all shadow-lg"
                            >
                                🏆 Otorgar Logro Manualmente
                            </button>
                        </div>
                    )}

                    {/* Estructura */}
                    <div className="border-t border-gray-700 pt-4 mt-4">
                        <span className="text-gray-400 block mb-2">Estructura:</span>
                        <ul className="space-y-1 ml-4">
                            {estructura.map((username, index) => (
                                <li
                                    key={index}
                                    className={index === estructura.length - 1
                                        ? 'text-blue-400 font-bold'
                                        : 'text-gray-300'}
                                >
                                    • {username}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all"
                    >
                        CERRAR
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UserInfoModal;

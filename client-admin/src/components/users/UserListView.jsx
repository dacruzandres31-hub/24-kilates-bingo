import React from 'react';

const UserListView = ({
    usuariosDelAgente,
    allUsersHierarchy,
    busquedaUsuario,
    agenteSeleccionado,
    modalGestionUsuario,
    onBusquedaChange,
    onSelectUser,
    onOpenPasswordModal,
    onOpenEditModal,
    onOpenBlockModal,
    onOpenUnblockModal,
    tieneSubAgentes,
    currentUser
}) => {
    // Filter users based on search
    const usuariosFiltrados = busquedaUsuario
        ? usuariosDelAgente.filter(u =>
            u.username.toLowerCase().includes(busquedaUsuario.toLowerCase())
        )
        : usuariosDelAgente;


    return (
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
            {/* Título */}
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                👥 Listado de Usuarios
            </h3>

            {/* Búsqueda */}
            <div className="mb-4">
                <input
                    type="text"
                    value={busquedaUsuario}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    placeholder="🔍 Buscar usuario..."
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Lista de usuarios */}
            <div className="space-y-2 max-h-[700px] overflow-y-auto">
                {usuariosFiltrados && usuariosFiltrados.length > 0 ? (
                    usuariosFiltrados.map((usuario) => {
                        const esAgente = usuario.role === 'agente';
                        const tieneSubAgentesFlag = esAgente && tieneSubAgentes(usuario.id);

                        return (
                            <div
                                key={usuario.id}
                                onClick={() => onSelectUser(usuario)}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all cursor-pointer ${modalGestionUsuario.usuario?.id === usuario.id
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                    : esAgente
                                        ? 'bg-indigo-900/30 border-indigo-600/50 text-indigo-200 hover:bg-indigo-900/50'
                                        : 'bg-gray-700/30 border-gray-600/50 text-gray-200 hover:bg-gray-700/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="text-2xl">{esAgente ? '🏢' : '👤'}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold">{usuario.username}</p>
                                        <p className={`text-xs ${modalGestionUsuario.usuario?.id === usuario.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {esAgente ? 'Agente' : 'Jugador'} • ID: {usuario.id}
                                        </p>
                                    </div>

                                    {/* Indicadores de recursos - ocultos si está bloqueado */}
                                    {!usuario.is_blocked && (
                                        <div className="flex items-center gap-2">
                                            {/* Balance - Solo para Jugadores */}
                                            {!esAgente && (
                                                <div className="flex items-center gap-1 bg-green-900/30 border border-green-600/40 rounded-lg px-2 py-1">
                                                    <span className="text-xs text-green-400">💰</span>
                                                    <span className="text-xs font-semibold text-green-300">
                                                        ${Math.floor(usuario.balance || 0).toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Cartones Bronce */}
                                            {((usuario.cards_bronce || 0) > 0 || (usuario.gift_bronce || 0) > 0) && (
                                                <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-600/40 rounded-lg px-2 py-1">
                                                    <div className="w-2 h-2 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                                                    <span className="text-xs font-semibold text-orange-300">
                                                        {(currentUser.role === 'superadmin' || currentUser.username?.toLowerCase() === 'andy') && Number(usuario.gift_bronce || 0) > 0
                                                            ? `${Number(usuario.cards_bronce || 0)}+${Number(usuario.gift_bronce)}🎁`
                                                            : (Number(usuario.cards_bronce || 0) + Number(usuario.gift_bronce || 0)).toLocaleString('es-CO')
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {/* Cartones Plata */}
                                            {((usuario.cards_plata || 0) > 0 || (usuario.gift_plata || 0) > 0) && (
                                                <div className="flex items-center gap-1 bg-gray-700/30 border border-gray-500/40 rounded-lg px-2 py-1">
                                                    <div className="w-2 h-2 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                                                    <span className="text-xs font-semibold text-gray-300">
                                                        {(currentUser.role === 'superadmin' || currentUser.username?.toLowerCase() === 'andy') && Number(usuario.gift_plata || 0) > 0
                                                            ? `${Number(usuario.cards_plata || 0)}+${Number(usuario.gift_plata)}🎁`
                                                            : (Number(usuario.cards_plata || 0) + Number(usuario.gift_plata || 0)).toLocaleString('es-CO')
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {/* Cartones Oro */}
                                            {((usuario.cards_oro || 0) > 0 || (usuario.gift_oro || 0) > 0) && (
                                                <div className="flex items-center gap-1 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-2 py-1">
                                                    <div className="w-2 h-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                                                    <span className="text-xs font-semibold text-yellow-300">
                                                        {(currentUser.role === 'superadmin' || currentUser.username?.toLowerCase() === 'andy') && Number(usuario.gift_oro || 0) > 0
                                                            ? `${Number(usuario.cards_oro || 0)}+${Number(usuario.gift_oro)}🎁`
                                                            : (Number(usuario.cards_oro || 0) + Number(usuario.gift_oro || 0)).toLocaleString('es-CO')
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Iconos de acción */}
                                    <div className="flex items-center gap-1.5 ml-3">
                                        {/* Badge BLOQUEADO - solo visible si el usuario está bloqueado */}
                                        {usuario.is_blocked && (
                                            <div className="flex items-center gap-1 bg-red-900/50 border border-red-500/50 rounded-lg px-3 py-1 mr-2">
                                                <span className="text-red-400 text-xs font-bold">🔒 BLOQUEADO</span>
                                            </div>
                                        )}

                                        {/* Botones de acción - ocultos si el usuario está bloqueado */}
                                        {!usuario.is_blocked && (
                                            <>
                                                {/* Ver información */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectUser(usuario);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 flex items-center justify-center transition-all hover:scale-110"
                                                    title="Ver información"
                                                >
                                                    <span className="text-cyan-400 text-sm">ℹ️</span>
                                                </button>

                                                {/* Cambiar Contraseña */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenPasswordModal(usuario);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 flex items-center justify-center transition-all hover:scale-110"
                                                    title="Cambiar contraseña"
                                                >
                                                    <span className="text-yellow-400 text-sm">🔑</span>
                                                </button>

                                                {/* Modificar */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenEditModal(usuario);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 flex items-center justify-center transition-all hover:scale-110"
                                                    title="Modificar usuario"
                                                >
                                                    <span className="text-blue-400 text-sm">✏️</span>
                                                </button>

                                                {/* Ocultar */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // TODO: Implementar ocultar usuario
                                                        console.log('Ocultar usuario:', usuario.username);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 flex items-center justify-center transition-all hover:scale-110"
                                                    title="Ocultar usuario"
                                                >
                                                    <span className="text-purple-400 text-sm">👁️</span>
                                                </button>
                                            </>
                                        )}

                                        {/* Botón de Bloquear/Desbloquear - siempre visible */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (usuario.is_blocked) {
                                                    onOpenUnblockModal(usuario);
                                                } else {
                                                    onOpenBlockModal(usuario);
                                                }
                                            }}
                                            className={`w-8 h-8 rounded-lg ${usuario.is_blocked
                                                ? 'bg-red-600/40 hover:bg-red-600/60 border-red-500/50'
                                                : 'bg-red-600/20 hover:bg-red-600/40 border-red-500/30'
                                                } border flex items-center justify-center transition-all hover:scale-110`}
                                            title={usuario.is_blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                                        >
                                            <span className="text-red-400 text-sm">{usuario.is_blocked ? '🔒' : '🔓'}</span>
                                        </button>
                                    </div>

                                    {/* Marca de sub-agentes */}
                                    {tieneSubAgentesFlag && (
                                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold ml-2">
                                            SUB-AGENTE
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <p>
                            {busquedaUsuario
                                ? `No se encontraron usuarios con "${busquedaUsuario}"`
                                : agenteSeleccionado
                                    ? `${agenteSeleccionado.username} no tiene usuarios en su red`
                                    : 'Selecciona un agente del árbol para ver sus usuarios'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserListView;


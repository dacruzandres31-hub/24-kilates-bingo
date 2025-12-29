import React from 'react';

const UserTreeView = ({
    arbolJerarquico,
    agenteSeleccionado,
    nodosExpandidos,
    currentUser,
    onToggleNodo,
    onSelectAgente,
    onOpenCreateModal,
    tieneHijos,
    tieneSubAgentes
}) => {

    const renderArbolReferidos = (nodo, nivel = 0) => {
        const marginLeft = nivel * 24;
        const esSeleccionado = agenteSeleccionado?.id === nodo.id;
        const tieneHijosFlag = tieneHijos(nodo.id);
        const tieneSubAgentesFlag = tieneSubAgentes(nodo.id);
        const estaExpandido = nodosExpandidos.has(nodo.id);

        // Iconos según rol
        const iconoRole = {
            'superadmin': '👑',
            'admin': '🛡️',
            'agente': '🏢',
            'jugador': '👤'
        }[nodo.role] || '👤';

        return (
            <div key={nodo.id}>
                <div
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${esSeleccionado
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'hover:bg-gray-700/50 text-gray-200'
                        }`}
                    style={{ marginLeft: `${marginLeft}px` }}
                >
                    {/* Indicador de expansión */}
                    {tieneHijosFlag ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleNodo(nodo.id);
                            }}
                            className="w-4 h-4 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
                        >
                            <span className="text-xs">{estaExpandido ? '▼' : '▶'}</span>
                        </button>
                    ) : (
                        <div className="w-4 h-4 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                        </div>
                    )}

                    {/* Contenido del nodo */}
                    <div
                        className="flex items-center gap-2 flex-1 text-sm"
                        onClick={() => onSelectAgente(nodo)}
                    >
                        {/* Icono según rol */}
                        <span className="text-lg">{iconoRole}</span>

                        {/* Nombre */}
                        <span className="font-medium flex-1">{nodo.username}</span>

                        {/* Punto amarillo si tiene sub-agentes */}
                        {tieneSubAgentesFlag && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg"></div>
                        )}
                    </div>
                </div>

                {/* Renderizar todos los hijos si está expandido */}
                {tieneHijosFlag && estaExpandido && nodo.children && (
                    nodo.children
                        .sort((a, b) => {
                            // Primero ordenar por rol: agentes primero, luego jugadores
                            const roleOrder = { 'agente': 0, 'jugador': 1 };
                            const roleA = roleOrder[a.role] ?? 2;
                            const roleB = roleOrder[b.role] ?? 2;

                            if (roleA !== roleB) {
                                return roleA - roleB;
                            }

                            // Dentro del mismo rol, ordenar alfabéticamente por username
                            return a.username.localeCompare(b.username);
                        })
                        .map(child => renderArbolReferidos(child, nivel + 1))
                )}
            </div>
        );
    };

    return (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {arbolJerarquico.length > 0 ? (
                arbolJerarquico.map(nodo => renderArbolReferidos(nodo))
            ) : (
                <p className="text-gray-400 text-center py-8">
                    No hay agentes en la red
                </p>
            )}
        </div>
    );
};

export default UserTreeView;

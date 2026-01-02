import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import VIPBadge from './VIPBadge';

export default function GlobalTicker() {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);

  // Mapeo de tipos a emojis
  const typeIcons = {
    level_up: '🏆',
    big_win: '💰',
    agent_rank: '🔥',
    welcome: '👋',
    achievement: '🏅',
    linea: '🎯',
    custom: '✨'
  };

  // Mapeo de colores por tipo
  const typeColors = {
    level_up: 'from-amber-500 to-amber-600',
    big_win: 'from-green-500 to-green-600',
    agent_rank: 'from-red-500 to-red-600',
    welcome: 'from-blue-500 to-blue-600',
    achievement: 'from-purple-500 to-purple-600',
    linea: 'from-yellow-500 to-yellow-600',
    custom: 'from-pink-500 to-pink-600'
  };

  // Escuchar eventos globales de Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleGlobalMessage = (announcement) => {
      // Agregar nuevo mensaje
      const newMessage = {
        id: announcement.id || Date.now(),
        text: announcement.text,
        type: announcement.type || 'custom',
        icon: announcement.icon || typeIcons[announcement.type] || '✨',
        username: announcement.username,
        tier: announcement.tier, // Nuevo
        priority: announcement.priority || 'normal',
        timestamp: Date.now()
      };

      setMessages((prev) => [newMessage, ...prev].slice(0, 50)); // Mantener máximo 50 mensajes

      // Auto-limpiar después de 60 segundos
      const timer = setTimeout(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
      }, 60000);

      return () => clearTimeout(timer);
    };

    socket.on('global_ticker_message', handleGlobalMessage);

    return () => {
      socket.off('global_ticker_message', handleGlobalMessage);
    };
  }, [socket]);

  // Filtrar mensajes para mostrar (últimos 5)
  useEffect(() => {
    setDisplayMessages(messages.slice(0, 5));
  }, [messages]);

  // No mostrar si no hay mensajes
  if (displayMessages.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/80 to-slate-900/80 backdrop-blur-sm border-b border-slate-700">
      <div className="overflow-hidden py-2">
        {/* Marquee Container */}
        <div className="relative flex items-center h-10">
          {/* Animación marquee */}
          <style jsx>{`
            @keyframes marquee {
              0% {
                transform: translateX(100%);
              }
              100% {
                transform: translateX(-100%);
              }
            }
            .ticker-message {
              animation: marquee 15s linear infinite;
              white-space: nowrap;
            }
            .ticker-message:hover {
              animation-play-state: paused;
            }
          `}</style>

          <div className="flex gap-8 px-4">
            {displayMessages.map((msg, idx) => (
              <div
                key={msg.id}
                className="ticker-message flex items-center gap-2 flex-shrink-0"
                style={{
                  animationDelay: `${idx * 3}s`
                }}
              >
                {/* Icono */}
                <span className="text-xl">{msg.icon}</span>

                {/* Texto del mensaje */}
                <span className="text-sm font-semibold text-white truncate flex items-center gap-1">
                  {msg.text}
                  {msg.tier && <VIPBadge tier={msg.tier} size="small" />}
                </span>

                {/* Separador */}
                {idx < displayMessages.length - 1 && (
                  <span className="text-slate-600 ml-2">•</span>
                )}
              </div>
            ))}

            {/* Duplicar mensajes para efecto infinito */}
            {displayMessages.length > 0 && (
              <div className="flex gap-8">
                {displayMessages.map((msg, idx) => (
                  <div
                    key={`duplicate-${msg.id}`}
                    className="ticker-message flex items-center gap-2 flex-shrink-0"
                    style={{
                      animationDelay: `${displayMessages.length * 3 + idx * 3}s`
                    }}
                  >
                    <span className="text-xl">{msg.icon}</span>
                    <span className="text-sm font-semibold text-white truncate flex items-center gap-1">
                      {msg.text}
                      {msg.tier && <VIPBadge tier={msg.tier} size="small" />}
                    </span>
                    {idx < displayMessages.length - 1 && (
                      <span className="text-slate-600 ml-2">•</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Indicador de mensajes en cola */}
        {messages.length > 5 && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              +{messages.length - 5}
            </div>
          </div>
        )}
      </div>

      {/* Barra de progreso visual */}
      <div className="h-0.5 bg-gradient-to-r from-amber-500 via-green-500 to-blue-500 opacity-60" />
    </div>
  );
}

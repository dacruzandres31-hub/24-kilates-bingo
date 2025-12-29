import { useEffect, useState } from 'react';
import socketHelper from '../helpers/socketHelper';

/**
 * useSocket - Hook para conexión Socket.IO usando Helper Singleton
 * 
 * Features:
 * - Usa socketHelper para mantener una única conexión global
 * - Actualiza estado local de conexión
 * - No desconecta al desmontar (persistencia)
 */

export function useSocket() {
  const [socket, setSocket] = useState(socketHelper.getSocket());
  const [connected, setConnected] = useState(socketHelper.getSocket()?.connected || false);

  useEffect(() => {
    const token = localStorage.getItem('playerToken') || localStorage.getItem('token');

    // Iniciar/Obtener conexión global
    const socketInstance = socketHelper.connect(token);
    setSocket(socketInstance);
    setConnected(socketInstance.connected);

    // Handlers locales para actualizar estado del hook
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    return () => {
      // SOLO remover listeners locales, NO desconectar el socket global
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, []);

  return socket;
}

export function useSocketEvent(socket, eventName, handler) {
  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
}

export default useSocket;

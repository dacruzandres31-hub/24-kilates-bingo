import { useEffect, useState } from 'react';
import socketHelper from '../helpers/socketHelper';

/**
 * useSocket - Hook para conexión Socket.IO usando Helper Singleton
 * 
 * Features:
 * - Usa socketHelper para mantener una única conexión global
 * - Actualiza estado local de conexión
 * - No desconecta al desmontar (persistencia)
 * - v2.0: Expone estado de conexión detallado
 */

export function useSocket() {
  const [socket, setSocket] = useState(socketHelper.getSocket());
  const [connected, setConnected] = useState(socketHelper.getSocket()?.connected || false);
  const [connectionState, setConnectionState] = useState(socketHelper.getConnectionState());

  useEffect(() => {
    const token = localStorage.getItem('playerToken') || localStorage.getItem('token');

    // Iniciar/Obtener conexión global
    const socketInstance = socketHelper.connect(token);
    setSocket(socketInstance);
    setConnected(socketInstance.connected);
    setConnectionState(socketHelper.getConnectionState());

    // Handlers locales para actualizar estado del hook
    const onConnect = () => {
      setConnected(true);
      setConnectionState('connected');
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionState('disconnected');
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    // Suscribirse a cambios de estado de conexión
    const unsubscribeReconnect = socketHelper.onReconnect(() => {
      setConnectionState(socketHelper.getConnectionState());
    });

    return () => {
      // SOLO remover listeners locales, NO desconectar el socket global
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      unsubscribeReconnect();
    };
  }, []);

  return socket;
}

/**
 * useSocketConnection - Hook para obtener estado detallado de conexión
 * Útil para mostrar indicadores visuales de conectividad
 */
export function useSocketConnection() {
  const [connected, setConnected] = useState(socketHelper.getSocket()?.connected || false);
  const [connectionState, setConnectionState] = useState(socketHelper.getConnectionState());

  useEffect(() => {
    const socket = socketHelper.getSocket();
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      setConnectionState('connected');
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionState('disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const unsubscribe = socketHelper.onReconnect(() => {
      setConnected(socketHelper.getSocket()?.connected || false);
      setConnectionState(socketHelper.getConnectionState());
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubscribe();
    };
  }, []);

  return { connected, connectionState };
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

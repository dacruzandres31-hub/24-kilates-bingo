import { useEffect, useState } from 'react';
import io from 'socket.io-client';

/**
 * useSocket - Hook para conexión Socket.IO
 * 
 * Features:
 * - Conexión automática al servidor
 * - Auto-join a room personal (user_${userId})
 * - Reconexión automática
 * - Cleanup al desmontar
 */

let socketInstance = null;

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Si ya existe instancia, reutilizarla
    if (socketInstance && socketInstance.connected) {
      setSocket(socketInstance);
      setConnected(true);
      return;
    }

    // Crear nueva conexión
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('playerToken') || localStorage.getItem('token');

    const newSocket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Eventos de conexión
    newSocket.on('connect', () => {
      console.log('[Socket] ✅ Conectado:', newSocket.id);
      setConnected(true);

      // Join a room personal del usuario
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId || payload.id;
          
          if (userId) {
            newSocket.emit('join_personal_room', { userId });
            console.log(`[Socket] 📍 Joined personal room: user_${userId}`);
          }
        } catch (error) {
          console.error('[Socket] Error parsing token:', error);
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Desconectado:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Error de conexión:', error.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] 🔄 Reconectado después de ${attemptNumber} intentos`);
      setConnected(true);
    });

    socketInstance = newSocket;
    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket && newSocket.connected) {
        console.log('[Socket] 👋 Desconectando...');
        newSocket.disconnect();
      }
      socketInstance = null;
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

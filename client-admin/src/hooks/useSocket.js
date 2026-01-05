import { useEffect, useState } from 'react';
import io from 'socket.io-client';

/**
 * useSocket - Hook para conexión Socket.IO en Admin Panel
 * 
 * Features:
 * - Conexión automática al servidor
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
        const serverUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';
        const token = localStorage.getItem('adminToken');

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
            console.log('[Admin Socket] ✅ Conectado:', newSocket.id);
            setConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[Admin Socket] ❌ Desconectado:', reason);
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Admin Socket] Error de conexión:', error.message);
            setConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log(`[Admin Socket] 🔄 Reconectado después de ${attemptNumber} intentos`);
            setConnected(true);
        });

        socketInstance = newSocket;
        setSocket(newSocket);

        // Cleanup
        return () => {
            if (newSocket && newSocket.connected) {
                console.log('[Admin Socket] 👋 Desconectando...');
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

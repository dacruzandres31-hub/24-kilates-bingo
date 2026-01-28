import io from 'socket.io-client';

/**
 * SocketHelper - Singleton para gestionar la conexión Socket.IO de manera centralizada.
 * Evita múltiples conexiones y mantiene el estado global.
 */

class SocketHelper {
    constructor() {
        this.socket = null;
        this.url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        this.isConnected = false;
        this.listeners = new Map(); // Para debugging o manejo manual si es necesario
    }

    /**
     * Inicializa la conexión.
     * Si ya existe y está conectada, retorna la instancia existente.
     * @param {string} token - JWT Token para autenticación
     */
    connect(token) {
        if (this.socket && this.socket.connected) {
            console.log('[SocketHelper] ♻️ Reutilizando conexión existente');
            this.resubscribeToPersonalRoom(token);
            return this.socket;
        }

        if (this.socket) {
            this.socket.close();
        }

        console.log('[SocketHelper] 🔌 Iniciando nueva conexión...');

        this.socket = io(this.url, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        this._setupDefaultListeners(token);

        return this.socket;
    }

    _setupDefaultListeners(token) {
        this.socket.on('connect', () => {
            console.log(`[SocketHelper] ✅ Conectado: ${this.socket.id}`);
            this.isConnected = true;
            this.resubscribeToPersonalRoom(token);
        });

        this.socket.on('disconnect', (reason) => {
            console.warn(`[SocketHelper] ❌ Desconectado: ${reason}`);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (err) => {
            console.error(`[SocketHelper] ⚠️ Error de conexión: ${err.message}`);
            this.isConnected = false;
        });
    }

    resubscribeToPersonalRoom(token) {
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.id;
            if (userId && this.socket) {
                this.socket.emit('join_personal_room', { userId });
                console.log(`[SocketHelper] 👤 Unido a sala personal: user_${userId}`);
            }
        } catch (e) {
            console.error('[SocketHelper] Error parseando token para room:', e);
        }
    }

    /**
     * Desconecta el socket manualmente (ej: Log out)
     */
    disconnect() {
        if (this.socket) {
            console.log('[SocketHelper] 👋 Desconectando manualmente...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /**
     * Suscribirse a un evento
     */
    on(event, callback) {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    /**
     * Desuscribirse de un evento
     */
    off(event, callback) {
        if (!this.socket) return;
        this.socket.off(event, callback);
    }

    /**
     * Emitir evento
     */
    emit(event, data) {
        if (!this.socket) {
            console.warn('[SocketHelper] Intentando emitir sin conexión');
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Obtener instancia cruda
     */
    getSocket() {
        return this.socket;
    }
}

const socketHelper = new SocketHelper();
export default socketHelper;

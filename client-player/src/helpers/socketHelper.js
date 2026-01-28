import io from 'socket.io-client';

/**
 * SocketHelper - Singleton para gestionar la conexión Socket.IO de manera centralizada.
 * Evita múltiples conexiones y mantiene el estado global.
 * 
 * v2.0 - Heartbeat & Auto-Recovery:
 * - Heartbeat cada 30s para detectar conexiones zombie
 * - Auto-refresh de estado al reconectarse
 * - Callbacks para notificar reconexiones a los hooks
 */

// Detectar URL del servidor automáticamente
const getServerUrl = () => {
    // Si hay variable de entorno definida, usarla
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL;
    if (envUrl && envUrl.length > 0) {
        return envUrl.replace('/api', '');
    }
    
    // En producción (HTTPS), usar el mismo origen
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        return window.location.origin;
    }
    
    // Fallback para desarrollo local
    return 'http://localhost:3001';
};

class SocketHelper {
    constructor() {
        this.socket = null;
        // Socket.IO debe conectarse a la raíz, no a /api
        this.url = getServerUrl();
        console.log('[SocketHelper] URL configurada:', this.url);
        this.isConnected = false;
        this.listeners = new Map(); // Para debugging o manejo manual si es necesario
        
        // Heartbeat & Recovery
        this.heartbeatInterval = null;
        this.lastPongTime = Date.now();
        this.reconnectCallbacks = new Set(); // Callbacks a ejecutar al reconectar
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, zombie
        this.missedHeartbeats = 0;
        this.MAX_MISSED_HEARTBEATS = 2; // Después de 2 heartbeats sin respuesta = zombie
        this.HEARTBEAT_INTERVAL = 30000; // 30 segundos
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
            this.stopHeartbeat();
            this.socket.close();
        }

        console.log('[SocketHelper] 🔌 Iniciando nueva conexión...');
        this.connectionState = 'connecting';

        this.socket = io(this.url, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity, // Intentar siempre reconectar
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            pingTimeout: 30000,
            pingInterval: 25000
        });

        this._setupDefaultListeners(token);
        this.startHeartbeat();

        return this.socket;
    }

    _setupDefaultListeners(token) {
        this.socket.on('connect', () => {
            console.log(`[SocketHelper] ✅ Conectado: ${this.socket.id}`);
            this.isConnected = true;
            this.connectionState = 'connected';
            this.missedHeartbeats = 0;
            this.lastPongTime = Date.now();
            this.resubscribeToPersonalRoom(token);
            
            // Notificar a todos los callbacks registrados que hubo reconexión
            this._notifyReconnect();
        });

        this.socket.on('disconnect', (reason) => {
            console.warn(`[SocketHelper] ❌ Desconectado: ${reason}`);
            this.isConnected = false;
            this.connectionState = 'disconnected';
            
            // Si fue desconexión del servidor, intentar reconectar inmediatamente
            if (reason === 'io server disconnect') {
                console.log('[SocketHelper] 🔄 Reconectando por desconexión del servidor...');
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (err) => {
            console.error(`[SocketHelper] ⚠️ Error de conexión: ${err.message}`);
            this.isConnected = false;
            this.connectionState = 'disconnected';
        });

        // Respuesta al heartbeat
        this.socket.on('pong_heartbeat', () => {
            this.lastPongTime = Date.now();
            this.missedHeartbeats = 0;
            if (this.connectionState === 'zombie') {
                console.log('[SocketHelper] 💚 Conexión restaurada desde estado zombie');
                this.connectionState = 'connected';
            }
        });

        // Evento de reconexión de Socket.IO
        this.socket.io.on('reconnect', (attempt) => {
            console.log(`[SocketHelper] 🔄 Reconectado después de ${attempt} intentos`);
            this._notifyReconnect();
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
            this.stopHeartbeat();
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.connectionState = 'disconnected';
            this.reconnectCallbacks.clear();
        }
    }

    /**
     * Inicia el heartbeat para detectar conexiones zombie
     */
    startHeartbeat() {
        this.stopHeartbeat(); // Limpiar anterior si existe
        
        this.heartbeatInterval = setInterval(() => {
            if (!this.socket || !this.socket.connected) {
                return;
            }

            // Enviar ping
            this.socket.emit('ping_heartbeat', { timestamp: Date.now() });

            // Verificar si recibimos respuesta del último ping
            const timeSinceLastPong = Date.now() - this.lastPongTime;
            
            if (timeSinceLastPong > this.HEARTBEAT_INTERVAL * 1.5) {
                this.missedHeartbeats++;
                console.warn(`[SocketHelper] 💛 Heartbeat sin respuesta (${this.missedHeartbeats}/${this.MAX_MISSED_HEARTBEATS})`);
                
                if (this.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
                    console.error('[SocketHelper] 💀 Conexión zombie detectada - forzando reconexión');
                    this.connectionState = 'zombie';
                    this.forceReconnect();
                }
            }
        }, this.HEARTBEAT_INTERVAL);

        console.log('[SocketHelper] 💓 Heartbeat iniciado');
    }

    /**
     * Detiene el heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Fuerza una reconexión completa
     */
    forceReconnect() {
        if (!this.socket) return;
        
        console.log('[SocketHelper] 🔄 Forzando reconexión...');
        this.missedHeartbeats = 0;
        
        // Desconectar y reconectar
        this.socket.disconnect();
        setTimeout(() => {
            if (this.socket) {
                this.socket.connect();
            }
        }, 500);
    }

    /**
     * Registrar callback para cuando haya reconexión
     * Útil para que los hooks refresquen sus datos
     */
    onReconnect(callback) {
        this.reconnectCallbacks.add(callback);
        return () => this.reconnectCallbacks.delete(callback);
    }

    /**
     * Notificar a todos los callbacks de reconexión
     */
    _notifyReconnect() {
        console.log(`[SocketHelper] 📢 Notificando reconexión a ${this.reconnectCallbacks.size} listeners`);
        this.reconnectCallbacks.forEach(callback => {
            try {
                callback();
            } catch (err) {
                console.error('[SocketHelper] Error en callback de reconexión:', err);
            }
        });
    }

    /**
     * Obtener estado de conexión
     */
    getConnectionState() {
        return this.connectionState;
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

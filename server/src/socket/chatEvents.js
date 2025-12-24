const gamificationEngine = require('../services/gamification_engine');
const db = require('../db');

module.exports = (io, socket) => {
    // Unirse a una sala de chat
    socket.on('join_chat_room', (roomName) => {
        socket.join(`chat_${roomName}`);
        // console.log(`[Chat] Usuario ${socket.id} se unió a chat_${roomName}`);
    });

    // Salir de una sala
    socket.on('leave_chat_room', (roomName) => {
        socket.leave(`chat_${roomName}`);
    });

    // Enviar mensaje
    socket.on('send_chat_message', async (data) => {
        try {
            // data: { room, message, userId }
            const { room, message, userId } = data;

            if (!message || message.trim().length === 0) return;

            // Obtener datos ricos del usuario (Nivel, Título, Logros)
            const playerProgress = await gamificationEngine.getPlayerProgress(userId);
            const [userRows] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);

            if (userRows.length === 0) return;

            const username = userRows[0].username;

            // Calcular Level Title (Ej: "Novato", "Veterano")
            let title = "Jugador";
            if (playerProgress.level >= 50) title = "Leyenda";
            else if (playerProgress.level >= 20) title = "Maestro";
            else if (playerProgress.level >= 10) title = "Experto";
            else if (playerProgress.level >= 5) title = "Veterano";
            else title = "Novato";

            // Formato del mensaje enriquecido
            const enrichedMessage = {
                id: Date.now(),
                userId,
                username,
                text: message,
                level: playerProgress.level,
                levelTitle: title, // Para el "Badge"
                timestamp: new Date().toISOString()
            };

            // Emitir a la sala específica
            io.to(`chat_${room}`).emit('chat_message_received', enrichedMessage);

            // console.log(`[Chat] Mensaje en ${room}: ${username} says "${message}"`);

        } catch (error) {
            console.error('❌ [Chat] Error enviando mensaje:', error);
        }
    });
};

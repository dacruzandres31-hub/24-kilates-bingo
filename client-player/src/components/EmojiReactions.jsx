import React, { useState, useEffect } from 'react';
import '../styles/EmojiReactions.css';

/**
 * EmojiReactions - Sistema de reacciones emoji en tiempo real
 * 
 * @param {Object} socket - Socket.IO instance
 * @param {string} gameSessionId - ID de la sesión de juego
 */
export default function EmojiReactions({ socket, gameSessionId, onEmojiSent }) {
    const [reactions, setReactions] = useState([]);
    const [reactionCounts, setReactionCounts] = useState({
        '👍': 0,
        '🎉': 0,
        '😮': 0,
        '🔥': 0,
        '❤️': 0
    });

    const emojis = ['👍', '🎉', '😮', '🔥', '❤️'];

    useEffect(() => {
        if (!socket) return;

        // Escuchar reacciones de otros usuarios
        const handleEmojiReaction = (data) => {
            const { emoji, username } = data;

            // Agregar reacción flotante
            const reactionId = Date.now() + Math.random();
            setReactions(prev => [...prev, {
                id: reactionId,
                emoji,
                username,
                x: Math.random() * 80 + 10, // 10-90% del ancho
                y: Math.random() * 20 + 40  // 40-60% de la altura
            }]);

            // Actualizar contador
            setReactionCounts(prev => ({
                ...prev,
                [emoji]: (prev[emoji] || 0) + 1
            }));

            // Remover después de la animación
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reactionId));
            }, 3000);
        };

        socket.on('emoji_reaction', handleEmojiReaction);

        return () => {
            socket.off('emoji_reaction', handleEmojiReaction);
        };
    }, [socket]);

    const handleEmojiClick = (emoji) => {
        if (!socket || !gameSessionId) return;

        // Enviar reacción al servidor
        socket.emit('emoji_reaction', {
            gameSessionId,
            emoji
        });

        if (onEmojiSent) onEmojiSent();
    };

    return (
        <>
            {/* Botones de emoji */}
            <div className="emoji-buttons">
                {emojis.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="emoji-btn"
                        title={`Reaccionar con ${emoji}`}
                    >
                        <span className="emoji-icon">{emoji}</span>
                        {reactionCounts[emoji] > 0 && (
                            <span className="emoji-count">{reactionCounts[emoji]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Reacciones flotantes */}
            <div className="emoji-reactions-container">
                {reactions.map((reaction) => (
                    <div
                        key={reaction.id}
                        className="floating-emoji"
                        style={{
                            left: `${reaction.x}%`,
                            top: `${reaction.y}%`
                        }}
                    >
                        <div className="emoji-bubble">
                            <span className="emoji-large">{reaction.emoji}</span>
                            <span className="emoji-username">{reaction.username}</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

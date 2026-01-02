import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Minimize2 } from 'lucide-react';
import VIPBadge from './VIPBadge';
import '../styles/ChatWidget.css';

/**
 * ChatWidget - Chat en vivo durante partidas
 * 
 * @param {Object} socket - Socket.IO instance
 * @param {string} gameSessionId - ID de la sesión de juego
 * @param {string} username - Nombre del usuario
 */
export default function ChatWidget({ socket, gameSessionId, username, onMessageSent }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll al último mensaje
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Escuchar mensajes de chat
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (data) => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                username: data.username,
                message: data.message,
                timestamp: data.timestamp,
                tier: data.tier, // Nuevo: Incluir tier del usuario
                isOwn: data.username === username
            }]);

            // Incrementar contador si está minimizado
            if (isMinimized || !isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        };

        socket.on('chat_message', handleChatMessage);

        return () => {
            socket.off('chat_message', handleChatMessage);
        };
    }, [socket, username, isMinimized, isOpen]);

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || !socket) return;

        // Enviar mensaje al servidor
        socket.emit('chat_message', {
            gameSessionId,
            username,
            message: inputMessage.trim(),
            timestamp: new Date().toISOString()
        });

        if (onMessageSent) onMessageSent();

        setInputMessage('');
        inputRef.current?.focus();
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
            setIsMinimized(false);
        }
    };

    const handleMinimize = () => {
        setIsMinimized(!isMinimized);
        if (!isMinimized) {
            setUnreadCount(0);
        }
    };

    if (!isOpen) {
        return (
            <button
                className="chat-toggle-btn"
                onClick={handleToggle}
            >
                <MessageCircle size={24} />
                {unreadCount > 0 && (
                    <span className="chat-badge">{unreadCount}</span>
                )}
            </button>
        );
    }

    return (
        <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`}>
            <div className="chat-header">
                <div className="chat-title">
                    <MessageCircle size={18} />
                    <span>Chat en Vivo</span>
                    {unreadCount > 0 && (
                        <span className="chat-badge-header">{unreadCount}</span>
                    )}
                </div>
                <div className="chat-controls">
                    <button onClick={handleMinimize} className="chat-btn">
                        <Minimize2 size={16} />
                    </button>
                    <button onClick={handleToggle} className="chat-btn">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-empty">
                                <MessageCircle size={32} opacity={0.3} />
                                <p>No hay mensajes aún</p>
                                <p className="chat-hint">¡Sé el primero en escribir!</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`chat-message ${msg.isOwn ? 'own' : ''}`}
                                >
                                    <div className="message-header">
                                        <span className="message-username">
                                            {msg.username}
                                            {msg.tier && <VIPBadge tier={msg.tier} size="small" />}
                                        </span>
                                        <span className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString('es-AR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="message-content">{msg.message}</div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-input-form">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            maxLength={200}
                            className="chat-input"
                        />
                        <button
                            type="submit"
                            className="chat-send-btn"
                            disabled={!inputMessage.trim()}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

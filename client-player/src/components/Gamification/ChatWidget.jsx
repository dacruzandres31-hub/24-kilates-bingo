import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../../hooks/useSocket';
import { FaPaperPlane, FaCrown, FaStar, FaMedal } from 'react-icons/fa';

const ChatWidget = ({ room = 'lobby', user }) => {
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false); // Minimized by default usually, or open?

    // Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (!socket || !user) return;

        // Unirse a la sala
        socket.emit('join_chat_room', room);

        // Escuchar mensajes
        const handleMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on('chat_message_received', handleMessage);

        return () => {
            socket.emit('leave_chat_room', room);
            socket.off('chat_message_received', handleMessage);
        };
    }, [socket, room, user]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !socket) return;

        socket.emit('send_chat_message', {
            room,
            message: inputText,
            userId: user.id
        });

        setInputText('');
    };

    // Render Badges based on Level Title
    const getBadgeIcon = (title) => {
        switch (title) {
            case 'Leyenda': return <FaCrown className="text-yellow-400" />;
            case 'Maestro': return <FaStar className="text-purple-400" />;
            case 'Experto': return <FaMedal className="text-blue-400" />;
            default: return <span className="text-xs text-gray-500">♟️</span>;
        }
    };

    const getBadgeColor = (title) => {
        switch (title) {
            case 'Leyenda': return 'bg-yellow-900/50 border-yellow-500 text-yellow-200';
            case 'Maestro': return 'bg-purple-900/50 border-purple-500 text-purple-200';
            case 'Experto': return 'bg-blue-900/50 border-blue-500 text-blue-200';
            default: return 'bg-gray-800 border-gray-600 text-gray-300';
        }
    };

    return (
        <div className={`fixed bottom-0 left-4 z-50 w-80 transition-all duration-300 ${isOpen ? 'h-96' : 'h-12'}`}>
            {/* Header - Toggle */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="h-12 bg-slate-900 border-t-2 border-l-2 border-r-2 border-gold-500 rounded-t-lg flex items-center justify-between px-4 cursor-pointer hover:bg-slate-800 transition-colors shadow-[0_0_15px_rgba(255,215,0,0.3)]"
            >
                <div className="flex items-center gap-2">
                    <span className="text-gold-400">💬</span>
                    <span className="font-bold text-white">Chat de Sala</span>
                    {messages.length > 0 && !isOpen && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">New</span>
                    )}
                </div>
                <span className="text-slate-400">{isOpen ? '▼' : '▲'}</span>
            </div>

            {/* Content */}
            {isOpen && (
                <div className="h-full bg-slate-900/95 backdrop-blur-sm border-l-2 border-r-2 border-gold-500/30 flex flex-col">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {messages.length === 0 && (
                            <p className="text-center text-gray-500 text-sm mt-4">¡Saluda a la sala!</p>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col animate-fade-in">
                                <div className="flex items-center gap-2 mb-1">
                                    {/* Level Badge */}
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(msg.levelTitle)}`}>
                                        {getBadgeIcon(msg.levelTitle)}
                                        <span>{msg.levelTitle}</span>
                                        <span className="border-l border-white/20 pl-1 ml-1">{msg.level}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">{msg.username}</span>
                                </div>
                                <div className="bg-slate-800 p-2 rounded-r-lg rounded-bl-lg text-sm text-gray-200 break-words shadow-sm">
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Escribe aquí..."
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="bg-gold-600 hover:bg-gold-500 text-white p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaPaperPlane size={14} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;

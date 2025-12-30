import React, { useEffect, useState } from 'react';
import { Trophy, Star, Award, Zap, MessageSquare } from 'lucide-react';
import '../styles/AchievementNotification.css';
import soundManager from '../utils/soundManager';

const ACHIEVEMENT_ICONS = {
    'first_card': <Trophy className="text-yellow-400" />,
    'near_bingo': <Zap className="text-orange-400" />,
    'first_reaction': <Star className="text-blue-400" />,
    'first_message': <MessageSquare className="text-green-400" />,
    'first_win': <Award className="text-purple-400" />
};

/**
 * AchievementNotification - Notificación flotante de logros
 */
export default function AchievementNotification({ achievement, onClose }) {
    useEffect(() => {
        if (achievement) {
            // Reproducir sonido de logro (usando el de notificación por ahora)
            soundManager.playNotificationSound();

            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onClose]);

    if (!achievement) return null;

    return (
        <div className="achievement-notification animate-slide-in">
            <div className="achievement-icon-container">
                {ACHIEVEMENT_ICONS[achievement.id] || <Trophy />}
            </div>
            <div className="achievement-text">
                <h4 className="achievement-title">¡Logro Desbloqueado!</h4>
                <p className="achievement-name">{achievement.name}</p>
                <p className="achievement-desc">{achievement.description}</p>
            </div>
        </div>
    );
}

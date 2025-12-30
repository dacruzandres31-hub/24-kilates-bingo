import React, { useState, useEffect, useCallback } from 'react';
import AchievementNotification from './AchievementNotification';

const ACHIEVEMENTS_LIST = [
    { id: 'first_card', name: 'Aprendiz de Bingo', description: 'Has comprado tu primer cartón.', condition: 'cards_length_1' },
    { id: 'near_bingo', name: '¡Tan Cerca!', description: 'Un cartón se quedó a solo 1 número del Bingo.', condition: 'near_miss' },
    { id: 'first_reaction', name: 'Socializador', description: 'Has usado una reacción emoji por primera vez.', condition: 'emoji_sent' },
    { id: 'first_message', name: 'Conversador', description: 'Has enviado tu primer mensaje en el chat.', condition: 'chat_sent' },
    { id: 'first_win', name: 'Primer Triunfo', description: '¡Has ganado tu primer premio en 24 Kilates!', condition: 'game_won' }
];

/**
 * useAchievements - Hook personalizado para gestionar logros
 */
export function useAchievements() {
    const [unlockedIds, setUnlockedIds] = useState([]);
    const [activeNotification, setActiveNotification] = useState(null);

    // Cargar logros desbloqueados desde localStorage al iniciar
    useEffect(() => {
        const saved = localStorage.getItem('unlocked_achievements');
        if (saved) {
            setUnlockedIds(JSON.parse(saved));
        }
    }, []);

    // Función para desbloquear un logro
    const unlockAchievement = useCallback((id) => {
        if (unlockedIds.includes(id)) return;

        const achievement = ACHIEVEMENTS_LIST.find(a => a.id === id);
        if (achievement) {
            const newUnlocked = [...unlockedIds, id];
            setUnlockedIds(newUnlocked);
            localStorage.setItem('unlocked_achievements', JSON.stringify(newUnlocked));
            setActiveNotification(achievement);
        }
    }, [unlockedIds]);

    return { unlockedIds, activeNotification, setActiveNotification, unlockAchievement };
}

/**
 * AchievementManager - Componente invisible que escucha eventos y desbloquea logros
 */
export default function AchievementManager({ socket, gameData }) {
    const { activeNotification, setActiveNotification, unlockAchievement } = useAchievements();

    // Escuchar eventos de juego para logros
    useEffect(() => {
        if (!socket || !gameData) return;

        // Logro: Primer cartón
        if (gameData.cards?.length > 0) {
            unlockAchievement('first_card');
        }

        // Logro: Casi Bingo (24/25 números)
        const checkNearBingo = () => {
            if (!gameData.cards) return;
            const nearBingo = gameData.cards.some(card =>
                card.markedCount === 24 || (card.gridNumbers && card.gridNumbers.flat().filter(n => n !== null).length - card.markedCount === 1)
            );
            if (nearBingo) {
                unlockAchievement('near_bingo');
            }
        };
        checkNearBingo();

        // Logro: Primer mensaje (escuchar envío propio si es posible o simplemente marcar al enviar)
        // Nota: Como este componente no sabe cuándo el usuario LOCAL envía, 
        // podríamos necesitar que los componentes hijos llamen a unlockAchievement.
        // Sin embargo, podemos escuchar eventos globales si el socket los emite.

        socket.on('winner_detected', (data) => {
            // Si el ganador soy yo (esto asume que gameData tiene el userId actual, 
            // pero AchievementManager suele estar en GameRoom donde sabemos el user)
            // Por simplicidad, desbloqueamos si ganamos algo.
            // logic handles in GameRoom
        });

        return () => {
            socket.off('winner_detected');
        };
    }, [socket, gameData, unlockAchievement]);

    return (
        <AchievementNotification
            achievement={activeNotification}
            onClose={() => setActiveNotification(null)}
        />
    );
}

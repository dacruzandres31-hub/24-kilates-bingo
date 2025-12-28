import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * useBingoTerminal - Hook para detección automática de premios y reclamo (Cantar)
 * 
 * Este hook simula el comportamiento de una "terminal" o una persona cantando el premio.
 * Monitorea los cartones del jugador y las bolas que van saliendo.
 * Cuando detecta una LÍNEA o BINGO, llama a los endpoints de reclamo.
 */
export default function useBingoTerminal(cards, ballsDrawn, sessionId, socket, roomType = 'bronze') {
    const [alreadyClaimedLine, setAlreadyClaimedLine] = useState(false);
    const [alreadyClaimedBingo, setAlreadyClaimedBingo] = useState(false);
    const [isGlobalLineWon, setIsGlobalLineWon] = useState(false);

    // Usar refs para evitar cierres de alcance (closures) obsoletos
    const cardsRef = useRef(cards);
    const ballsRef = useRef(ballsDrawn);
    const claimedLineRef = useRef(false);
    const claimedBingoRef = useRef(false);
    const globalLineWonRef = useRef(false);

    useEffect(() => { cardsRef.current = cards; }, [cards]);
    useEffect(() => { ballsRef.current = ballsDrawn; }, [ballsDrawn]);

    // Escuchar si alguien más ya ganó la línea
    useEffect(() => {
        if (!socket) return;

        const handleLineWinner = () => {
            console.log('[Terminal] 📢 Línea ganada globalmente. Dejando de verificar líneas.');
            setIsGlobalLineWon(true);
            globalLineWonRef.current = true;
        };

        const handleGameStarted = () => {
            setAlreadyClaimedLine(false);
            setAlreadyClaimedBingo(false);
            setIsGlobalLineWon(false);
            claimedLineRef.current = false;
            claimedBingoRef.current = false;
            globalLineWonRef.current = false;
        };

        socket.on('line_winner', handleLineWinner);
        socket.on('game_started', handleGameStarted);

        return () => {
            socket.off('line_winner', handleLineWinner);
            socket.off('game_started', handleGameStarted);
        };
    }, [socket]);

    // Detección automática cuando cambian las bolas
    useEffect(() => {
        if (ballsDrawn.length === 0 || !sessionId || cards.length === 0) return;

        const checkPrizes = async () => {
            const drawnNumbers = ballsRef.current.map(b => b.number);

            for (const card of cardsRef.current) {
                const grid = Array.isArray(card.numbers) ? card.numbers : null;
                if (!grid) continue;

                // 1. CHEQUEAR BINGO (Prioridad alta)
                if (!claimedBingoRef.current) {
                    const allNumbers = grid.flat().filter(n => n !== null && n !== undefined && n !== 'FREE');
                    const hasBingo = allNumbers.every(num => drawnNumbers.includes(num));

                    if (hasBingo && allNumbers.length > 0) {
                        console.log(`[Terminal] 🎊 ¡BINGO DETECTADO! Reclamando para cartón ${card.id}...`);
                        claimedBingoRef.current = true;
                        setAlreadyClaimedBingo(true);

                        try {
                            const endpoint = roomType === 'starter' ? '/api/game/end-free-game' : '/api/game/claim-bingo';
                            const payload = roomType === 'starter'
                                ? { gameSessionId: sessionId, winType: 'bingo' }
                                : { gameSessionId: sessionId, cardId: card.id };

                            await axios.post(endpoint, payload);
                        } catch (err) {
                            console.error('[Terminal] Error al reclamar BINGO:', err);
                            // Si falló (ej: red), permitir reintento en próxima bola
                            claimedBingoRef.current = false;
                            setAlreadyClaimedBingo(false);
                        }
                        return; // Detener chequeos en esta bola si ya cantó Bingo
                    }
                }

                // 2. CHEQUEAR LÍNEA (Solo si no ha sido ganada globalmente)
                if (!claimedLineRef.current && !globalLineWonRef.current) {
                    for (let i = 0; i < grid.length; i++) {
                        const row = grid[i];
                        const rowNumbers = row.filter(n => n !== null && n !== undefined && n !== 'FREE');
                        const hasLine = rowNumbers.every(num => drawnNumbers.includes(num));

                        if (hasLine && rowNumbers.length > 0) {
                            console.log(`[Terminal] 🎯 ¡LÍNEA DETECTADA! Reclamando para cartón ${card.id}, fila ${i + 1}...`);
                            claimedLineRef.current = true;
                            setAlreadyClaimedLine(true);

                            try {
                                const endpoint = roomType === 'starter' ? '/api/game/end-free-game' : '/api/game/claim-line';
                                const payload = roomType === 'starter'
                                    ? { gameSessionId: sessionId, winType: 'linea' }
                                    : { gameSessionId: sessionId, cardId: card.id };

                                await axios.post(endpoint, payload);
                            } catch (err) {
                                console.error('[Terminal] Error al reclamar LÍNEA:', err);
                                claimedLineRef.current = false;
                                setAlreadyClaimedLine(false);
                            }
                            break; // Ya encontró una línea en este cartón
                        }
                    }
                }
            }
        };

        checkPrizes();
    }, [ballsDrawn, sessionId]);

    return {
        alreadyClaimedLine,
        alreadyClaimedBingo,
        isGlobalLineWon
    };
}

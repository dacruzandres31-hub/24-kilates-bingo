import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children, initialState }) => {
    const [drawnNumbers, setDrawnNumbers] = useState(new Set());
    const [lastDrawnNumber, setLastDrawnNumber] = useState(null);
    const [pot, setPot] = useState(initialState.initialPot);
    const [gameStatus, setGameStatus] = useState('LOADING'); // LOADING, READY, ACTIVE, PAUSED, FINISHED

    const generateAllNumbers = useCallback(() => {
        return Array.from({ length: initialState.totalNumbers }, (_, i) => i + 1);
    }, [initialState.totalNumbers]);

    const [availableNumbers, setAvailableNumbers] = useState(generateAllNumbers());

    const resetGame = useCallback(() => {
        setDrawnNumbers(new Set());
        setLastDrawnNumber(null);
        setAvailableNumbers(generateAllNumbers());
        setPot(initialState.initialPot);
        setGameStatus('READY');
    }, [generateAllNumbers, initialState.initialPot]);

    useEffect(() => {
        resetGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const drawNumber = useCallback(() => {
        if (availableNumbers.length === 0) {
            setGameStatus('FINISHED');
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const number = availableNumbers[randomIndex];

        setAvailableNumbers(prev => prev.filter(n => n !== number));
        setDrawnNumbers(prev => new Set(prev).add(number));
        setLastDrawnNumber(number);

    }, [availableNumbers]);

    useEffect(() => {
        let gameLoop;
        if (gameStatus === 'ACTIVE') {
            gameLoop = setInterval(drawNumber, initialState.drawInterval);
        }
        return () => clearInterval(gameLoop);
    }, [gameStatus, drawNumber, initialState.drawInterval]);

    // Mock pot increase
    useEffect(() => {
        const potInterval = setInterval(() => {
            setPot(p => ({
                ...p,
                bingo: p.bingo + 13,
                line: p.line + 3,
            }));
        }, 1000);
        return () => clearInterval(potInterval);
    }, []);


    const value = {
        drawnNumbers,
        lastDrawnNumber,
        pot,
        gameStatus,
        setGameStatus,
        resetGame,
        roomName: initialState.roomName,
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

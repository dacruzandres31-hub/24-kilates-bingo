import React, { useState, useEffect } from 'react';
import '../styles/GoldRoom.css';
import { GameProvider, useGame } from '../hooks/useGame';

// --- Componentes Hijos ---

const AnimatedNumber = ({ number }) => {
  const [displayNumber, setDisplayNumber] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = number;
    if (start === end) return;

    const duration = 1000;
    const incrementTime = (duration / end) / 2;
    
    const timer = setInterval(() => {
      start += 1;
      setDisplayNumber(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [number]);

  return <span className="pot-amount-value">{displayNumber.toLocaleString('es-AR')}</span>;
};


const PotDisplay = ({ amount, title, icon }) => (
  <div className="pot-display">
    <div className="pot-header">
      {icon}
      <span className="pot-title">{title}</span>
    </div>
    <div className="pot-amount">
      $ <AnimatedNumber number={amount} />
    </div>
  </div>
);

const LastNumberDisplay = () => {
    const { lastDrawnNumber } = useGame();

    if (!lastDrawnNumber) {
        return (
            <div className="last-number-display-placeholder">
                <div className="spinner"></div>
                <span>ESPERANDO</span>
            </div>
        );
    }

    return (
        <div className="last-number-display">
            <div className="last-number-value" key={lastDrawnNumber}>
                {lastDrawnNumber}
            </div>
        </div>
    );
};

const NumberGrid = () => {
    const { drawnNumbers } = useGame();
    const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

    return (
        <div className="number-grid-container">
            <div className="number-grid">
                {numbers.map(num => (
                    <div key={num} className={`grid-ball ${drawnNumbers.has(num) ? 'drawn' : ''}`}>
                        {num}
                    </div>
                ))}
            </div>
        </div>
    );
};

const GameInfo = () => {
    const { drawnNumbers, gameStatus } = useGame();
    return (
        <div className="game-info">
            <div className="info-item">
                <span className="info-label">NÚMEROS SORTEADOS</span>
                <span className="info-value">{drawnNumbers.size} / 90</span>
            </div>
            <div className="info-item">
                <span className="info-label">ESTADO</span>
                <span className="info-value status">{gameStatus}</span>
            </div>
        </div>
    );
};


// --- Componente Contenedor de la Sala ---

const GoldRoomView = () => {
  const { pot } = useGame();

  return (
    <div className="gold-room-container">
      <div className="gold-room-header">
        <h1 className="room-title">SALA DE ORO</h1>
        <div className="header-pots">
            <PotDisplay amount={pot.line} title="LÍNEA" icon={<i className="fas fa-stream"></i>} />
            <PotDisplay amount={pot.bingo} title="BINGO" icon={<i className="fas fa-trophy"></i>} />
            <PotDisplay amount={pot.jackpot} title="JACKPOT" icon={<i className="fas fa-gem"></i>} />
        </div>
      </div>

      <div className="gold-room-main">
        <div className="left-panel">
            <LastNumberDisplay />
            <GameInfo />
        </div>
        <div className="right-panel">
            <NumberGrid />
        </div>
      </div>
    </div>
  );
};


// --- Componente Principal con Provider ---

export default function GoldRoom() {
    const initialGameState = {
        roomName: 'Oro',
        totalNumbers: 90,
        drawInterval: 3500,
        initialPot: {
            line: 50000,
            bingo: 250000,
            jackpot: 1000000,
        },
    };

    return (
        <GameProvider initialState={initialGameState}>
            <GoldRoomView />
        </GameProvider>
    );
}

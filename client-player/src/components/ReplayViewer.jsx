import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Rewind, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';
import BingoCard from './BingoCard';
import soundManager from '../utils/soundManager';
import '../styles/ReplayViewer.css';

/**
 * ReplayViewer - Reproductor dinámico de partidas pasadas
 * @param {Object} session - Datos de la sesión (ball_sequence, my_cards, winners)
 * @param {Function} onClose - Callback para cerrar el reproductor
 */
const ReplayViewer = ({ session, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(2000); // ms entre bolillas
    const [drawnNumbers, setDrawnNumbers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);

    const timerRef = useRef(null);
    const { ball_sequence, my_cards, room, draw_date } = session;

    // Limpiar timer al desmontar
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Control de reproducción
    useEffect(() => {
        if (isPlaying && currentIndex < ball_sequence.length - 1) {
            timerRef.current = setInterval(() => {
                advanceBall();
            }, playbackSpeed);
        } else {
            clearInterval(timerRef.current);
            if (currentIndex >= ball_sequence.length - 1) setIsPlaying(false);
        }

        return () => clearInterval(timerRef.current);
    }, [isPlaying, currentIndex, playbackSpeed]);

    const advanceBall = () => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            const ball = ball_sequence[next];
            setDrawnNumbers(current => [...current, ball]);

            // Sonido
            if (!isMuted) soundManager.playMarkSound();

            // Check for wins in replay
            checkReplayWins(next);

            return next;
        });
    };

    const checkReplayWins = (index) => {
        if (index === session.linea_ball_index) {
            if (!isMuted) soundManager.playLineSound();
        }
        if (index === session.bingo_ball_index) {
            if (!isMuted) soundManager.playBingoSound();
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    const resetReplay = () => {
        setIsPlaying(false);
        setCurrentIndex(-1);
        setDrawnNumbers([]);
    };

    const jumpTo = (index) => {
        setIsPlaying(false);
        const slice = ball_sequence.slice(0, index + 1);
        setDrawnNumbers(slice);
        setCurrentIndex(index);
    };

    return (
        <div className="replay-viewer-overlay">
            <div className="replay-viewer-container">
                {/* Header */}
                <div className="replay-header">
                    <div className="replay-title">
                        <h3>🎬 Replay: {room.toUpperCase()}</h3>
                        <span>{draw_date}</span>
                    </div>
                    <button className="btn-close" onClick={onClose}><X size={24} /></button>
                </div>

                {/* Ball Display */}
                <div className="replay-main-display">
                    <div className="current-ball-container">
                        {currentIndex >= 0 ? (
                            <div className="replay-ball active">
                                <span className="ball-number">{ball_sequence[currentIndex]}</span>
                            </div>
                        ) : (
                            <div className="replay-ball placeholder">?</div>
                        )}
                        <div className="ball-label">BOLILLA #{currentIndex + 1}</div>
                    </div>

                    <div className="recent-balls">
                        {drawnNumbers.slice(-5).reverse().map((num, i) => (
                            <div key={i} className="small-ball">{num}</div>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="replay-timeline">
                    <input
                        type="range"
                        min="-1"
                        max={ball_sequence.length - 1}
                        value={currentIndex}
                        onChange={(e) => jumpTo(parseInt(e.target.value))}
                        className="timeline-slider"
                    />
                    <div className="timeline-markers">
                        <span className="start">Inicio</span>
                        {session.linea_ball_index >= 0 && (
                            <span
                                className="marker marker-line"
                                style={{ left: `${(session.linea_ball_index / ball_sequence.length) * 100}%` }}
                                title="Línea premiada"
                            >🏁</span>
                        )}
                        {session.bingo_ball_index >= 0 && (
                            <span
                                className="marker marker-bingo"
                                style={{ left: `${(session.bingo_ball_index / ball_sequence.length) * 100}%` }}
                                title="BINGO premiado"
                            >🏆</span>
                        )}
                        <span className="end">Fin</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="replay-controls">
                    <div className="left-controls">
                        <button className="btn-control" onClick={() => setIsMuted(!isMuted)}>
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <div className="speed-selector">
                            <span className="label">Velocidad:</span>
                            <select
                                value={playbackSpeed}
                                onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                            >
                                <option value={3000}>0.5x</option>
                                <option value={1500}>1.0x</option>
                                <option value={800}>2.0x</option>
                                <option value={400}>4.0x</option>
                            </select>
                        </div>
                    </div>

                    <div className="center-controls">
                        <button className="btn-action" onClick={resetReplay} title="Reiniciar">
                            <RotateCcw size={20} />
                        </button>
                        <button className="btn-play-pause" onClick={togglePlay}>
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                        </button>
                        <button
                            className="btn-action"
                            onClick={() => isPlaying ? jumpTo(ball_sequence.length - 1) : advanceBall()}
                            title="Siguiente"
                        >
                            <FastForward size={20} />
                        </button>
                    </div>

                    <div className="right-controls">
                        <div className="counter">
                            {currentIndex + 1} / {ball_sequence.length}
                        </div>
                    </div>
                </div>

                {/* Cards Display */}
                <div className="replay-cards-section">
                    <h4>🎴 Mis Cartones</h4>
                    <div className="replay-cards-grid">
                        {my_cards.map((card) => (
                            <div key={card.id} className="replay-card-wrapper">
                                <BingoCard
                                    gridNumbers={card.card_data}
                                    cardNumber={card.serial}
                                    markedNumbers={new Set(drawnNumbers)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReplayViewer;

import React, { useEffect, useState } from 'react';
import '../styles/ConfettiEffect.css';

/**
 * ConfettiEffect - Efecto de confetti animado
 * Se dispara cuando hay un ganador de BINGO
 */
export default function ConfettiEffect({ isActive, duration = 3000, onComplete }) {
  const [confettiPieces, setConfettiPieces] = useState([]);

  useEffect(() => {
    if (!isActive) return;

    // Generar piezas de confetti
    const pieces = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9'];
    const pieceCount = 100;

    for (let i = 0; i < pieceCount; i++) {
      pieces.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? 'circle' : 'square'
      });
    }

    setConfettiPieces(pieces);

    // Limpiar después de la duración
    const timeout = setTimeout(() => {
      setConfettiPieces([]);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timeout);
  }, [isActive, duration, onComplete]);

  if (!isActive || confettiPieces.length === 0) return null;

  return (
    <div className="confetti-container">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className={`confetti-piece confetti-${piece.shape}`}
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}

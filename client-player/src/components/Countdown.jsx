import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Countdown.css';

const Countdown = ({ targetDate, isPlaying = false }) => {
  // Función memoizada para calcular tiempo restante
  const calculateTimeLeft = useCallback(() => {
    if (isPlaying) return { H: 0, M: 0, S: 0 };
    if (!targetDate) return null;
    
    const difference = +new Date(targetDate) - +new Date();
    
    if (difference > 0) {
      return {
        H: Math.floor((difference / (1000 * 60 * 60)) % 24),
        M: Math.floor((difference / 1000 / 60) % 60),
        S: Math.floor((difference / 1000) % 60),
      };
    }
    return { H: 0, M: 0, S: 0 };
  }, [targetDate, isPlaying]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

  // Recalcular inmediatamente cuando cambie targetDate o isPlaying
  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
  }, [calculateTimeLeft]);

  useEffect(() => {
    // Actualizar cada segundo
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft]);

  // Si no hay targetDate, mostrar estado de carga
  if (timeLeft === null) {
    return (
      <div className="countdown-container">
        <div className="countdown-label-text">Próximo sorteo en...</div>
        <div className="countdown-timer">
          <div className="countdown-segment full-width">
            <span className="countdown-number text-medium">Calculando...</span>
          </div>
        </div>
      </div>
    );
  }

  const hasTimeLeft = timeLeft.H > 0 || timeLeft.M > 0 || timeLeft.S > 0;

  return (
    <div className="countdown-container">
      <div className={`countdown-label-text ${!hasTimeLeft ? 'drawing' : ''}`}>
        {hasTimeLeft ? 'Próximo sorteo en...' : 'SORTEANDO'}
      </div>
      {hasTimeLeft ? (
        <div className="countdown-timer">
          <div className="countdown-segment">
            <span className="countdown-number">{String(timeLeft.H || 0).padStart(2, '0')}</span>
            <span className="countdown-label">H</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-segment">
            <span className="countdown-number">{String(timeLeft.M || 0).padStart(2, '0')}</span>
            <span className="countdown-label">M</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-segment">
            <span className="countdown-number">{String(timeLeft.S || 0).padStart(2, '0')}</span>
            <span className="countdown-label">S</span>
          </div>
        </div>
      ) : (
        <div className="countdown-timer drawing-pulse">
          <div className="countdown-segment full-width">
            <span className="countdown-number text-large">EN CURSO</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Countdown;

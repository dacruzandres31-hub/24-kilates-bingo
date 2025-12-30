import { useEffect } from 'react';
import confetti from 'canvas-confetti';

/**
 * ConfettiEffect - Explosión de confetti para celebrar victoria BINGO
 * Usa canvas-confetti para mejor rendimiento y efectos visuales
 * 
 * @param {boolean} isActive - Cuando cambia a true, dispara el confetti
 * @param {string} type - Tipo de victoria: 'bingo', 'linea', 'jackpot'
 * @param {function} onComplete - Callback cuando termina la animación
 */
export default function ConfettiEffect({ isActive, type = 'bingo', duration = 3000, onComplete }) {
  useEffect(() => {
    if (!isActive) return;

    const colors = {
      bingo: ['#FFD700', '#FFA500', '#FF6347'], // Oro, naranja, rojo
      linea: ['#C0C0C0', '#E5E4E2', '#B0C4DE'], // Plata
      jackpot: ['#FFD700', '#FF1493', '#00CED1'] // Oro, rosa, cyan
    };

    const selectedColors = colors[type] || colors.bingo;

    // Configuración de confetti
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 10000,
      colors: selectedColors
    };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    // Lanzar confetti desde múltiples puntos
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        if (onComplete) onComplete();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Desde la izquierda
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });

      // Desde la derecha
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, type, duration, onComplete]);

  return null; // Este componente no renderiza nada visible
}

/**
 * Función helper para disparar confetti manualmente
 */
export function fireConfetti(type = 'bingo') {
  const colors = {
    bingo: ['#FFD700', '#FFA500', '#FF6347'],
    linea: ['#C0C0C0', '#E5E4E2', '#B0C4DE'],
    jackpot: ['#FFD700', '#FF1493', '#00CED1']
  };

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors[type] || colors.bingo
  });
}


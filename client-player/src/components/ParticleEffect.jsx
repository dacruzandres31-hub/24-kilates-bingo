import React, { useEffect, useState } from 'react';
import '../styles/ParticleEffect.css';

/**
 * ParticleEffect - Partículas animadas para completar líneas
 * @param {string} lineType - 'horizontal', 'vertical', 'diagonal'
 * @param {boolean} isActive - Si el efecto está activo
 * @param {number} duration - Duración en ms
 */
export default function ParticleEffect({ lineType, isActive, duration = 1500, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!isActive) return;

    const particleCount = 30;
    const newParticles = [];
    
    // Colores según tipo de línea
    const colorMap = {
      horizontal: ['#4ECDC4', '#45B7D1', '#5DADE2'],
      vertical: ['#4CAF50', '#66BB6A', '#81C784'],
      diagonal: ['#FFD700', '#FFC107', '#FFB300'],
      default: ['#9B59B6', '#8E44AD', '#BA68C8']
    };
    
    const colors = colorMap[lineType] || colorMap.default;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: (360 / particleCount) * i,
        speed: 0.5 + Math.random() * 0.5,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.2
      });
    }

    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timeout);
  }, [isActive, lineType, duration, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="particle-container">
      <div className="particle-burst">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              backgroundColor: particle.color,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              '--angle': `${particle.angle}deg`,
              '--speed': particle.speed,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Componente de confeti simple
function ConfettiPiece({ delay, duration }) {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: Math.random() * 100 + '%',
        top: '-10px',
        width: '10px',
        height: '10px',
        backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32', '#FF1493'][
          Math.floor(Math.random() * 6)
        ],
        borderRadius: '50%',
        animation: `fall ${duration}s ease-in forwards`,
        animationDelay: delay + 's',
        zIndex: 9999
      }}
    />
  );
}

export default function CelebrationModal({ isOpen, achievement, onClose }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (isOpen && achievement) {
      setShowConfetti(true);

      // Generar piezas de confeti
      const pieces = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1
      }));

      setConfetti(pieces);

      // Cerrar automáticamente después de 4 segundos
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, achievement, onClose]);

  if (!isOpen || !achievement) return null;

  // Mapeo de emojis por tipo de logro
  const achievementEmojis = {
    level_up: '🏆',
    big_win: '💰',
    agent_rank: '🔥',
    achievement: '🏅',
    linea: '🎯',
    medal: '🎖️',
    custom: '⭐'
  };

  const emoji = achievementEmojis[achievement.type] || '✨';

  return createPortal(
    <>
      {/* Confeti */}
      {showConfetti && (
        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotateZ(360deg);
              opacity: 0;
            }
          }
        `}</style>
      )}

      {confetti.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          duration={piece.duration}
        />
      ))}

      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9990] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal de celebración */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9991] transition-all duration-300 ${
          showConfetti ? 'scale-100 opacity-100' : 'scale-95 opacity-75'
        }`}
      >
        <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 rounded-3xl shadow-2xl p-12 text-center max-w-md mx-auto border-4 border-yellow-200">
          {/* Emoji grande */}
          <div className="text-8xl mb-6 animate-bounce">{emoji}</div>

          {/* Título */}
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
            ¡FELICIDADES!
          </h2>

          {/* Tipo de logro */}
          <div className="text-white text-lg font-semibold mb-4 drop-shadow">
            {achievement.title || 'Logro Desbloqueado'}
          </div>

          {/* Descripción */}
          {achievement.description && (
            <p className="text-white/90 text-base mb-6 drop-shadow">
              {achievement.description}
            </p>
          )}

          {/* Detalles del logro */}
          {achievement.details && (
            <div className="bg-white/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <p className="text-white text-sm">
                <span className="font-bold">{achievement.details}</span>
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white text-amber-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
            >
              Genial
            </button>

            {achievement.shareUrl && (
              <button
                onClick={() => {
                  // Copiar al portapapeles o compartir
                  window.location.href = achievement.shareUrl;
                  onClose();
                }}
                className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-lg"
              >
                Compartir
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

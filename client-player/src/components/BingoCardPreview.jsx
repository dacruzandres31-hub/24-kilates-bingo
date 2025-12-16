import React, { useState } from 'react';
import CardDetailModal from './CardDetailModal';
import '../styles/BingoCardPreview.css';

/**
 * Componente para mostrar un cartón de bingo con el formato estándar
 * - 3 filas x 9 columnas
 * - Números en celdas claras
 * - Espacios vacíos en color de sala
 */
const BingoCardPreview = ({ card, room, selected = false, onClick, showSerial = true }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  console.log('[BingoCardPreview] Renderizando cartón:', card);
  console.log('[BingoCardPreview] card.numbers:', card.numbers);
  console.log('[BingoCardPreview] card.numbers type:', typeof card.numbers);
  console.log('[BingoCardPreview] card.numbers isArray:', Array.isArray(card.numbers));
  
  // Validar que numbers sea un array válido
  if (!card.numbers || !Array.isArray(card.numbers)) {
    console.error('[BingoCardPreview] ERROR: card.numbers no es un array válido');
    return (
      <div className="bingo-card-preview error-card">
        <p style={{ color: 'red', padding: '20px' }}>Error: Cartón sin datos válidos</p>
      </div>
    );
  }
  
  console.log('[BingoCardPreview] Primera fila:', card.numbers[0]);
  console.log('[BingoCardPreview] Primer número:', card.numbers[0]?.[0]);
  
  // Mapear nombres de sala (inglés → español para colores)
  const roomMap = {
    'bronze': 'bronce',
    'silver': 'plata', 
    'gold': 'oro',
    'starter': 'starter'
  };
  
  const mappedRoom = roomMap[room] || room;
  console.log('[BingoCardPreview] room:', room, 'mappedRoom:', mappedRoom);
  
  // Colores por sala
  const roomColors = {
    starter: {
      primary: '#00BCD4',      // Cyan
      light: '#B2EBF2',        // Cyan claro
      dark: '#00838F',         // Cyan oscuro
      border: '#00ACC1',
      text: '#004D40'
    },
    bronce: {
      primary: '#CD7F32',      // Bronce
      light: '#FFE0B2',        // Bronce claro
      dark: '#8D5524',         // Bronce oscuro
      border: '#BF6E2C',
      text: '#4E2A0F'
    },
    plata: {
      primary: '#C0C0C0',      // Plateado
      light: '#F5F5F5',        // Plata claro
      dark: '#808080',         // Plata oscuro
      border: '#A9A9A9',
      text: '#424242'
    },
    oro: {
      primary: '#FFD700',      // Dorado
      light: '#FFF9C4',        // Dorado claro
      dark: '#F57F17',         // Dorado oscuro
      border: '#FBC02D',
      text: '#795548'
    }
  };

  const colors = roomColors[mappedRoom] || roomColors.starter;

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleCardDoubleClick = (e) => {
    e.stopPropagation();
    setShowDetailModal(true);
  };

  return (
    <>
      <div 
        className={`bingo-card-preview ${selected ? 'selected' : ''}`}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        style={{
          border: `3px solid ${colors.border}`,
          boxShadow: selected ? `0 0 15px ${colors.primary}` : '0 2px 8px rgba(0,0,0,0.2)',
          cursor: onClick ? 'pointer' : 'default'
        }}
      >
        {showSerial && card.card_serial && (
          <div 
            className="card-serial-header"
            style={{ 
              background: '#6B4423',
              color: '#D4A574',
              fontSize: '0.65rem',
              opacity: '0.85'
            }}
          >
            {card.card_serial}
          </div>
        )}
      
      <div className="card-grid">
        {card.numbers.map((row, rowIdx) => (
          <div key={rowIdx} className="card-row">
            {row.map((num, colIdx) => (
              <div
                key={colIdx}
                className={`card-cell ${num === null ? 'empty' : 'filled'}`}
                style={{
                  backgroundColor: num === null ? colors.dark : colors.light,
                  color: num === null ? 'transparent' : colors.text,
                  borderColor: colors.border
                }}
              >
                {num !== null && <span className="cell-number">{num}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div 
        className="card-footer"
        style={{ 
          background: colors.primary,
          color: 'white'
        }}
      >
        BINGO 24K
      </div>
    </div>
    
    {showDetailModal && (
      <CardDetailModal
        card={card}
        room={room}
        onClose={() => setShowDetailModal(false)}
      />
    )}
    </>
  );
};

export default BingoCardPreview;

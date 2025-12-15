import React from 'react';
import '../styles/BingoCardPreview.css';

/**
 * Componente para mostrar un cartón de bingo con el formato estándar
 * - 3 filas x 9 columnas
 * - Números en celdas claras
 * - Espacios vacíos en color de sala
 */
const BingoCardPreview = ({ card, room, selected = false, onClick, showSerial = true }) => {
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

  const colors = roomColors[room] || roomColors.starter;

  return (
    <div 
      className={`bingo-card-preview ${selected ? 'selected' : ''}`}
      onClick={onClick}
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
            background: colors.primary,
            color: 'white'
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
  );
};

export default BingoCardPreview;

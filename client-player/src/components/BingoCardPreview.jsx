import React, { useState, useEffect } from 'react';
import CardDetailModal from './CardDetailModal';
import '../styles/BingoCardPreview.css';

/**
 * Componente para mostrar un cartón de bingo con el formato estándar
 * - 3 filas x 9 columnas
 * - Números en celdas claras
 * - Espacios vacíos en color de sala
 * - Marcado automático de números sorteados
 * - Resaltado de líneas ganadoras con animación intermitente
 */
const BingoCardPreview = ({ 
  card, 
  room, 
  selected = false, 
  onClick, 
  showSerial = true,
  drawnNumbers = [],  // Números ya sorteados
  winningLines = [],  // Líneas ganadoras (ej: [0, 1, 2] para filas)
  lineType = null     // Tipo de línea: 'horizontal_0', 'vertical_3', 'diagonal_main'
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [animatingNumbers, setAnimatingNumbers] = useState([]);
  
  console.log('[BingoCardPreview] Renderizando cartón:', card);
  console.log('[BingoCardPreview] drawnNumbers:', drawnNumbers);
  console.log('[BingoCardPreview] winningLines:', winningLines);
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

  // Detectar nuevos números sorteados y animarlos
  useEffect(() => {
    if (drawnNumbers.length > 0) {
      const latestNumber = drawnNumbers[drawnNumbers.length - 1];
      
      // Verificar si el número está en este cartón
      const isInCard = card.numbers.flat().includes(latestNumber);
      
      if (isInCard && !animatingNumbers.includes(latestNumber)) {
        setAnimatingNumbers(prev => [...prev, latestNumber]);
        
        // Remover de la animación después de 500ms
        setTimeout(() => {
          setAnimatingNumbers(prev => prev.filter(n => n !== latestNumber));
        }, 500);
      }
    }
  }, [drawnNumbers, card.numbers]);

  // Función para verificar si un número está marcado
  const isNumberMarked = (num) => {
    return num !== null && drawnNumbers.includes(num);
  };

  // Función para verificar si una celda es parte de una línea ganadora
  const isWinningCell = (rowIdx, colIdx) => {
    // Líneas horizontales
    if (winningLines.includes(rowIdx)) {
      return true;
    }
    
    // Líneas verticales
    if (lineType && lineType.includes('vertical')) {
      const colMatch = lineType.match(/vertical_(\d+)/);
      if (colMatch && parseInt(colMatch[1]) === colIdx) {
        return true;
      }
    }
    
    // Línea diagonal principal (top-left a bottom-right)
    if (lineType === 'diagonal_main' && rowIdx === colIdx) {
      return true;
    }
    
    // Línea diagonal secundaria (top-right a bottom-left)
    if (lineType === 'diagonal_anti' && rowIdx + colIdx === 2) {
      return true;
    }
    
    return false;
  };

  return (
    <>
      <div 
        className={`bingo-card-preview ${selected ? 'selected' : ''}`}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        style={{
          border: `3px solid ${selected ? colors.primary : colors.border}`,
          boxShadow: selected 
            ? `0 0 40px ${colors.primary}, 0 0 80px ${colors.primary}, 0 0 120px ${colors.primary}, inset 0 0 30px ${colors.primary}` 
            : '0 2px 8px rgba(0,0,0,0.2)',
          cursor: onClick ? 'pointer' : 'default',
          transform: selected ? 'scale(1.03)' : 'scale(1)',
          filter: selected ? 'brightness(1.3) saturate(1.5)' : 'none'
        }}
      >
        {showSerial && card.card_serial && (
          <div 
            className="card-serial-header"
            style={{ 
              background: colors.primary,
              color: '#ffffff',
              fontSize: '1.1rem',
              fontWeight: '700',
              opacity: '1',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {card.card_serial}
          </div>
        )}
      
      <div className="card-grid">
        {card.numbers.map((row, rowIdx) => (
          <div key={rowIdx} className="card-row">
            {row.map((num, colIdx) => {
              const marked = isNumberMarked(num);
              const winning = num !== null && isWinningCell(rowIdx, colIdx);
              
              return (
                <div
                  key={colIdx}
                  className={`card-cell ${num === null ? 'empty' : 'filled'} ${marked ? 'marked' : ''} ${winning ? 'winning-line' : ''}`}
                  style={{
                    backgroundColor: num === null ? colors.dark : colors.light,
                    color: num === null ? 'transparent' : colors.text,
                    borderColor: colors.border
                  }}
                >
                  {num !== null && <span className="cell-number">{num}</span>}
                </div>
              );
            })}
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

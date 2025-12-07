import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import '../styles/BingoCard.css';

/**
 * BingoCard - Cartón de Bingo 90 con soporte para skins cosméticos
 * Props:
 *   - gridNumbers: Array 3x9 de números (incluye nulls para espacios vacíos)
 *   - cardNumber: Número serie del cartón
 *   - isSelected: Si está seleccionado
 *   - onSelect: Callback al seleccionar
 *   - equippedSkin: Objeto con asset_url, color_hex, animation_class
 */

const BingoCard = forwardRef((props, ref) => {
  const { gridNumbers, cardNumber, isSelected, onSelect, equippedSkin } = props;
  
  const [markedNumbers, setMarkedNumbers] = useState(new Set());

  // Método público para marcar números
  useImperativeHandle(ref, () => ({
    markNumber: (number) => {
      setMarkedNumbers(prev => new Set(prev).add(number));
    },
    getMarkedNumbers: () => markedNumbers,
    gridNumbers: gridNumbers
  }));

  // Determinar si hay ganancia (línea o bingo)
  const checkWin = () => {
    if (!gridNumbers || gridNumbers.length === 0) return null;

    // Convertir a array plano para validación (solo números, no nulls)
    const allNumbers = gridNumbers.flat().filter(n => n !== null && n !== undefined);
    
    // Check BINGO: todos los 15 números marcados
    const totalMarked = Array.from(markedNumbers).filter(n => 
      allNumbers.includes(n)
    ).length;
    
    if (totalMarked === 15) {
      return 'bingo';
    }

    // Check LÍNEA horizontal: cualquiera de las 3 filas completa (5 números)
    for (let row = 0; row < 3; row++) {
      let lineMarked = 0;
      let lineTotal = 0;
      
      for (let col = 0; col < 9; col++) {
        const num = gridNumbers[row][col];
        
        if (num !== null && num !== undefined) {
          lineTotal++;
          if (markedNumbers.has(num)) {
            lineMarked++;
          }
        }
      }
      
      // Línea completa: 5 números marcados
      if (lineMarked === 5 && lineTotal === 5) {
        return 'linea';
      }
    }

    return null;
  };

  const winStatus = checkWin();
  const isBingo = winStatus === 'bingo';
  const isLinea = winStatus === 'linea';

  // Estilos dinámicos basados en skin
  const cardStyles = equippedSkin ? {
    '--card-primary-color': equippedSkin.color_hex || '#22D3EE',
    '--card-animation-class': equippedSkin.animation_class || 'none'
  } : {};

  // Clase dinámica del skin
  const skinClass = equippedSkin ? equippedSkin.animation_class : '';

  return (
    <div
      className={`bingo-card bingo-card-90 ${isSelected ? 'selected' : ''} ${isBingo ? 'bingo' : ''} ${isLinea ? 'linea' : ''} ${skinClass}`}
      style={cardStyles}
      onClick={() => onSelect && onSelect(gridNumbers)}
    >
      {/* Etiqueta de ganancia */}
      {isBingo && <div className="win-badge bingo-badge">🎉 ¡BINGO!</div>}
      {isLinea && <div className="win-badge linea-badge">⭐ LÍNEA</div>}

      {/* Número de serie */}
      <div className="card-number">#{cardNumber}</div>

      {/* Grilla 3x9 */}
      <div className="card-grid card-grid-90">
        {gridNumbers.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="card-row">
            {row.map((number, colIdx) => {
              const isMarked = number !== null && markedNumbers.has(number);
              const isEmpty = number === null || number === undefined;
              
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`cell ${isMarked ? 'marked' : ''} ${isEmpty ? 'empty' : ''}`}
                >
                  {isEmpty ? '' : number}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Indicador equipado */}
      {equippedSkin && (
        <div className="skin-indicator" title={equippedSkin.name}>
          ✨ {equippedSkin.name.substring(0, 8)}...
        </div>
      )}
    </div>
  );
});

BingoCard.displayName = 'BingoCard';

export default BingoCard;

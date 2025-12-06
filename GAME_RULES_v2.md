# 📜 Nuevas Reglas de Juego - Bingo 24 Kilates

## 🎯 Reglas Implementadas (Diciembre 2025)

### 📊 Resumen Ejecutivo

Se implementaron **reglas estrictas** para el pago de premios en el juego de Bingo, eliminando la ambigüedad y facilitando el control de pagos.

---

## 🏆 REGLA 1: Solo Líneas Horizontales

### ✅ Antes
- Se pagaban **13 tipos de líneas**:
  - 5 Horizontales
  - 5 Verticales
  - 2 Diagonales
  - 4 Esquinas

### ✅ Ahora
- **SOLO se pagan líneas HORIZONTALES** (5 filas del cartón)
- Tipos válidos:
  - `horizontal_1` → Fila 1
  - `horizontal_2` → Fila 2
  - `horizontal_3` → Fila 3 (con FREE space)
  - `horizontal_4` → Fila 4
  - `horizontal_5` → Fila 5

### 🎯 Impacto
- **Simplificación**: 1 tipo de línea en lugar de 13
- **Claridad**: Los jugadores solo buscan completar filas horizontales
- **Velocidad**: Validación más rápida

---

## 🏆 REGLA 2: Primera Línea de la Partida

### ✅ Antes
- Cada cartón podía ganar por **cualquier línea que completara**
- Múltiples pagos de líneas en una misma partida

### ✅ Ahora
- **SE PAGA SOLO UNA VEZ** en toda la partida
- Es la **PRIMERA línea horizontal** que se complete entre **TODOS** los cartones en juego
- Después de pagar la primera línea, **NO se pagan más líneas** en esa partida

### 🎯 Ejemplo
```
Partida con 100 cartones en juego:
Bolilla #25: 3 cartones completan una línea horizontal
→ Los 3 ganan y DIVIDEN el pozo de línea
→ NO habrá más pagos de línea en esta partida
→ El juego continúa hasta BINGO
```

### 🚫 No Se Paga
- Líneas completadas **DESPUÉS** de la primera
- Un jugador NO puede ganar "segunda línea" con otro cartón

---

## 🏆 REGLA 3: División de Pozo en Línea

### ✅ Antes
- Cada ganador recibía el monto completo configurado

### ✅ Ahora
- Si **múltiples cartones** completan línea horizontal en la **misma bolilla**:
  - El pozo de línea se **DIVIDE** entre todos los ganadores

### 💰 Ejemplo Práctico

**Configuración de Sala**:
- Pozo de Línea: $2,500

**Escenario 1: Un Solo Ganador**
```
Bolilla #30: 1 cartón completa línea
→ Ganador 1: $2,500
```

**Escenario 2: Dos Ganadores Simultáneos**
```
Bolilla #30: 2 cartones completan línea
→ Ganador 1: $1,250 ($2,500 / 2)
→ Ganador 2: $1,250 ($2,500 / 2)
```

**Escenario 3: Cinco Ganadores Simultáneos**
```
Bolilla #30: 5 cartones completan línea
→ Ganador 1: $500 ($2,500 / 5)
→ Ganador 2: $500
→ Ganador 3: $500
→ Ganador 4: $500
→ Ganador 5: $500
```

---

## 🏆 REGLA 4: BINGO (Cartón Completo)

### ✅ Definición
- **BINGO**: Cartón con **25 números marcados** (24 números + FREE space)
- Es el **primer cartón** que completa todos sus números

### ✅ División de Pozo en BINGO

**Si múltiples cartones completan BINGO en la misma bolilla**:
- El pozo de BINGO se **DIVIDE** entre todos los ganadores

### 💰 Ejemplo Práctico

**Configuración de Sala**:
- Pozo de BINGO: $25,000

**Escenario 1: Un Solo Ganador**
```
Bolilla #65: 1 cartón completa todos los números
→ Ganador: $25,000
```

**Escenario 2: Tres Ganadores Simultáneos**
```
Bolilla #65: 3 cartones completan BINGO
→ Ganador 1: $8,333.33 ($25,000 / 3)
→ Ganador 2: $8,333.33
→ Ganador 3: $8,333.33
```

### 🎯 Fin de Partida
- Al completarse BINGO, **el juego termina inmediatamente**
- Se muestran formularios de pago a los ganadores
- NO hay más sorteo de bolillas

---

## 🔧 Implementación Técnica

### Archivo: `gameEngineAuto.js`

#### Estado del Juego (gameState)
```javascript
{
  lineWinnersPaid: false,        // Solo se paga UNA VEZ
  lineWinnersThisBall: [],       // Ganadores en esta bolilla
  bingoWinnersPaid: false,       // Control de BINGO pagado
  bingoWinnersThisBall: []       // Ganadores de BINGO en esta bolilla
}
```

#### Flujo de Validación
```javascript
// FASE 1: Detectar ganadores de LÍNEA en esta bolilla
if (!gameState.lineWinnersPaid) {
  for (cada cartón activo) {
    if (tiene línea horizontal completa) {
      agregar a lineWinnersThisBall
    }
  }
  
  if (hay ganadores) {
    dividir pozo entre ganadores
    marcar lineWinnersPaid = true
    pausar 2 segundos para celebrar
  }
}

// FASE 2: Detectar ganadores de BINGO en esta bolilla
if (!gameState.bingoWinnersPaid) {
  for (cada cartón activo) {
    if (tiene 25 números marcados) {
      agregar a bingoWinnersThisBall
    }
  }
  
  if (hay ganadores) {
    dividir pozo entre ganadores
    marcar bingoWinnersPaid = true
    terminar partida
  }
}
```

### Función: `checkHorizontalLines()`
```javascript
checkHorizontalLines(cardNumbers, calledNumbers) {
  // Solo verifica las 5 filas horizontales
  for (cada fila de 0 a 4) {
    if (todos los números de la fila están cantados) {
      return { hasLine: true, lineType, winningNumbers }
    }
  }
  return { hasLine: false }
}
```

### Función: `payLineWinners()`
```javascript
payLineWinners(gameSessionId, winners) {
  const totalPrize = linePrize  // Ej: $2,500
  const prizePerWinner = totalPrize / winners.length
  
  for (cada ganador) {
    insertar en game_winners
    notificar con Socket.IO
    log: "→ username: $prizePerWinner (horizontal_X)"
  }
  
  if (winners.length > 1) {
    log: "💰 Pozo dividido: $totalPrize / N = $prizePerWinner c/u"
  }
}
```

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Tipos de Línea** | 13 tipos (H, V, D, Esquinas) | 5 tipos (solo Horizontales) |
| **Pagos de Línea** | Múltiples por partida | Solo 1 vez en toda la partida |
| **Criterio** | Por cartón individual | Primera línea entre TODOS |
| **División de Pozo** | No implementado | SÍ (si múltiples en misma bolilla) |
| **BINGO** | Primer cartón completo | Primer(os) cartón(es) completo(s) |
| **División BINGO** | No implementado | SÍ (si múltiples en misma bolilla) |

---

## 🎮 Flujo de Juego Completo

### 1. Inicio de Partida
```
- Sala configurada: line_prize=$2500, bingo_prize=$25000
- 100 cartones en juego
- Estado: lineWinnersPaid=false, bingoWinnersPaid=false
```

### 2. Sorteo de Números
```
Bolilla #1: B-5
Bolilla #2: I-20
...
Bolilla #25: N-42
```

### 3. Detección de Primera Línea
```
Bolilla #30: G-55
→ Sistema verifica TODOS los cartones
→ Detecta: 3 cartones con línea horizontal completa
   • Usuario1 - Cartón #45 (horizontal_2)
   • Usuario2 - Cartón #78 (horizontal_3)
   • Usuario3 - Cartón #120 (horizontal_1)
→ Divide pozo: $2,500 / 3 = $833.33 c/u
→ Notifica a los 3 ganadores (confetti/particles)
→ Marca: lineWinnersPaid = true
→ Pausa 2 segundos
→ CONTINÚA sorteo (no termina)
```

### 4. Después de Primera Línea
```
Bolilla #31, #32, #33...
→ Sistema NO busca más líneas
→ Solo busca BINGO (cartón completo)
```

### 5. Detección de BINGO
```
Bolilla #65: O-72
→ Sistema verifica TODOS los cartones
→ Detecta: 2 cartones con 25/25 números
   • Usuario4 - Cartón #200
   • Usuario5 - Cartón #305
→ Divide pozo: $25,000 / 2 = $12,500 c/u
→ Notifica a los 2 ganadores (confetti)
→ Marca: bingoWinnersPaid = true
→ TERMINA partida inmediatamente
→ Muestra formularios de pago (después de 5s)
```

---

## 🧪 Testing

### Test 1: División de Línea con 2 Ganadores
```javascript
// Configurar 2 cartones con línea lista para completar en misma bolilla
Cartón A: horizontal_1 le falta el número 5
Cartón B: horizontal_2 le falta el número 5

// Cantar número 5
drawNextBall() → B-5

// Verificar
→ 2 ganadores detectados
→ Pozo: $2,500
→ Premio c/u: $1,250
→ lineWinnersPaid = true
```

### Test 2: División de BINGO con 3 Ganadores
```javascript
// Configurar 3 cartones con 24/25 números, faltando O-75
Cartón A: 24 marcados, falta O-75
Cartón B: 24 marcados, falta O-75
Cartón C: 24 marcados, falta O-75

// Cantar O-75
drawNextBall() → O-75

// Verificar
→ 3 ganadores detectados
→ Pozo: $25,000
→ Premio c/u: $8,333.33
→ bingoWinnersPaid = true
→ Juego termina
```

### Test 3: No Pagar Segunda Línea
```javascript
// Primera línea ya pagada
gameState.lineWinnersPaid = true

// Otro cartón completa línea
Cartón D: horizontal_4 completa

// Verificar
→ NO se paga (lineWinnersPaid ya es true)
→ NO se notifica al usuario
→ Juego continúa normalmente
```

---

## 📝 Logs Esperados

### Línea Simple
```
[GameEngine] 🎉 LÍNEA COMPLETADA - 1 ganador(es)
   → JuanPerez: $2500.00 (horizontal_3)
```

### Línea con División
```
[GameEngine] 🎉 LÍNEA COMPLETADA - 3 ganador(es)
   → JuanPerez: $833.33 (horizontal_2)
   → MariaLopez: $833.33 (horizontal_1)
   → PedroGomez: $833.33 (horizontal_4)
   💰 Pozo dividido: $2500 / 3 = $833.33 c/u
```

### BINGO con División
```
[GameEngine] 🎊 BINGO COMPLETADO - 2 ganador(es)
   → AnaRodriguez: $12500.00
   → CarlosSanchez: $12500.00
   💰 Pozo dividido: $25000 / 2 = $12500.00 c/u
[GameEngine] 🏁 Juego 123 terminado
```

---

## 🔐 Base de Datos

### Tabla: `game_winners`

**Línea Simple**:
```sql
INSERT INTO game_winners VALUES (
  game_session_id: 123,
  user_id: 45,
  card_id: 789,
  prize_type: 'linea',
  prize_amount: 2500.00,
  line_type: 'horizontal_3',
  winning_numbers: '[5,20,35,FREE,60]',
  verified: TRUE
)
```

**Línea con División (3 ganadores)**:
```sql
-- Ganador 1
prize_amount: 833.33

-- Ganador 2
prize_amount: 833.33

-- Ganador 3
prize_amount: 833.34  -- Ajuste por redondeo
```

---

## ✅ Ventajas del Nuevo Sistema

1. **Simplicidad**: Solo 1 tipo de línea válida
2. **Justicia**: División automática de pozo
3. **Control**: Solo se paga una vez por concepto
4. **Transparencia**: Logs claros de división
5. **Performance**: Menos validaciones (5 vs 13 líneas)
6. **Predictibilidad**: Reglas claras y simples

---

## 🚀 Próximos Pasos Opcionales

### Variantes de Juego
- [ ] **Modo "Doble Línea"**: Pagar 2 líneas en lugar de 1
- [ ] **Modo "Línea + BINGO"**: Premios separados
- [ ] **Modo "Full Card"**: Pagar por completar 2, 3, 4 líneas
- [ ] **Modo "Progressive"**: Pozo acumulativo si no hay ganador

### Mejoras de UX
- [ ] Indicador visual "Primera línea ya pagada"
- [ ] Notificación "Ya no se pagan más líneas"
- [ ] Contador de ganadores simultáneos en pantalla
- [ ] Animación especial para división de pozo

---

**Fecha**: 2025-12-06  
**Versión**: 2.0.0  
**Estado**: ✅ IMPLEMENTADO  
**Archivos Modificados**:
- `gameEngineAuto.js` (+150 líneas)
- `cardAnalyzer.js` (+5 líneas)

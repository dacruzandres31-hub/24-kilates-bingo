# ⚠️ 3 PUNTOS CRÍTICOS PARA PRODUCCIÓN

## 🔴 DOCUMENTO OBLIGATORIO DE LECTURA PARA EL PROGRAMADOR

Este documento explica los 3 puntos más importantes que DEBES tener en cuenta al trabajar con el sistema de fichas y dinero real.

---

## 📌 PUNTO CLAVE #1: MATEMÁTICAS PRECISAS (Decimal.js)

### ❌ PROBLEMA: JavaScript no maneja decimales correctamente

```javascript
// ❌ NUNCA HAGAS ESTO CON DINERO:
console.log(0.1 + 0.2);  // 0.30000000000000004
console.log(0.3 - 0.1);  // 0.19999999999999998

let balance = 100.50;
balance = balance - 50.25;  // Puede dar 50.24999999999
```

**Resultado:** El dinero desaparece o aparece mágicamente. En producción, esto es **INACEPTABLE**.

### ✅ SOLUCIÓN: Usar `MoneyMath` (basado en decimal.js)

```javascript
const MoneyMath = require('../utils/moneyMath');

// ✅ SIEMPRE HAZ ESTO:
const balance = MoneyMath.decimal(100.50);
const retiro = MoneyMath.decimal(50.25);
const resultado = balance.minus(retiro);

console.log(MoneyMath.toNumber(resultado));  // 50.25 (exacto)
```

### 📝 Funciones Implementadas en `moneyMath.js`

```javascript
// Crear decimal
const amount = MoneyMath.decimal(1000);

// Sumar (evita 0.1 + 0.2 = 0.300000004)
const total = MoneyMath.add(100.50, 200.25, 50.10);  // 350.85 exacto

// Restar
const result = MoneyMath.subtract(1000, 250.50);  // 749.50 exacto

// Multiplicar
const tax = MoneyMath.multiply(1000, 0.15);  // 150.00 exacto

// Dividir (con validación de división por cero)
const perPerson = MoneyMath.divide(1000, 4);  // 250.00 exacto

// Porcentaje (ej: 15% de 1000)
const commission = MoneyMath.percentage(1000, 15);  // 150.00 exacto

// Comparaciones seguras
MoneyMath.isGreaterThan(100.50, 100.49);  // true
MoneyMath.isEqual(100.50, 100.50, 0.01);  // true (con tolerancia)

// Formatear para UI
MoneyMath.format(1000000.50);  // "$1.000.000,50"
MoneyMath.toString(1000.50, 2);  // "1000.50"

// Convertir a número para guardar en BD
MoneyMath.toNumber(amountDecimal);  // 1000.50
```

### 🎯 REGLA DE ORO:

1. **Recibir del frontend:** Convertir a `MoneyMath.decimal()` inmediatamente
2. **Calcular:** Usar funciones de `MoneyMath` para todas las operaciones
3. **Guardar en BD:** Usar `MoneyMath.toNumber()` antes del INSERT/UPDATE
4. **Mostrar en UI:** Usar `MoneyMath.format()` o `MoneyMath.toString()`

### 📋 Ejemplo Completo

```javascript
// ❌ MAL - JavaScript nativo
async depositChips(userId, amount) {
  const balance = parseFloat(user.balance);  // ❌ Impreciso
  const newBalance = balance + amount;       // ❌ Puede dar 0.30000004
  await db.query('UPDATE users SET balance = ?', [newBalance]);
}

// ✅ BIEN - MoneyMath
async depositChips(userId, amount) {
  const balance = MoneyMath.decimal(user.balance);        // ✅ Exacto
  const amountDecimal = MoneyMath.decimal(amount);        // ✅ Exacto
  const newBalance = balance.plus(amountDecimal);         // ✅ Exacto
  
  await db.query('UPDATE users SET balance = ?', [
    MoneyMath.toNumber(newBalance)  // ✅ Convertir para BD
  ]);
}
```

---

## 📌 PUNTO CLAVE #2: COMISIÓN DEL 15% A CADA CAJERO

### ❌ PROBLEMA: NO dar el 15% total a UN solo cajero

```javascript
// ❌ NUNCA HAGAS ESTO:
const totalRevenue = 10000;  // Venta total de cartones
const commission = totalRevenue * 0.15;  // 1500

// ❌ MAL: Dar los 1500 a UN solo cajero
await creditBalance(cajeroId, commission);  // ❌ ¡Incorrecto!
```

**Resultado:** Si hubo 5 cajeros vendiendo cartones, solo 1 recibe TODO el 15%. Los otros 4 quedan sin comisión. Esto causa conflictos y errores en la contabilidad.

### ✅ SOLUCIÓN: Calcular comisión POR CADA cajero individualmente

El sistema debe:
1. Consultar qué cajero vendió cada cartón (campo `seller_id` en `bingo_cards`)
2. Sumar las ventas de CADA cajero por separado
3. Calcular el 15% de las ventas de CADA cajero
4. Acreditar a CADA cajero su comisión correspondiente

### 📝 Implementación Correcta en `commissionService.js`

```javascript
const CommissionService = require('../services/commissionService');

// Calcular comisiones por sesión de juego
const result = await CommissionService.calculateSessionCommissions(sessionId);

/*
Resultado:
{
  sessionId: 123,
  totalCards: 100,
  totalRevenue: 10000,
  commissions: [
    {
      sellerId: 5,           // Cajero #1
      username: 'cajero_01',
      cardsCount: 40,
      totalSales: 4000,      // Vendió 4000 en fichas
      commissionAmount: 600  // 15% de 4000 = 600
    },
    {
      sellerId: 7,           // Cajero #2
      username: 'cajero_02',
      cardsCount: 35,
      totalSales: 3500,      // Vendió 3500 en fichas
      commissionAmount: 525  // 15% de 3500 = 525
    },
    {
      sellerId: 9,           // Cajero #3
      username: 'cajero_03',
      cardsCount: 25,
      totalSales: 2500,      // Vendió 2500 en fichas
      commissionAmount: 375  // 15% de 2500 = 375
    }
  ],
  totalCommission: 1500  // 600 + 525 + 375 = 1500
}
*/
```

### 🔧 Acreditar Comisiones Automáticamente

```javascript
// Después de que termine la sesión de juego
const result = await CommissionService.creditCommissionsToCashiers(sessionId);

/*
Esto hace:
1. Calcula la comisión de cada cajero
2. Actualiza el balance de CADA cajero (UPDATE users SET balance = ...)
3. Registra el movimiento en chips_movements (tipo 'bonus')
4. Todo en una TRANSACCIÓN ATÓMICA (ver punto #3)
*/
```

### 📊 Verificar Comisiones de un Cajero

```javascript
// Obtener historial de comisiones de un cajero específico
const history = await CommissionService.getCashierCommissions(cajeroId, {
  startDate: '2025-12-01',
  endDate: '2025-12-31',
  limit: 100
});

console.log(`Total comisiones del mes: ${history.totalCommissions}`);
```

### 🎯 REGLA DE ORO:

**NUNCA** calcules una comisión total y la dividas manualmente. **SIEMPRE** usa `CommissionService` que calcula y acredita individualmente a cada cajero según sus ventas.

---

## 📌 PUNTO CLAVE #3: TRANSACCIONES ATÓMICAS (ACID)

### ❌ PROBLEMA: Operaciones a medias que pierden dinero

```javascript
// ❌ NUNCA HAGAS ESTO:
async processWithdrawal(userId, amount) {
  // Paso 1: Debitar fichas del usuario
  await db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
  
  // 🔥 ¡SE CORTA LA LUZ AQUÍ!
  
  // Paso 2: Registrar movimiento (nunca se ejecuta)
  await db.query('INSERT INTO chips_movements ...');  // ❌ No se ejecutó
  
  // Paso 3: Marcar retiro como completado (nunca se ejecuta)
  await db.query('UPDATE withdrawal_requests SET status = "completed" ...');  // ❌ No se ejecutó
}
```

**Resultado:** 
- El usuario perdió sus fichas (Paso 1 se ejecutó)
- No hay registro del movimiento (Paso 2 NO se ejecutó)
- La solicitud sigue en estado "pending" (Paso 3 NO se ejecutó)
- **EL DINERO DESAPARECIÓ** sin rastro

### ✅ SOLUCIÓN: Usar TRANSACCIONES ATÓMICAS

Una transacción atómica garantiza que **TODO se ejecuta o NADA se ejecuta**. Si falla un paso, TODO se revierte.

### 📝 Implementación Correcta

```javascript
// ✅ SIEMPRE HAZ ESTO:
async processWithdrawal(userId, amount) {
  const connection = await pool.getConnection();
  
  try {
    // ⚠️ INICIAR TRANSACCIÓN
    await connection.query('START TRANSACTION');
    
    // Paso 1: Debitar fichas del usuario
    await connection.query(
      'UPDATE users SET balance = balance - ? WHERE id = ?', 
      [amount, userId]
    );
    
    // Paso 2: Registrar movimiento
    await connection.query(
      'INSERT INTO chips_movements (user_id, amount, ...) VALUES (...)'
    );
    
    // Paso 3: Marcar retiro como completado
    await connection.query(
      'UPDATE withdrawal_requests SET status = "completed" WHERE id = ?',
      [withdrawalId]
    );
    
    // ⚠️ COMMIT: Si llegamos aquí, guardar TODO
    await connection.query('COMMIT');
    
    return { success: true };
    
  } catch (error) {
    // ⚠️ ROLLBACK: Si falla ALGO, revertir TODO
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}
```

### 🔒 Qué Hace la Transacción Atómica

1. **START TRANSACTION**: "No guardes nada todavía, estoy probando"
2. **Operaciones**: Se ejecutan en memoria temporal
3. **COMMIT**: "Todo salió bien, ahora sí guárdalo todo"
4. **ROLLBACK**: "Algo falló, borra todo y vuelve al estado anterior"

### 🎯 Ejemplo Real: ¿Qué pasa si se corta la luz?

#### Sin Transacción (❌):
```
1. UPDATE users SET balance = 9000 (se guardó en disco)
🔥 SE CORTA LA LUZ
2. INSERT chips_movements ... (no se ejecutó)
3. UPDATE withdrawal_requests ... (no se ejecutó)

Resultado: Usuario perdió 1000 fichas sin registro
```

#### Con Transacción (✅):
```
1. START TRANSACTION
2. UPDATE users SET balance = 9000 (en memoria temporal)
🔥 SE CORTA LA LUZ
3. MySQL detecta que no hubo COMMIT
4. ROLLBACK automático al reiniciar
5. Balance vuelve a 10000

Resultado: NADA cambió, todo seguro
```

### 📋 Reglas de Transacciones en el Código

**TODOS estos archivos YA implementan transacciones correctamente:**

✅ `chipsService.js` - Depósitos, retiros, transferencias
✅ `commissionService.js` - Acreditación de comisiones
✅ `gameEngine.js` - Premios de juego
✅ `withdrawalController.js` - Procesamiento de retiros

**Ejemplo de código ya implementado:**

```javascript
// En chipsService.js (líneas 23-98)
static async depositChips(userId, amount, adminId, reason) {
  const connection = await pool.getConnection();
  
  try {
    await connection.query('START TRANSACTION');  // ⚠️ Inicia
    
    // ... todas las operaciones ...
    
    await connection.query('COMMIT');  // ⚠️ Confirma
    return { success: true };
    
  } catch (error) {
    await connection.query('ROLLBACK');  // ⚠️ Revierte
    throw error;
  } finally {
    connection.release();
  }
}
```

### 🎯 REGLA DE ORO:

**TODA operación que modifique balances de fichas DEBE estar dentro de una transacción:**

```javascript
START TRANSACTION
  ├─ UPDATE balance
  ├─ INSERT chips_movements
  ├─ UPDATE otras_tablas
  └─ COMMIT (solo si TODO fue exitoso)
    
Si falla ALGO:
  └─ ROLLBACK (revertir TODO)
```

---

## 📊 CHECKLIST DE VALIDACIÓN

Antes de desplegar a producción, verificar:

### ✅ Punto #1: Matemáticas Precisas
- [ ] Todas las operaciones de dinero usan `MoneyMath`
- [ ] No hay `parseFloat()`, `+`, `-`, `*`, `/` con dinero
- [ ] Los valores se convierten con `MoneyMath.toNumber()` antes de INSERT/UPDATE
- [ ] Los cálculos de porcentaje usan `MoneyMath.percentage()`

### ✅ Punto #2: Comisiones Individuales
- [ ] Tabla `bingo_cards` tiene columna `seller_id`
- [ ] Se registra qué cajero vendió cada cartón
- [ ] `CommissionService.creditCommissionsToCashiers()` se llama después de cada sesión
- [ ] Cada cajero recibe el 15% de SUS ventas (no del total)

### ✅ Punto #3: Transacciones Atómicas
- [ ] Toda operación de fichas está dentro de `START TRANSACTION` / `COMMIT`
- [ ] Hay `catch (error)` con `ROLLBACK` en todas las funciones
- [ ] Se usa `finally { connection.release() }` para liberar la conexión
- [ ] No hay operaciones de balance fuera de transacciones

---

## 🧪 TESTS RECOMENDADOS

### Test de Matemáticas Precisas
```javascript
const MoneyMath = require('../utils/moneyMath');

// Test 1: Suma precisa
const result = MoneyMath.add(0.1, 0.2);
console.assert(MoneyMath.toNumber(result) === 0.3, 'Suma debe ser exacta');

// Test 2: Comisión del 15%
const commission = MoneyMath.percentage(1000, 15);
console.assert(MoneyMath.toNumber(commission) === 150, 'Comisión debe ser 150');

// Test 3: División sin pérdida
const perPerson = MoneyMath.divide(1000, 3);
console.log(MoneyMath.toString(perPerson, 2));  // 333.33
```

### Test de Comisiones
```javascript
// Simular venta de cartones por 3 cajeros
const result = await CommissionService.calculateSessionCommissions(sessionId);

// Verificar que cada cajero tenga su comisión
console.assert(result.commissions.length === 3, 'Debe haber 3 cajeros');

// Verificar que la suma de comisiones = 15% del total
const totalCommissions = result.commissions.reduce((a, c) => a + c.commissionAmount, 0);
const expected = result.totalRevenue * 0.15;
console.assert(Math.abs(totalCommissions - expected) < 0.01, 'Comisiones deben sumar 15%');
```

### Test de Transacciones
```javascript
// Test de ROLLBACK
try {
  await chipsService.depositChips(999999, 1000, 1, 'Test');  // Usuario inexistente
} catch (error) {
  // Verificar que no se creó ningún movimiento
  const movements = await db.query('SELECT * FROM chips_movements WHERE user_id = 999999');
  console.assert(movements.length === 0, 'No debe haber registros si falló');
}
```

---

## 🚨 ALERTAS DE PRODUCCIÓN

Configurar alertas para detectar problemas:

1. **Discrepancias de balance:**
```sql
-- Ejecutar cada hora
CALL audit_all_balances();
-- Si encuentra discrepancias, enviar alerta a admin
```

2. **Transacciones que quedaron en "pending" más de 24h:**
```sql
SELECT * FROM withdrawal_requests 
WHERE status = 'pending' 
  AND requested_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

3. **Comisiones no acreditadas:**
```sql
-- Verificar que cada sesión terminada tenga comisiones acreditadas
SELECT gs.id, gs.status, COUNT(cm.id) as commission_count
FROM game_sessions gs
LEFT JOIN chips_movements cm ON gs.id = cm.game_session_id AND cm.movement_type = 'bonus'
WHERE gs.status = 'completed'
GROUP BY gs.id
HAVING commission_count = 0;
```

---

## 📚 DOCUMENTACIÓN ADICIONAL

- **MoneyMath API completa:** `server/src/utils/moneyMath.js`
- **CommissionService API:** `server/src/services/commissionService.js`
- **ChipsService con transacciones:** `server/src/services/chipsService.js`
- **Sistema de retiros:** `SISTEMA_RETIROS_20MIN.md`

---

## ⚠️ NOTA FINAL

Estos 3 puntos NO son opcionales. Son **REQUISITOS CRÍTICOS** para que el sistema funcione correctamente en producción con dinero real.

Si ignoras cualquiera de estos puntos:
- **Punto #1:** El dinero desaparecerá o aparecerá por redondeos incorrectos
- **Punto #2:** Los cajeros pelearan por comisiones mal distribuidas
- **Punto #3:** Se perderá dinero si hay cortes de luz o errores

**¡Revisa estos 3 puntos en CADA pull request antes de mergear a producción!**

---

**Última actualización:** 5 de diciembre de 2025  
**Versión:** 1.0 - Puntos Críticos para Producción

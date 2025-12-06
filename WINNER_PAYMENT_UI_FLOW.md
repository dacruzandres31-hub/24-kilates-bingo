# FLUJO DE NOTIFICACIONES Y FORMULARIO DE PAGO - SISTEMA DE BINGO

## 📋 DESCRIPCIÓN GENERAL

Cuando un jugador gana una línea o bingo en salas monetizadas (Bronce, Plata, Oro), el sistema debe:
1. Notificar a TODOS los jugadores quién ganó
2. Mostrar mensaje especial al ganador
3. Al finalizar el sorteo, mostrar formulario SOLO al ganador

---

## 🎯 EVENTOS SOCKET.IO A IMPLEMENTAR

### 1. Evento: `line_winner` (Cuando alguien canta línea)

**BROADCAST A TODOS LOS JUGADORES EN LA SALA:**
```javascript
socket.to(roomId).emit('line_winner', {
  winner: {
    userId: 123,
    username: "JuanPerez"
  },
  prizeAmount: 5000,
  lineType: "horizontal" // horizontal, vertical, diagonal
});
```

**PARA EL GANADOR (mensaje adicional):**
```javascript
socket.to(winnerId).emit('line_won_by_you', {
  prizeAmount: 5000,
  lineType: "horizontal",
  message: "¡Felicitaciones! Ganaste la línea. Al finalizar el sorteo te pediremos datos para cobrar tu premio."
});
```

### 2. Evento: `bingo_winner` (Cuando alguien canta bingo - FINAL DEL SORTEO)

**BROADCAST A TODOS LOS JUGADORES:**
```javascript
socket.to(roomId).emit('bingo_winner', {
  winner: {
    userId: 456,
    username: "MariaGomez"
  },
  prizeAmount: 50000,
  gameEnded: true
});
```

**PARA EL GANADOR:**
```javascript
socket.to(winnerId).emit('bingo_won_by_you', {
  prizeAmount: 50000,
  message: "¡BINGO! ¡Felicitaciones, ganaste el premio mayor!"
});
```

### 3. Evento: `game_finished` (Sorteo finalizado - MOSTRAR FORMULARIO)

**SOLO A LOS GANADORES QUE NECESITAN COMPLETAR DATOS:**
```javascript
// Enviar a cada ganador (línea y bingo)
socket.to(winnerId).emit('show_payment_form', {
  gameSessionId: 789,
  prizes: [
    { type: "linea", amount: 5000 },
    { type: "bingo", amount: 50000 }
  ],
  totalAmount: 55000,
  message: "Por favor completa tus datos bancarios para recibir tu premio"
});
```

---

## 🎨 COMPONENTES UI A IMPLEMENTAR EN FRONTEND

### Componente 1: `WinnerNotification.jsx`

**Muestra notificación cuando OTRO jugador gana**

```jsx
// Props esperadas:
{
  type: "line" | "bingo",
  winner: "JuanPerez",
  amount: 5000
}

// Comportamiento:
- Aparece en la esquina superior derecha
- Duración: 5 segundos
- Animación: slide-in desde arriba
- Color: Dorado con efecto de confetti
```

### Componente 2: `PersonalWinNotification.jsx`

**Muestra cuando TÚ ganas**

```jsx
// Props esperadas:
{
  type: "line" | "bingo",
  amount: 5000,
  message: "¡Felicitaciones! Al finalizar..."
}

// Comportamiento:
- Aparece en el CENTRO de la pantalla
- Overlay semi-transparente detrás
- Animación: zoom-in con efecto de brillo
- Botón: "Entendido" (no cierra hasta hacer click)
- Incluye el mensaje: "Finalizado el sorteo te pediremos datos..."
```

### Componente 3: `PaymentFormModal.jsx`

**Formulario que aparece AL FINALIZAR EL SORTEO (solo a ganadores)**

```jsx
// Props esperadas:
{
  gameSessionId: 789,
  prizes: [
    { type: "linea", amount: 5000 },
    { type: "bingo", amount: 50000 }
  ],
  totalAmount: 55000
}

// Campos del formulario:
- CBU (22 dígitos, validación en tiempo real)
- Titular de la cuenta (texto completo)
- Banco (select o input)
- Tipo de cuenta (radio: Caja de Ahorro / Cuenta Corriente)
- WhatsApp (con código de país, formato: +54 9 11 1234-5678)

// Validaciones:
✓ CBU: exactamente 22 dígitos numéricos
✓ Titular: mínimo 5 caracteres
✓ WhatsApp: formato válido con código de país
✓ Todos los campos son obligatorios

// Botones:
- "Enviar datos" (primary, deshabilitado si formulario inválido)
- "Completar más tarde" (secondary, cierra pero avisa que debe completar)

// Comportamiento:
- NO SE PUEDE CERRAR haciendo click fuera
- Solo se cierra con los botones
- Al enviar exitosamente: mensaje de confirmación
- Error: mostrar mensaje de error específico
```

---

## 📱 FLUJO COMPLETO PASO A PASO

### ESCENARIO 1: Jugador gana LÍNEA en sala Oro

1. **Durante el sorteo:**
   - Jugador hace click en "Cantar Línea"
   - Backend valida la línea

2. **Línea válida - Notificación:**
   ```
   [A TODOS] 
   🎉 Cartel superior: "¡JuanPerez ganó la línea! $5.000"
   
   [AL GANADOR]
   🏆 Modal centro pantalla:
   "¡FELICITACIONES! Ganaste la línea
   Premio: $5.000
   
   📋 Finalizado el sorteo te pediremos 
   datos para que puedas cobrar tu premio."
   
   [Botón: Entendido]
   ```

3. **El sorteo CONTINÚA:**
   - Se siguen sacando bolillas
   - Pueden haber más ganadores de línea
   - El juego termina cuando alguien canta BINGO

4. **Sorteo finaliza (BINGO):**
   ```
   [A TODOS]
   🎊 Cartel grande: "¡MariaGomez ganó el BINGO! $50.000"
   
   [A MariaGomez - GANADORA DE BINGO]
   🏆 Modal: "¡BINGO! ¡FELICITACIONES!"
   
   [5 segundos después]
   📝 Se abre automáticamente el formulario de pago
   
   [A JuanPerez - GANADOR DE LÍNEA]
   📝 Se abre automáticamente el formulario de pago
   ```

5. **Formulario de pago:**
   ```
   ╔═══════════════════════════════════╗
   ║  COMPLETA TUS DATOS PARA COBRAR   ║
   ╠═══════════════════════════════════╣
   ║                                   ║
   ║  Tus premios ganados:             ║
   ║  • Línea: $5.000                  ║
   ║  • Total: $5.000                  ║
   ║                                   ║
   ║  CBU: [____________________]      ║
   ║  (22 dígitos)                     ║
   ║                                   ║
   ║  Titular: [__________________]    ║
   ║                                   ║
   ║  Banco: [__________________]      ║
   ║                                   ║
   ║  Tipo: ( ) Caja Ahorro            ║
   ║        ( ) Cuenta Corriente       ║
   ║                                   ║
   ║  WhatsApp: [+54 9 ___________]    ║
   ║  (para enviarte el comprobante)   ║
   ║                                   ║
   ║  [Enviar datos] [Más tarde]       ║
   ╚═══════════════════════════════════╝
   ```

---

## 🎮 ESCENARIO 2: Jugador gana LÍNEA Y BINGO

Si el mismo jugador gana línea Y bingo:

```javascript
// Al finalizar el sorteo, el formulario muestra:
prizes: [
  { type: "linea", amount: 5000 },
  { type: "bingo", amount: 50000 }
]
totalAmount: 55000

// El formulario se envía UNA SOLA VEZ con ambos premios
// El backend crea DOS registros en winner_payment_info
```

---

## 💾 BACKEND - Endpoints ya implementados

```javascript
// Jugador completa formulario
POST /api/winners-payment/submit
Body: {
  gameSessionId: 789,
  prizeType: "linea", // o "bingo"
  prizeAmount: 5000,
  cbu: "1234567890123456789012",
  bankAccountHolder: "Juan Perez",
  bankName: "Banco Galicia",
  accountType: "savings",
  whatsapp: "+5491123456789"
}

// Ver mis pagos pendientes
GET /api/winners-payment/my-payments

// Admin/Cajero procesa el pago
POST /api/winners-payment/:id/process
Body: {
  paymentReceipt: "COMPROBANTE_123.jpg",
  notes: "Pago realizado via transferencia"
}
```

---

## ⚙️ CONFIGURACIÓN POR SALA

### Salas que USAN este sistema (monetizadas):
- 🥉 **Sala Bronce** - Línea: $2.500 / Bingo: $25.000
- 🥈 **Sala Plata** - Línea: $5.000 / Bingo: $50.000
- 🥇 **Sala Oro** - Línea: $10.000 / Bingo: $100.000

### Salas que NO usan este sistema:
- 🆓 **Sala Starter (Gratis)** - Sin premios monetarios
- 🎁 **Salas de Práctica** - Premios en fichas virtuales

---

## 🔔 NOTIFICACIONES ADICIONALES

### Notificación Push (opcional):
Cuando se procesa el pago y se envía el comprobante:

```javascript
socket.to(winnerId).emit('payment_completed', {
  amount: 5000,
  receipt: "https://...",
  message: "¡Tu premio fue transferido! Revisa tu WhatsApp para ver el comprobante"
});
```

---

## 📊 DASHBOARD ADMIN

Panel para ver y gestionar pagos:

```
╔═══════════════════════════════════════════════════╗
║  PAGOS PENDIENTES A GANADORES                     ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  Usuario       | Premio      | Monto   | Acción  ║
║  ─────────────────────────────────────────────────║
║  JuanPerez     | Línea       | $5.000  | [Pagar] ║
║  MariaGomez    | Bingo       | $50.000 | [Pagar] ║
║  PedroLopez    | Línea+Bingo | $15.000 | [Pagar] ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

[Click en Pagar]
  → Modal con datos del ganador (CBU, Titular, WhatsApp)
  → Input para subir comprobante
  → Botón "Confirmar pago y enviar por WhatsApp"
```

---

## 🚀 PRIORIDAD DE IMPLEMENTACIÓN

### FASE 1 (Crítico - Implementar YA):
1. ✅ Backend endpoints (ya implementado)
2. ⏳ Socket.IO events (line_winner, bingo_winner, show_payment_form)
3. ⏳ PaymentFormModal component
4. ⏳ Integración con backend

### FASE 2 (Importante):
1. WinnerNotification component (notificación para todos)
2. PersonalWinNotification component (notificación para ganador)
3. Animaciones y efectos visuales
4. Validaciones en tiempo real del formulario

### FASE 3 (Nice to have):
1. Dashboard admin para gestionar pagos
2. Integración con WhatsApp API para envío automático
3. Notificaciones push cuando se procesa el pago
4. Reportes y estadísticas de pagos

---

## 📝 NOTAS IMPORTANTES

1. **El formulario SOLO aparece AL FINALIZAR el sorteo**, no inmediatamente después de ganar
2. **Múltiples ganadores**: Si 3 personas ganan línea, las 3 verán el formulario al final
3. **Sala Starter**: NO mostrar formulario, es gratis
4. **Validación CBU**: Debe ser estricta, 22 dígitos exactos
5. **WhatsApp**: Necesario para enviar comprobante de pago
6. **Timeout**: Si el jugador no completa en 24hs, admin debe contactarlo
7. **Seguridad**: Solo el ganador puede ver/completar SU formulario

---

## 🎯 RESULTADO ESPERADO

Al implementar esto correctamente:
- ✅ Jugadores entienden que ganaron pero deben esperar al final
- ✅ No interrumpe el flujo del juego
- ✅ Todos ven quién ganó (transparencia)
- ✅ Proceso de cobro es claro y guiado
- ✅ Admin puede gestionar pagos eficientemente
- ✅ Comprobantes llegan por WhatsApp automáticamente

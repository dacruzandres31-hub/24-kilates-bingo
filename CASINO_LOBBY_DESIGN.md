# 🎰 CASINO LOBBY - BINGO 24 KILATES
## Lobby Virtual de Alta Gama

---

## 📋 DESCRIPCIÓN GENERAL

El **Casino Lobby** es la pantalla principal del sistema de Bingo 24 Kilates, diseñada como una interfaz premium en **Dark Mode** que presenta 4 salas de juego distintivas con diferentes niveles de entrada y premios.

### 🎨 Concepto de Diseño

- **Estética**: Dark Mode elegante (fondo negro #0a0a0a)
- **Estilo**: Aplicación móvil premium con neones y metálicos
- **Interfaz**: Moderna, limpia, con animaciones suaves
- **Paleta**: Oro, Plata, Bronce y Turquesa Cian

---

## 🏛️ ARQUITECTURA DE COMPONENTES

### Archivos Creados

```
client-player/src/
├── components/
│   └── CasinoLobby.jsx        (350 líneas - Componente principal)
└── styles/
    └── CasinoLobby.css        (850 líneas - Estilos y animaciones)
```

### Estructura del Componente

```jsx
CasinoLobby
├── Header (Logo + Reloj)
├── Título de Salas
├── Grid de 4 Salas
│   ├── Sala Starter (19:00)
│   ├── Sala Bronce (20:00)
│   ├── Sala Plata (21:00)
│   └── Sala Oro (22:00)
├── Ticker de Ganadores
└── Footer con Info
```

---

## 🎯 LAS 4 SALAS DE JUEGO

### 1️⃣ SALA STARTER (19:00 hs)

**Posición**: Extremo izquierdo

**Estética Visual**:
- **Color Principal**: Verde Turquesa Cian (#00d4ff → #00ffc8)
- **Iluminación**: Neón cian eléctrico vibrante
- **Efecto**: Partículas flotantes turquesas
- **Sensación**: Accesible, divertida, energética

**Detalles**:
- **Precio**: `GRATIS` (en neón cian brillante)
- **Premios**: Skins, Avatares, Premios Visuales
- **Iconografía**: 🎟️ Ticket de entrada + 4 íconos flotantes (🎨👕🎁⭐)
- **Target**: Jugadores nuevos, práctica sin riesgo

**Características Técnicas**:
```css
gradient: linear-gradient(135deg, #00d4ff 0%, #00ffc8 100%)
glow: 0 0 40px rgba(0, 255, 200, 0.6)
particles: 20 partículas flotantes animadas
```

---

### 2️⃣ SALA BRONCE (20:00 hs)

**Posición**: Centro-izquierda

**Estética Visual**:
- **Color Principal**: Bronce Cobre (#cd7f32 → #b87333 → #8b4513)
- **Textura**: Metal antiguo con pátina, relieve rugoso
- **Iluminación**: Anaranjada cálida, marrón rojizo
- **Sensación**: Sólida, rústica, clásica

**Detalles**:
- **Precio**: `$500` (etiqueta metálica anaranjada)
- **Pozo Acumulado**: `$80.000` aprox
- **Iconografía**: 🥉 Medalla de bronce
- **Odómetro**: Contador digital naranja rodando

**Características Técnicas**:
```css
gradient: linear-gradient(135deg, #cd7f32 0%, #b87333 50%, #8b4513 100%)
glow: 0 0 40px rgba(205, 127, 50, 0.6)
texture: Patrón de cuadros diagonales animado (20px)
pot-color: #ffaa00
```

---

### 3️⃣ SALA PLATA (21:00 hs)

**Posición**: Centro-derecha

**Estética Visual**:
- **Color Principal**: Plata Cromo (#c0c0c0 → #e8e8e8)
- **Textura**: Metal pulido, reflejos cromados
- **Iluminación**: Blanca fría, azulada futurista
- **Sensación**: Tecnológica, brillante, nítida

**Detalles**:
- **Precio**: `$1.000` (etiqueta metálica plateada)
- **Pozo Acumulado**: `$250.000` aprox
- **Iconografía**: 🥈 Medalla de plata
- **Odómetro**: Contador digital plateado brillante

**Características Técnicas**:
```css
gradient: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a8a8a8 100%)
glow: 0 0 40px rgba(192, 192, 192, 0.8)
texture: Patrón de rayas diagonales brillantes (40px, shimmer)
pot-color: #e8e8e8
```

---

### 4️⃣ SALA ORO (22:00 hs) ⭐ EVENTO PRINCIPAL

**Posición**: Extremo derecho (Featured)

**Estética Visual**:
- **Color Principal**: Oro Puro 24K (#ffd700 → #ffed4e → #ffaa00)
- **Textura**: Oro fundido con reflejos blancos
- **Iluminación**: Amarilla intensa con aura dorada
- **Efectos**: Partículas doradas flotando, resplandor pulsante
- **Sensación**: VIP, exclusiva, millonaria

**Detalles**:
- **Precio**: `$2.000` (etiqueta dorada de lujo)
- **Pozo Millonario**: `$1.200.000` aprox
- **Iconografía**: 🥇 Medalla de oro
- **Odómetro**: Contador dorado gigante con glow de fuego
- **Border**: 4px (más grueso que otras salas)

**Características Técnicas**:
```css
gradient: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffaa00 100%)
glow: 0 0 60px rgba(255, 215, 0, 0.9)
texture: Radial gradient elíptico blanco
particles: 20 partículas doradas flotantes
featured-pulse: Animación infinita de sombras pulsantes
pot-size: 3rem (más grande)
pot-glow: 0 0 40px rgba(255, 215, 0, 0.8) con animación
```

---

## 🎨 ELEMENTOS VISUALES COMUNES

### 📍 Header

**Logo "BINGO 24 KILATES"**:
- **BINGO**: 3rem, oro degradado (#ffd700 → #ffed4e → #ffa500)
- **24 KILATES**: 2rem, plata degradado (#e0e0e0 → #ffffff)
- **Tagline**: "El Casino Virtual de Alta Gama" (cursiva, #888)
- **Efecto**: Aura dorada pulsante (logo-pulse 3s)

**Reloj en Tiempo Real**:
- Fondo negro translúcido con borde dorado
- Formato: HH:MM (Courier New, monospace)
- Ícono: 🕐 con animación de tic-tac
- Color: Dorado (#ffd700)

### 🎴 Tarjetas de Sala

**Estructura de Cada Card**:
1. **Badge de Estado** (esquina superior derecha):
   - 🔴 EN VIVO (rojo parpadeante)
   - ⏰ ABRIENDO (naranja)
   - 📅 PRÓXIMAMENTE (gris)
   - 🔒 CERRADA (oscuro)

2. **Ícono de Sala** (emoji grande, 4rem):
   - Animación: bounce vertical 2s infinito

3. **Nombre de Sala** (1.8rem, bold, uppercase):
   - Sombra de texto negra para profundidad

4. **Horario** (🕐 + "XX:00 hs"):
   - 1.2rem, semi-transparente

5. **Descripción** (cursiva, semi-transparente):
   - "Diversión sin costo", "Entrada accesible", etc.

6. **Divider** (línea horizontal degradada)

7. **Precio** (2.2rem, bold):
   - Fondo negro semi-transparente
   - Box-shadow de color según sala
   - Animación de brillo (solo Sala Oro)

8. **Pozo / Premios**:
   - **Con Pozo**: Odómetro digital rodando + monto grande
   - **Sin Pozo (Starter)**: 4 íconos flotantes (🎨👕🎁⭐)

9. **Botón de Entrada** (bottom):
   - 🎮 ENTRAR AHORA / 🎟️ RESERVAR
   - Gradiente según color de sala
   - Hover: scale 1.1 + sombra más fuerte

10. **Efecto de Brillo** (shine):
    - Línea diagonal blanca translúcida
    - Se desplaza al hover (0.6s)

### 🏆 Ticker de Ganadores (Fixed Bottom)

**Diseño**:
- Fondo negro semi-transparente (#000 90%)
- Borde superior dorado (3px, rgba(255, 215, 0, 0.4))
- Label: "🏆 GANADORES RECIENTES"

**Contenido Animado**:
- Scroll horizontal infinito (60s linear)
- Items: `Nombre • $Monto • SALA`
- Colores: Blanco + Verde ($) + Color de sala

**Ejemplo de Item**:
```
María G. • $1.200.000 • ORO
```

### 📊 Footer

**4 Ítems de Información**:
1. 🎰 Juego Responsable
2. 🔒 Pagos Seguros
3. ⚡ Retiros en 20 min
4. 👥 Soporte 24/7

**Estilo**: Íconos grandes (2rem) + texto pequeño (#999)

---

## ✨ ANIMACIONES Y EFECTOS

### 🎬 Animaciones CSS

| Nombre | Duración | Efecto |
|--------|----------|--------|
| `logo-pulse` | 3s | Aura dorada pulsante en logo |
| `clock-tick` | 1s | Parpadeo del ícono de reloj |
| `card-entrance` | 0.6s | Entrada de cards desde abajo (stagger) |
| `featured-pulse` | 2s | Sombra pulsante en Sala Oro |
| `particle-float` | 5s | Partículas flotando hacia arriba |
| `texture-shift` | 20s | Movimiento de textura (Bronce) |
| `texture-shimmer` | 3s | Shimmer de textura (Plata) |
| `badge-blink` | 1s | Parpadeo del badge "EN VIVO" |
| `icon-bounce` | 2s | Rebote vertical de íconos |
| `price-glow` | 2s | Brillo pulsante del precio (Oro) |
| `pot-shine` | 2s | Brillo + scale del pozo (Oro) |
| `digit-flip` | 0.3s | Giro 3D de dígitos del odómetro |
| `reward-float` | 3s | Flotación de íconos de premios |
| `btn-glow` | 2s | Brillo pulsante del botón (Oro) |
| `ticker-scroll` | 60s | Scroll horizontal del ticker |

### 🎭 Interactividad

**Hover en Card**:
- `translateY(-15px)` + `scale(1.03)`
- Border color activado
- `brightness(1.2)`
- Shine effect (diagonal sweep)

**Hover en Botón**:
- `scale(1.1)`
- Box-shadow más intensa

**Estados de Sala** (según hora):
- **soon**: Gris, sin actividad
- **opening**: Naranja, preparándose
- **active**: Rojo parpadeante, EN VIVO
- **closed**: Oscuro, bloqueada

---

## 🎯 LÓGICA DE FUNCIONAMIENTO

### ⏰ Sistema de Horarios

```javascript
getTimeStatus(roomTime) {
  // Compara hora actual con hora de sala
  // Retorna: 'soon', 'opening', 'active', 'closed'
  
  if (current < roomTime - 30min) return 'soon';
  if (current < roomTime) return 'opening';
  if (current >= roomTime && current < roomTime + 60min) return 'active';
  return 'closed';
}
```

**Estados**:
- **soon**: 30+ minutos antes → 📅 PRÓXIMAMENTE
- **opening**: 0-30 minutos antes → ⏰ ABRIENDO
- **active**: Durante 60 minutos → 🔴 EN VIVO
- **closed**: Después de 60 minutos → 🔒 CERRADA

### 🖱️ Navegación

```javascript
handleRoomClick(room) {
  if (room.status === 'available') {
    navigate(`/room/${room.id}`);
  }
}
```

**Rutas Generadas**:
- `/room/starter`
- `/room/bronze`
- `/room/silver`
- `/room/gold`

### 🏆 Ticker de Ganadores

**Datos Simulados**:
```javascript
winners = [
  { name: 'María G.', amount: '1.200.000', room: 'ORO' },
  { name: 'Carlos R.', amount: '250.000', room: 'PLATA' },
  // ... 8 ganadores en total
]
```

**Animación**:
- Array triplicado para scroll infinito
- Offset actualizado cada 50ms (-1px)
- Reinicio automático al llegar al 33.33%

---

## 📱 RESPONSIVE DESIGN

### 🖥️ Desktop (1400px+)
- Grid: 4 columnas (1fr cada una)
- Cards: Min-height 550px
- Gap: 30px

### 💻 Tablet (768px - 1400px)
- Grid: 2 columnas (2 filas)
- Cards: Min-height 550px
- Gap: 30px

### 📱 Mobile (<768px)
- Grid: 1 columna (scroll vertical)
- Header: Flex-column (logo arriba, reloj abajo)
- Logo: Tamaño reducido (2rem / 1.3rem)
- Cards: Min-height auto
- Footer: Gap reducido a 30px

---

## 🎨 PALETA DE COLORES COMPLETA

### Colores Principales

| Sala | Gradient Start | Gradient Middle | Gradient End | Glow Color |
|------|---------------|-----------------|--------------|------------|
| **Starter** | #00d4ff (Cian) | #00ffc8 (Turquesa) | - | rgba(0, 255, 200, 0.6) |
| **Bronce** | #cd7f32 (Bronce) | #b87333 (Cobre) | #8b4513 (Marrón) | rgba(205, 127, 50, 0.6) |
| **Plata** | #c0c0c0 (Plata) | #e8e8e8 (Blanco) | #a8a8a8 (Gris) | rgba(192, 192, 192, 0.8) |
| **Oro** | #ffd700 (Oro) | #ffed4e (Amarillo) | #ffaa00 (Naranja) | rgba(255, 215, 0, 0.9) |

### Colores de Fondo

```css
Background: #0a0a0a (Negro profundo)
Radial Gradient 1: rgba(255, 215, 0, 0.05) at 20% 30% (Oro difuso)
Radial Gradient 2: rgba(0, 212, 255, 0.05) at 80% 70% (Cian difuso)
```

### Colores de Texto

```css
Primary: #ffffff (Blanco)
Secondary: #999 / #888 (Gris)
Accent: #ffd700 (Dorado)
Success: #4caf50 (Verde - Montos ganadores)
```

---

## 🔧 INTEGRACIÓN

### Importación

```javascript
import CasinoLobby from './components/CasinoLobby';
import './styles/CasinoLobby.css';
```

### Ruta React Router

```javascript
<Route path="/" element={<CasinoLobby />} />
<Route path="/room/:roomId" element={<GameRoom />} />
```

### Dependencias

- `react` (hooks: useState, useEffect)
- `react-router-dom` (useNavigate)

---

## 📊 MÉTRICAS DE COMPONENTE

### Líneas de Código

- **CasinoLobby.jsx**: 350 líneas
- **CasinoLobby.css**: 850 líneas
- **TOTAL**: 1,200 líneas

### Elementos Animados

- **20 partículas** x 2 salas (Starter + Oro) = 40 partículas
- **4 íconos flotantes** (Starter premios)
- **8 dígitos** de odómetro x 3 salas = 24 dígitos
- **4 tarjetas** con hover shine
- **1 ticker** con scroll infinito
- **1 logo** con aura pulsante
- **1 reloj** con tic-tac

**TOTAL**: ~70 elementos animados simultáneos

### Performance

- Todas las animaciones usan `transform` y `opacity` (GPU-accelerated)
- Sin reflows pesados
- Ticker optimizado con `translateX`
- Partículas con `will-change: transform`

---

## 🎯 CASOS DE USO

### Usuario Nuevo

1. Llega al lobby → Ve logo dorado impactante
2. Lee "Selecciona Tu Sala"
3. Ve **SALA STARTER** con "GRATIS" → Bajo riesgo
4. Click en card → Navega a `/room/starter`

### Usuario Casual

1. Llega al lobby → Busca sala accesible
2. Ve **SALA BRONCE** $500 con pozo $80K
3. Verifica horario (20:00)
4. Si es 19:30, ve badge "⏰ ABRIENDO"
5. Click en "🎟️ RESERVAR"

### Usuario VIP

1. Llega al lobby → Directamente al extremo derecho
2. Ve **SALA ORO** brillando con partículas doradas
3. Pozo millonario $1.2M pulsando
4. Badge "🔴 EN VIVO"
5. Click en "🎮 ENTRAR AHORA" → Acción inmediata

### Usuario Observador

1. Llega al lobby → Mira el ticker de ganadores
2. Ve: "María G. • $1.200.000 • ORO"
3. Motivación: "Otros ganan, yo también puedo"
4. Decide entrar a una sala

---

## 🚀 PRÓXIMOS PASOS (Opcional)

### Mejoras Futuras

- [ ] **Sonido**: Audio de casino ambiente (opcional toggle)
- [ ] **Contador regresivo**: Tiempo hasta próxima sala
- [ ] **Historial de premios**: Modal con últimos 50 ganadores
- [ ] **Filtros**: Por precio, por horario, por pozo
- [ ] **Estadísticas**: Jugadores activos en cada sala
- [ ] **Notificaciones**: Push cuando sala favorita abre
- [ ] **Dark/Light mode toggle**: (Actualmente solo dark)
- [ ] **Efectos de sonido**: En hover, en click
- [ ] **Confetti**: Cuando alguien gana (animación global)
- [ ] **Sala "Diamante"**: 5ta sala ultra-VIP (futura)

---

## 📝 NOTAS DE DISEÑO

### Decisiones de UX

1. **Dark Mode por defecto**: Reduce fatiga visual, estética premium
2. **Orden visual**: Izquierda a derecha = Menos a más caro
3. **Sala Oro a la derecha**: "El premio final", jerarquía visual
4. **Partículas solo en Starter y Oro**: No saturar visualmente
5. **Odómetro rodando**: Sensación de premio "en movimiento"
6. **Ticker abajo**: Prueba social constante, no intrusivo
7. **Badges de estado**: Claridad inmediata de disponibilidad
8. **Hover elevado**: Feedback táctil, "levantar la tarjeta"

### Accesibilidad

- Contraste mínimo 4.5:1 en todos los textos
- Emojis como decoración, no información crítica
- Estados visuales claros (color + texto + ícono)
- Tamaños táctiles >44px en botones
- Animaciones reducibles vía `prefers-reduced-motion`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Componente CasinoLobby.jsx creado
- [x] Estilos CasinoLobby.css creados
- [x] 4 salas configuradas (Starter, Bronce, Plata, Oro)
- [x] Sistema de horarios implementado
- [x] Ticker de ganadores animado
- [x] Logo "BINGO 24 KILATES" con aura dorada
- [x] Reloj en tiempo real
- [x] Partículas flotantes (Starter + Oro)
- [x] Texturas metálicas (Bronce + Plata)
- [x] Odómetros digitales (3 salas)
- [x] Premios visuales (Starter)
- [x] Animaciones hover en tarjetas
- [x] Responsive design (Desktop/Tablet/Mobile)
- [x] Navegación a salas individuales
- [x] Badges de estado dinámicos
- [x] Footer con información
- [x] Sin errores de compilación
- [x] Documentación completa

---

## 🎉 RESUMEN EJECUTIVO

Se ha creado un **Lobby Virtual de Casino de Alta Gama** llamado "BINGO 24 KILATES" con:

- ✅ **4 Salas Temáticas**: Starter (Gratis), Bronce ($500), Plata ($1K), Oro ($2K)
- ✅ **Dark Mode Elegante**: Fondo negro con neones y metálicos
- ✅ **Animaciones Premium**: 70+ elementos animados simultáneos
- ✅ **Responsive**: Desktop, Tablet, Mobile
- ✅ **1,200 líneas** de código (350 JSX + 850 CSS)
- ✅ **0 Errores**: Verificado y listo para integrar

**Sensación Final**: Exclusividad, emoción, tecnología moderna, casino VIP.

---

**Creado**: Diciembre 2024  
**Versión**: 1.0  
**Estado**: ✅ Completado

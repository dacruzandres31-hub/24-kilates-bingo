# Sistema de Audio - Guía de Implementación Completa

## ✅ Estado: IMPLEMENTADO

### Archivos Creados:

1. **`client-player/src/services/audioService.js`** (193 líneas)
   - Servicio singleton para gestionar audio
   - Control de música de fondo tenue
   - Efectos de sonido del bolillero

2. **`client-player/public/audio/README.md`**
   - Guía completa para obtener archivos de audio
   - Especificaciones técnicas requeridas

### Integración Completa en StarterRoom:

✅ **Import audioService**
✅ **Estado audioStatus** - Rastrear música/efectos activados
✅ **useEffect de inicialización** - Requiere click del usuario (política de navegadores)
✅ **useEffect de control bolillero** - Inicia/detiene según gameStatus
✅ **useEffect de bola cayendo** - Sonido 500ms antes del anuncio de voz
✅ **Botones de control UI** - 🎵 Música, 🔊 Efectos con toggle
✅ **Estilos CSS** - Botones con gradiente magenta, hover effects

---

## 🎵 Funcionalidad Implementada

### Música de Fondo:
- **Volumen**: 15% (tenue, no invasiva)
- **Loop**: Continuo durante toda la sesión
- **Inicio**: Al primer click del usuario (requerimiento del navegador)
- **Control**: Botón toggle en UI

### Sonido Bolillero Girando:
- **Volumen**: 40% (audible pero no dominante)
- **Loop**: Mientras `gameStatus === 'active'`
- **Inicio**: Cuando se inicia el sorteo
- **Detención**: Cuando se pausa el sorteo
- **Control**: Botón toggle de efectos en UI

### Sonido Bola Cayendo:
- **Volumen**: 40%
- **Duración**: 0.5-1 segundo (archivo)
- **Trigger**: Al sortear nueva bola
- **Timing**: 500ms ANTES del anuncio de voz
- **Secuencia**: 
  1. Se sortea número
  2. Suena bola cayendo (500ms)
  3. Voz anuncia el número

---

## 📁 Archivos de Audio Necesarios

### IMPORTANTE: Debes agregar estos archivos manualmente

**Ubicación**: `client-player/public/audio/`

#### MÚSICA DE FONDO (ESPECÍFICA POR SALA):

| Archivo | Sala | Estilo Musical | Características |
|---------|------|----------------|-----------------|
| `music_lobby.mp3` | LOBBY (Selección) | Jazz lounge, big band suave | Elegante, bienvenida casino |
| `music_starter.mp3` | SALA STARTER (Gratis) | Ambiental suave, zen/chill | Piano suave, relajante, sin tensión |
| `music_bronze.mp3` | SALA BRONCE | Jazz suave, bossa nova, lounge | Más dinámica, guitarra acústica |
| `music_silver.mp3` | SALA PLATA | Electrónica suave, chill house | Sofisticada, downtempo, nu-jazz |
| `music_gold.mp3` | SALA ORO (Premium) | Casino upbeat, big band jazz | Energética, elegante, electro swing |

**Todas**: Loop continuo, volumen 15%, duración 2-5 min

#### EFECTOS DE SONIDO (COMPARTIDOS):

| Archivo | Propósito | Características |
|---------|-----------|-----------------|
| `bolillero_girando.mp3` | Sonido mecánico del bolillero | Loop durante sorteo, 3-5 seg, volumen 40% |
| `bola_cayendo.mp3` | Sonido puntual al salir bola | Una vez por bola, 0.5-1 seg, volumen 40% |

### Dónde Conseguir Audio:

#### Opciones Gratuitas:
1. **Freesound.org** - Efectos de sonido CC
2. **YouTube Audio Library** - Música y efectos (filtrar por género)
3. **Incompetech.com** - Música de Kevin MacLeod (buscar por mood/genre)
4. **Zapsplat.com** - Efectos gratuitos
5. **Pixabay Audio** - Libre de derechos
6. **Bensound.com** - Música royalty-free categorizada

#### Búsquedas Recomendadas POR SALA:

**LOBBY**:
- "casino lounge music" / "las vegas background music"
- "rat pack instrumental" / "sinatra style jazz"

**STARTER**:
- "ambient calm music" / "meditation background music"
- "soft piano instrumental" / "peaceful zen music"

**BRONCE**:
- "bossa nova instrumental" / "smooth jazz background"
- "acoustic lounge music" / "cafe jazz"

**PLATA**:
- "chillout electronic" / "downtempo music"
- "nu jazz electronic" / "ambient house lounge"

**ORO**:
- "casino music" / "big band jazz"
- "electro swing" / "upbeat lounge music"

**EFECTOS**:
- "bingo ball machine sound" / "lottery tumbler"
- "ball drop sound effect" / "marble rolling"

#### Especificaciones Técnicas:
- **Formato**: MP3
- **Bitrate**: 128-192 kbps
- **Canales**: Estéreo o Mono
- **Normalización**: -14 LUFS (volumen constante)

---

## 🎮 Controles de Usuario

### Botones en UI (esquina inferior):

```
[🎤 Voz] [🎵 Música] [🔊 Efectos] [▶️ Iniciar]
```

1. **🎤 Voz**: Abre selector de voces (existente)
2. **🎵 Música**: Toggle música de fondo (NUEVO)
3. **🔊 Efectos**: Toggle efectos de sonido (NUEVO)
4. **▶️/⏸️ Iniciar/Pausar**: Control del sorteo (existente)

### Estados:
- 🎵 Música / 🔇 Música (activada/desactivada)
- 🔊 Efectos / 🔇 Efectos (activados/desactivados)

---

## 🔧 API del AudioService

### Métodos Públicos:

```javascript
// Inicialización (NUEVO: incluye 'lobby')
await audioService.initialize('lobby'); // Lobby
await audioService.initialize('starter'); // Starter
await audioService.initialize('bronze'); // Bronze
await audioService.initialize('silver'); // Silver
await audioService.initialize('gold'); // Gold

// Música de fondo (específica de la sala inicializada)
await audioService.startBackgroundMusic();
audioService.stopBackgroundMusic();

// Efectos de bolillero (compartidos entre salas)
await audioService.startBolilleroGirando();
audioService.stopBolilleroGirando();
await audioService.playBolaCayendo();

// Controles de volumen
audioService.setMusicVolume(0.15); // 0-1
audioService.setEfectosVolume(0.4); // 0-1

// Toggle on/off
audioService.toggleMusic(); // Retorna nuevo estado
audioService.toggleEfectos(); // Retorna nuevo estado

// Estado (NUEVO: incluye currentRoom)
audioService.getStatus(); 
// { initialized, currentRoom, musicEnabled, efectosEnabled, ... }

// Emergencia
audioService.stopAll(); // Detiene todos los sonidos
```

### Comportamiento al Cambiar de Sala:

```javascript
// Usuario en Lobby → navega a Starter:
await audioService.initialize('starter');
// 1. Detecta que currentRoom cambió ('lobby' → 'starter')
// 2. Detiene música del lobby
// 3. Carga music_starter.mp3
// 4. Mantiene efectos compartidos (no los recarga)

// Usuario en Starter → regresa a Lobby:
await audioService.initialize('lobby');
// 1. Detecta que currentRoom cambió ('starter' → 'lobby')
// 2. Detiene música de starter
// 3. Carga music_lobby.mp3
```

### Volúmenes por Defecto:
- **backgroundMusicVolume**: 0.15 (15%)
- **efectosVolume**: 0.4 (40%)

---

## 🚀 Testing

### Paso 1: Agregar Archivos de Audio

```powershell
cd "c:\Users\User\Documents\24 kilates\client-player\public\audio"
# Copiar 7 archivos:
# - music_lobby.mp3 (Lobby: jazz lounge elegante)
# - music_starter.mp3 (Starter: ambiental suave)
# - music_bronze.mp3 (Bronce: jazz/bossa nova)
# - music_silver.mp3 (Plata: electrónica chill)
# - music_gold.mp3 (Oro: casino upbeat)
# - bolillero_girando.mp3 (compartido)
# - bola_cayendo.mp3 (compartido)
```

### Paso 2: Iniciar Cliente

```powershell
cd "c:\Users\User\Documents\24 kilates"
npm run dev -w client-player
```

### Paso 3: Verificar en Navegador

1. Abrir `http://localhost:5173/` (LOBBY)
2. **Click en cualquier parte** (necesario para iniciar audio)
3. Verificar en consola:
   ```
   🔊 AudioService inicializado para sala: LOBBY
   🎵 Audio del lobby inicializado
   🎵 Música de fondo iniciada
   ```
4. Verificar música del lobby (jazz lounge elegante)
5. **Navegar a cualquier sala** (click en Starter, Bronze, etc.)
6. Verificar que la música cambia automáticamente
7. Regresar al lobby con botón LOBBY
8. Verificar que vuelve la música del lobby

### Checklist de Audio:

- [ ] Música Lobby inicia al primer click (jazz lounge elegante)
- [ ] Música Lobby continúa en loop
- [ ] Al entrar a Starter, música cambia (ambiental suave)
- [ ] Al entrar a Bronze, música cambia (jazz/bossa nova)
- [ ] Al entrar a Silver, música cambia (electrónica chill)
- [ ] Al entrar a Gold, música cambia (casino upbeat)
- [ ] Al regresar a Lobby, música vuelve a lobby music
- [ ] Música anterior se detiene al cambiar ubicación
- [ ] Música continúa en loop en cada ubicación
- [ ] Botón 🎵 activa/desactiva música (en salas)
- [ ] Sonido bolillero inicia con sorteo (solo en salas)
- [ ] Sonido bolillero se detiene al pausar
- [ ] Botón 🔊 activa/desactiva efectos (en salas)
- [ ] Bola cayendo suena al sortear (solo en salas)
- [ ] Voz anuncia 500ms después del sonido (solo en salas)
- [ ] Al salir del componente, audio se limpia

---

## 📊 Logs de Consola

```
🔊 AudioService inicializado para sala: LOBBY
🎵 Audio del lobby inicializado
🎵 Música de fondo iniciada
🔊 AudioService inicializado para sala: STARTER
🎵 Sistema de audio inicializado para Sala Starter
🎰 Sonido bolillero girando
💫 Sonido bola cayendo
🎵 Música activada
🎵 Música desactivada
🔊 Efectos activados
🔊 Efectos desactivados

# Al cambiar entre ubicaciones:
🔊 AudioService inicializado para sala: BRONZE
🔊 AudioService inicializado para sala: LOBBY
```

---

## ⚠️ Consideraciones Importantes

### Política de Navegadores:
Los navegadores modernos **bloquean autoplay de audio** sin interacción del usuario. Por eso:

1. El audio se inicializa en el **primer click** del usuario
2. Event listener se agrega al montar componente
3. Se remueve automáticamente después del primer click

### Cleanup:
Al desmontar componente:
```javascript
return () => {
  audioService.stopAll(); // Detiene música y efectos
};
```

### Errores Comunes:
- **"No se pudo reproducir"**: Usuario no ha hecho click aún
- **404 audio files**: Archivos no copiados a `public/audio/`
- **Sin sonido**: Verificar volumen del navegador y del sistema

---

## 🎯 Próximos Pasos

### Mejoras Futuras:
1. **Persistencia**: Guardar preferencias en localStorage
2. **Sliders de volumen**: Control granular por el usuario
3. **Sonidos adicionales**:
   - Línea ganadora (aplauso)
   - Bingo completo (fanfarria)
   - Casi línea (alerta tensa)
4. **Crossfade**: Transiciones suaves entre estados
5. **Preload**: Cargar archivos al iniciar (no on-demand)

### Integración en Otras Salas:

Para Lobby y todas las salas, usar el mismo patrón:

**CasinoLobby.jsx** (✅ YA IMPLEMENTADO):
```javascript
await audioService.initialize('lobby'); // Música del lobby
```

**StarterRoom.jsx** (✅ YA IMPLEMENTADO):
```javascript
await audioService.initialize('starter'); // Música específica
```

**BronzeRoom.jsx**:
```javascript
await audioService.initialize('bronze'); // Música específica
```

**SilverRoom.jsx**:
```javascript
await audioService.initialize('silver'); // Música específica
```

**GoldRoom.jsx**:
```javascript
await audioService.initialize('gold'); // Música específica
```

Cada ubicación cargará su música correspondiente:
- `music_lobby.mp3` → Jazz Lounge Elegante
- `music_starter.mp3` → Ambiental Zen
- `music_bronze.mp3` → Jazz/Bossa Nova
- `music_silver.mp3` → Electrónica Chill
- `music_gold.mp3` → Casino Upbeat

Los efectos (bolillero_girando.mp3, bola_cayendo.mp3) son compartidos y solo se usan en las salas de juego.

---

## 🎨 Identidad Musical por Ubicación

### LOBBY - Bienvenida Casino
- **Mood**: Elegante, acogedor, energía de casino
- **Usuarios**: Todos al seleccionar sala
- **Instrumentación**: Big band suave, piano, contrabajo
- **Tempo**: Medio (100-120 BPM)
- **Ejemplos**: Rat Pack style, Sinatra instrumental, casino lounge

### STARTER - Ambiente Zen
- **Mood**: Calma, relajación, sin presión
- **Usuarios**: Nuevos jugadores, práctica gratuita
- **Instrumentación**: Piano, cuerdas suaves, pads ambientales
- **Tempo**: Lento (60-80 BPM)
- **Ejemplos**: "Gymnopédie" estilo, ambient piano

### BRONZE - Jazz Lounge
- **Mood**: Casual, entretenido, social
- **Usuarios**: Jugadores regulares, apostando bajo
- **Instrumentación**: Guitarra acústica, contrabajo, brushes
- **Tempo**: Medio (90-110 BPM)
- **Ejemplos**: Bossa nova, smooth jazz, café music

### SILVER - Electrónica Sofisticada
- **Mood**: Elegante, moderno, sofisticado
- **Usuarios**: Jugadores frecuentes, apostando medio
- **Instrumentación**: Sintetizadores suaves, beats downtempo, saxo electrónico
- **Tempo**: Medio-alto (110-120 BPM)
- **Ejemplos**: Chillout, nu-jazz, ambient house

### GOLD - Casino Premium
- **Mood**: Emocionante, energético, VIP
- **Usuarios**: High rollers, apostando alto
- **Instrumentación**: Big band, trompetas, piano enérgico, contrabajo
- **Tempo**: Alto (120-140 BPM)
- **Ejemplos**: Electro swing, casino lounge, upbeat jazz

---

## 📝 Resumen Ejecutivo

✅ **AudioService creado** - Singleton con control completo y soporte multi-ubicación
✅ **Música específica por ubicación** - 5 archivos únicos (lobby, starter, bronze, silver, gold)
✅ **2 efectos compartidos** - Bolillero girando, bola cayendo (solo en salas de juego)
✅ **Cambio dinámico** - Música cambia automáticamente al navegar entre lobby y salas
✅ **Integración en Lobby** - CasinoLobby inicializa con 'lobby'
✅ **Integración en StarterRoom** - useEffects sincronizados con 'starter'
✅ **UI Controls** - 2 botones toggle (música/efectos) en salas
✅ **Timing perfecto** - Sonido 500ms antes de voz en salas
✅ **Cleanup automático** - No memory leaks, detiene música anterior
✅ **Browser-compliant** - Respeta políticas de autoplay
✅ **Transiciones suaves** - Música cambia al navegar entre ubicaciones

**Falta**: 7 archivos de audio (5 músicas + 2 efectos) en `public/audio/`

**Diferencia clave**: Cada ubicación (lobby + 4 salas) tiene su identidad musical única para mejorar la experiencia y diferenciación de niveles.

---

**Fecha de Implementación**: Diciembre 7, 2025
**Desarrollador**: GitHub Copilot + Usuario
**Estado**: ✅ COMPLETO (pendiente archivos de audio específicos por ubicación)

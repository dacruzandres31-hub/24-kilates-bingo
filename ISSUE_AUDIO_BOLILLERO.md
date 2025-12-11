# Issue: Audio del Bolillero y Caída de Bola

## Problema Actual

### Síntomas
1. **Bolillero arranca después de la primera bola** (debería arrancar al inicio del sorteo)
2. **Sonido de caída de bola funciona "bola por medio"** (una sí, una no)

### Archivos Involucrados
- `client-player/src/components/StarterRoom.jsx` (líneas 240-300)
- `client-player/src/services/audioService.js` (líneas 145-280)
- Similar en BronzeRoom.jsx, SilverRoom.jsx, GoldRoom.jsx

### Código Actual Problemático

**StarterRoom.jsx:**
```javascript
// useEffect del sorteo (línea ~242)
useEffect(() => {
  if (gameStatus === 'active') {
    const drawTimer = setInterval(() => {
      // Genera bolas cada 5 segundos
      setCurrentBall(newBall);
      setTimeout(() => {
        setBallsDrawn(prev => [...prev, newBall]);
        setCurrentBall(null);
      }, 3000);
    }, 5000);
    return () => clearInterval(drawTimer);
  }
}, [gameStatus, ballsDrawn]); // ← ballsDrawn causa re-ejecución

// useEffect del audio bolillero (línea ~540)
useEffect(() => {
  if (gameStatus === 'active' && previousGameStatus !== 'active') {
    audioService.startBolilleroGirando(); // ← Se ejecuta tarde
  }
}, [gameStatus]);

// useEffect del sonido de bola (línea ~292)
useEffect(() => {
  if (currentBall) {
    audioService.playBolaCayendoConPausa(); // ← Funciona intermitente
  }
}, [currentBall]);
```

### Hipótesis del Error

1. **React StrictMode** causa doble ejecución en desarrollo
2. **Dependencia `ballsDrawn`** en el useEffect del sorteo causa re-creación del setInterval
3. **Timing race condition** entre el cambio de gameStatus y el inicio del intervalo
4. **Audio precarga** - el archivo no está listo cuando se llama play()

### Intentos de Solución (Fallidos)

#### Intento 1: Mover startBolilleroGirando() al useEffect del juego
- Resultado: Bolillero se reiniciaba cada vez que ballsDrawn cambiaba

#### Intento 2: Quitar ballsDrawn de dependencias
- Resultado: Sorteo generaba múltiples números por tirada

#### Intento 3: Usar estado funcional en setInterval
- Resultado: Lógica muy compleja, no resolvió el problema

#### Intento 4: Deshabilitar StrictMode
- Resultado: Mejoró parcialmente pero no resolvió completamente

#### Intento 5: Agregar retry automático en audioService
- Resultado: Más logging pero mismo problema

### Estado Actual del Código

- StrictMode: DESHABILITADO (main.jsx)
- Logs extendidos: ACTIVOS en audioService.js
- Código del sorteo: RESTAURADO a versión original
- Problema: PENDIENTE DE RESOLUCIÓN

### Próximos Pasos para Resolver

1. **Investigar useRef para el interval** - evitar re-creación
2. **Usar un flag de "bolillero iniciado"** - prevenir llamadas duplicadas
3. **Precargar audio con eventos loadeddata** - asegurar que está listo
4. **Separar lógica de sorteo del audio** - desacoplar responsabilidades
5. **Considerar Web Audio API** en lugar de HTMLAudioElement

### Workaround Temporal

El sistema funciona parcialmente:
- ✅ Sorteo genera números correctamente
- ⚠️ Bolillero arranca con 1 bola de delay
- ⚠️ Sonido de caída intermitente
- ✅ Voz anuncia números correctamente

---

**Fecha:** 2025-12-10  
**Estado:** PENDIENTE - Prioridad MEDIA  
**Impacto:** UX - No bloquea funcionalidad core

/**
 * UI Sound Service - Efectos de sonido para interacciones de UI
 * 
 * Proporciona sonidos sutiles para botones, selecciones y acciones del usuario
 * para mejorar la retroalimentación háptica auditiva
 */

class UISoundService {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.15; // Volumen muy sutil (15%)
    
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      // Crear contexto de audio (Web Audio API)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[UISoundService] AudioContext inicializado');
    } catch (error) {
      console.error('[UISoundService] Error inicializando AudioContext:', error);
    }
  }

  /**
   * Generar y reproducir sonido de clic sintético
   * Sonido muy sutil y rápido (tipo Material Design)
   */
  playClick() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const now = this.audioContext.currentTime;
      
      // Crear oscilador (generador de tono)
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Conectar oscilador → ganancia → salida
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Configurar tono (frecuencia alta para sonido sutil)
      oscillator.frequency.setValueAtTime(1200, now); // 1.2 kHz
      oscillator.type = 'sine'; // Onda sinusoidal suave
      
      // Envolvente de volumen (attack-decay rápido)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01); // Attack: 10ms
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08); // Decay: 80ms
      
      // Reproducir
      oscillator.start(now);
      oscillator.stop(now + 0.1); // Duración total: 100ms
      
      // Limpiar después
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('[UISoundService] Error en playClick:', error);
    }
  }

  /**
   * Sonido de hover (más sutil que el clic)
   */
  playHover() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const now = this.audioContext.currentTime;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, now); // Más grave que el clic
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      oscillator.start(now);
      oscillator.stop(now + 0.06);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('[UISoundService] Error en playHover:', error);
    }
  }

  /**
   * Activar/desactivar sonidos UI
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Establecer volumen (0.0 a 1.0)
   */
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
  }

  /**
   * Verificar si los sonidos están habilitados
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Reanudar AudioContext si está suspendido (necesario después de user gesture)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Exportar instancia singleton
const uiSoundService = new UISoundService();
export default uiSoundService;

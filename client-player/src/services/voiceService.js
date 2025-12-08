/**
 * Servicio de Voz para Anuncios del Bingo
 * Utiliza la API de Speech Synthesis del navegador
 */

class VoiceService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.enabled = true;
    this.volume = 1.0; // Volumen aumentado para mayor claridad
    this.rate = 1.0;
    this.pitch = 1.1;
    
    // Inicializar voz femenina
    this.initVoice();
  }

  /**
   * Inicializar y seleccionar voz femenina en español
   */
  initVoice() {
    const setVoice = () => {
      const voices = this.synth.getVoices();
      
      // Prioridad: Voces femeninas en español (Argentina, México, España)
      const preferredNames = [
        'Helena', 'Sabina', 'Paulina', 'Monica', 'Lupe', 'Penelope'
      ];

      // Buscar voz preferida
      for (const preferred of preferredNames) {
        const voice = voices.find(v => 
          v.name.includes(preferred) && 
          (v.lang.startsWith('es') || v.lang.startsWith('sp'))
        );
        if (voice) {
          this.voice = voice;
          console.log('🎤 Voz seleccionada:', voice.name, '-', voice.lang);
          return;
        }
      }

      // Buscar voces femeninas en español (prioridad)
      const femaleSpanishVoices = voices.filter(voice => 
        (voice.lang.startsWith('es') || voice.lang.startsWith('sp')) &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('mujer') ||
         voice.name.toLowerCase().includes('woman'))
      );

      if (femaleSpanishVoices.length > 0) {
        this.voice = femaleSpanishVoices[0];
      } else {
        // Fallback: cualquier voz en español
        const spanishVoices = voices.filter(voice => 
          voice.lang.startsWith('es') || voice.lang.startsWith('sp')
        );
        this.voice = spanishVoices[0] || voices[0];
      }

      console.log('🎤 Voz seleccionada:', this.voice?.name, '-', this.voice?.lang);
    };

    // Cargar voces (puede tardar un momento)
    if (this.synth.getVoices().length > 0) {
      setVoice();
    }
    this.synth.addEventListener('voiceschanged', setVoice);
  }

  /**
   * Hablar un texto
   * @param {string} text - Texto a pronunciar
   * @param {Object} options - Opciones de voz
   */
  speak(text, options = {}) {
    if (!this.enabled || !this.synth) return;

    // Cancelar cualquier anuncio anterior
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.volume = options.volume || this.volume;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    utterance.lang = 'es-ES';

    utterance.onerror = (event) => {
      console.error('❌ Error en síntesis de voz:', event.error);
    };

    this.synth.speak(utterance);
  }

  /**
   * Anunciar inicio del sorteo
   */
  announceSorteoIniciado() {
    this.speak('Sorteo iniciado', { rate: 1.0, pitch: 1.2 });
  }

  /**
   * Anunciar número cantado
   * @param {number} number - Número cantado
   */
  announceNumber(number) {
    this.speak(number.toString(), { rate: 0.95, pitch: 1.1 });
  }

  /**
   * Anunciar pausa del sorteo
   */
  announceSorteoPausado() {
    this.speak('Sorteo pausado', { rate: 0.9, pitch: 1.15 });
  }

  /**
   * Anunciar reinicio del sorteo
   */
  announceSorteoReiniciado() {
    this.speak('Sorteo reiniciado', { rate: 1.0, pitch: 1.2 });
  }

  /**
   * Anunciar línea ganadora
   */
  announceLinea() {
    this.speak('¡Línea!', { rate: 0.85, pitch: 1.3, volume: 1.0 });
  }

  /**
   * Anunciar bingo ganador
   */
  announceBingo() {
    this.speak('¡Bingo!', { rate: 0.8, pitch: 1.4, volume: 1.0 });
  }

  /**
   * Detener cualquier anuncio en curso
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Activar/desactivar voz
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Ajustar volumen
   * @param {number} volume - Volumen entre 0 y 1
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Ajustar velocidad
   * @param {number} rate - Velocidad entre 0.1 y 10
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Obtener todas las voces en español disponibles
   * @returns {Array} Lista de voces en español
   */
  getSpanishVoices() {
    const voices = this.synth.getVoices();
    return voices.filter(voice => 
      voice.lang.startsWith('es') || voice.lang.startsWith('sp')
    );
  }

  /**
   * Cambiar a una voz específica
   * @param {SpeechSynthesisVoice} voice - Voz a usar
   */
  setVoice(voice) {
    this.voice = voice;
    console.log('🎬 Voz cambiada a:', voice.name, '-', voice.lang);
  }

  /**
   * Obtener la voz actual
   * @returns {SpeechSynthesisVoice} Voz actual
   */
  getCurrentVoice() {
    return this.voice;
  }
}

// Instancia singleton
const voiceService = new VoiceService();

export default voiceService;

/**
 * AudioService - Servicio singleton para gestionar música de fondo y efectos de sonido
 * Maneja música ambiente tenue (específica por sala) y sonidos del bolillero
 */

class AudioService {
  constructor() {
    // Música de fondo (específica por sala)
    this.backgroundMusic = null;
    this.backgroundMusicVolume = 0.15; // Volumen tenue (15%)
    this.currentRoom = null; // Sala actual
    
    // Efectos de sonido del bolillero (compartidos)
    this.bolilleroGirando = null;
    this.bolaCayendo = null;
    this.efectosVolume = 0.4; // Volumen efectos (40%)
    
    // Control general
    this.musicEnabled = true;
    this.efectosEnabled = true;
    this.initialized = false;
  }

  /**
   * Inicializa todos los elementos de audio para una sala específica
   * @param {string} roomType - Tipo de sala: 'lobby', 'starter', 'bronze', 'silver', 'gold'
   */
  async initialize(roomType = 'starter') {
    // Si ya está inicializado y es la misma sala, no hacer nada
    if (this.initialized && this.currentRoom === roomType) return;

    // Si cambia de sala, detener música actual
    if (this.initialized && this.currentRoom !== roomType) {
      this.stopBackgroundMusic();
    }

    try {
      // Música de fondo ESPECÍFICA de la sala/lobby
      const musicFiles = {
        lobby: '/audio/music_lobby.mp3',
        starter: '/audio/music_starter.mp3',
        bronze: '/audio/music_bronze.mp3',
        silver: '/audio/music_silver.mp3',
        gold: '/audio/music_gold.mp3'
      };

      this.backgroundMusic = new Audio(musicFiles[roomType] || musicFiles.starter);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.backgroundMusicVolume;
      this.currentRoom = roomType;

      // Sonido bolillero girando - COMPARTIDO entre todas las salas
      if (!this.bolilleroGirando) {
        this.bolilleroGirando = new Audio('/audio/bolillero_girando.mp3');
        this.bolilleroGirando.loop = true;
        this.bolilleroGirando.volume = this.efectosVolume;
      }

      // Sonido bola cayendo - COMPARTIDO entre todas las salas
      if (!this.bolaCayendo) {
        this.bolaCayendo = new Audio('/audio/bola_cayendo.mp3');
        this.bolaCayendo.volume = this.efectosVolume;
      }

      this.initialized = true;
      console.log(`🔊 AudioService inicializado para sala: ${roomType.toUpperCase()}`);
    } catch (error) {
      console.error('Error al inicializar AudioService:', error);
    }
  }

  /**
   * Inicia la música de fondo
   */
  async startBackgroundMusic() {
    if (!this.initialized) await this.initialize();
    
    if (this.backgroundMusic && this.musicEnabled) {
      try {
        await this.backgroundMusic.play();
        console.log('🎵 Música de fondo iniciada');
      } catch (error) {
        console.warn('No se pudo reproducir música de fondo:', error.message);
      }
    }
  }

  /**
   * Detiene la música de fondo
   */
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  /**
   * Inicia el sonido del bolillero girando
   */
  async startBolilleroGirando() {
    if (!this.initialized) await this.initialize();
    
    if (this.bolilleroGirando && this.efectosEnabled) {
      try {
        this.bolilleroGirando.currentTime = 0;
        await this.bolilleroGirando.play();
        console.log('🎰 Sonido bolillero girando');
      } catch (error) {
        console.warn('No se pudo reproducir bolillero girando:', error.message);
      }
    }
  }

  /**
   * Detiene el sonido del bolillero girando
   */
  stopBolilleroGirando() {
    if (this.bolilleroGirando) {
      this.bolilleroGirando.pause();
      this.bolilleroGirando.currentTime = 0;
    }
  }

  /**
   * Reproduce sonido de bola cayendo (antes de anunciar número)
   */
  async playBolaCayendo() {
    if (!this.initialized) await this.initialize();
    
    if (this.bolaCayendo && this.efectosEnabled) {
      try {
        this.bolaCayendo.currentTime = 0;
        await this.bolaCayendo.play();
        console.log('💫 Sonido bola cayendo');
      } catch (error) {
        console.warn('No se pudo reproducir bola cayendo:', error.message);
      }
    }
  }

  /**
   * Ajusta volumen de música de fondo
   * @param {number} volume - Valor entre 0 y 1
   */
  setMusicVolume(volume) {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.backgroundMusicVolume;
    }
  }

  /**
   * Ajusta volumen de efectos de sonido
   * @param {number} volume - Valor entre 0 y 1
   */
  setEfectosVolume(volume) {
    this.efectosVolume = Math.max(0, Math.min(1, volume));
    if (this.bolilleroGirando) {
      this.bolilleroGirando.volume = this.efectosVolume;
    }
    if (this.bolaCayendo) {
      this.bolaCayendo.volume = this.efectosVolume;
    }
  }

  /**
   * Activa/desactiva música de fondo
   */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    
    if (this.musicEnabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
    
    return this.musicEnabled;
  }

  /**
   * Activa/desactiva efectos de sonido
   */
  toggleEfectos() {
    this.efectosEnabled = !this.efectosEnabled;
    
    if (!this.efectosEnabled) {
      this.stopBolilleroGirando();
    }
    
    return this.efectosEnabled;
  }

  /**
   * Detiene todos los sonidos
   */
  stopAll() {
    this.stopBackgroundMusic();
    this.stopBolilleroGirando();
  }

  /**
   * Obtiene estado actual del audio
   */
  getStatus() {
    return {
      initialized: this.initialized,
      currentRoom: this.currentRoom,
      musicEnabled: this.musicEnabled,
      efectosEnabled: this.efectosEnabled,
      musicVolume: this.backgroundMusicVolume,
      efectosVolume: this.efectosVolume,
      musicPlaying: this.backgroundMusic && !this.backgroundMusic.paused,
      bolilleroPlaying: this.bolilleroGirando && !this.bolilleroGirando.paused
    };
  }
}

// Exportar instancia única (singleton)
const audioService = new AudioService();
export default audioService;

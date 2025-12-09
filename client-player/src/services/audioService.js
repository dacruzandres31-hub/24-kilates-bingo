/**
 * AudioService - Servicio singleton SIMPLIFICADO
 * Solo maneja música de fondo por sala con precarga
 */

class AudioService {
  constructor() {
    this.currentAudio = null;
    this.currentRoom = null;
    this.volume = 0.15;
    this.enabled = true;
    this.audioCache = {}; // Cache de audios precargados
    
    // Precargar audios en el constructor
    this.preloadAudios();
  }

  /**
   * Precarga todos los archivos de audio
   */
  preloadAudios() {
    const musicPaths = {
      lobby: '/audio/music_lobby.mp3',
      starter: '/audio/music_starter.mp3',
      bronze: '/audio/music_bronze.mp3',
      silver: '/audio/music_silver.mp3',
      gold: '/audio/music_gold.mp3'
    };

    Object.entries(musicPaths).forEach(([room, path]) => {
      const audio = new Audio(path);
      audio.loop = true;
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.audioCache[room] = audio;
      console.log(`🔄 Precargando: ${room}`);
    });
  }

  /**
   * Cambia la música a una sala específica
   */
  async playForRoom(roomType) {
    console.log(`🎵 playForRoom llamado: ${roomType}`);
    
    // Si ya está sonando esta sala, no hacer nada
    if (this.currentRoom === roomType && this.currentAudio && !this.currentAudio.paused) {
      console.log(`✅ Ya está sonando ${roomType}`);
      return;
    }

    // Detener música anterior si existe
    if (this.currentAudio) {
      console.log(`🔇 Deteniendo: ${this.currentRoom}`);
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    // Obtener audio del cache
    const audio = this.audioCache[roomType];
    if (!audio) {
      console.error(`❌ No existe música para: ${roomType}`);
      return;
    }

    try {
      this.currentAudio = audio;
      this.currentRoom = roomType;
      this.currentAudio.currentTime = 0; // Reiniciar desde el inicio
      
      await this.currentAudio.play();
      console.log(`🎶 Reproduciendo: ${roomType}`);
    } catch (error) {
      console.error(`❌ Error reproduciendo ${roomType}:`, error.message);
    }
  }

  /**
   * Detiene toda la música
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.currentRoom = null;
    }
  }

  /**
   * Legacy methods para compatibilidad
   */
  async initialize(roomType) {
    await this.playForRoom(roomType);
  }

  async startBackgroundMusic() {
    // No hacer nada - playForRoom ya reproduce
  }

  stopBackgroundMusic() {
    this.stop();
  }

  stopAll() {
    this.stop();
  }

  startBolilleroGirando() {
    // Deshabilitado temporalmente
  }

  stopBolilleroGirando() {
    // Deshabilitado temporalmente
  }

  playBolaCayendo() {
    // Deshabilitado temporalmente
  }

  toggleMusica() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.currentAudio) {
      this.currentAudio.pause();
    }
    return this.enabled;
  }

  toggleEfectos() {
    return true;
  }

  getStatus() {
    return {
      initialized: true,
      currentRoom: this.currentRoom,
      musicEnabled: this.enabled,
      musicPlaying: this.currentAudio && !this.currentAudio.paused
    };
  }
}

// Exportar instancia única (singleton)
const audioService = new AudioService();
export default audioService;

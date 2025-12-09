/**
 * AudioService - Servicio singleton SIMPLIFICADO
 * Solo maneja música de fondo por sala
 */

class AudioService {
  constructor() {
    this.currentAudio = null;
    this.currentRoom = null;
    this.volume = 0.15;
    this.enabled = true;
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
      this.currentAudio = null;
    }

    // Cargar y reproducir nueva música
    const musicPaths = {
      lobby: '/audio/music_lobby.mp3',
      starter: '/audio/music_starter.mp3',
      bronze: '/audio/music_bronze.mp3',
      silver: '/audio/music_silver.mp3',
      gold: '/audio/music_gold.mp3'
    };

    const path = musicPaths[roomType];
    if (!path) {
      console.error(`❌ No existe música para: ${roomType}`);
      return;
    }

    try {
      console.log(`📂 Cargando: ${path}`);
      this.currentAudio = new Audio(path);
      this.currentAudio.loop = true;
      this.currentAudio.volume = this.volume;
      this.currentRoom = roomType;

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

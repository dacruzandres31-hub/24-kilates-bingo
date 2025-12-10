/**
 * AudioService - Servicio singleton SIMPLIFICADO
 * Solo maneja música de fondo por sala con precarga
 */

class AudioService {
  constructor() {
    this.currentAudio = null;
    this.currentRoom = null;
    this.volume = 0.15;
    this.normalVolume = 0.15; // Volumen normal
    this.lowerVolume = 0.105; // 30% menos (0.15 * 0.7 = 0.105)
    this.enabled = true;
    this.audioCache = {}; // Cache de audios precargados
    this.isDrawing = false; // Estado del sorteo
    
    // Efectos de sonido
    this.efectosEnabled = true;
    this.bolillerAudio = null;
    this.bolaAudio = null;
    
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
    
    // Precargar efectos de sonido
    this.bolillerAudio = new Audio('/audio/bolillero_girando.mp3');
    this.bolillerAudio.loop = true;
    this.bolillerAudio.volume = 0.3;
    this.bolillerAudio.preload = 'auto';
    
    this.bolaAudio = new Audio('/audio/bola_cayendo.mp3');
    this.bolaAudio.volume = 0.5;
    this.bolaAudio.preload = 'auto';
    
    console.log('🔊 Efectos de sonido precargados');
  }

  /**
   * Cambia la música a una sala específica
   */
  async playForRoom(roomType) {
    console.log(`🎵 playForRoom llamado: ${roomType}`);
    
    // Si la música está desactivada, no reproducir
    if (!this.enabled) {
      console.log('🔇 Música desactivada, no se reproduce');
      this.currentRoom = roomType; // Guardar sala para cuando se reactive
      return;
    }
    
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
      
      // Aplicar el volumen correcto según el estado
      if (this.isDrawing) {
        this.currentAudio.volume = this.lowerVolume;
        console.log(`🔉 Aplicando volumen reducido: ${this.lowerVolume}`);
      } else {
        this.currentAudio.volume = this.normalVolume;
        console.log(`🔊 Aplicando volumen normal: ${this.normalVolume}`);
      }
      
      await this.currentAudio.play();
      console.log(`🎶 Reproduciendo: ${roomType} (volumen: ${this.currentAudio.volume})`);
    } catch (error) {
      console.error(`❌ Error reproduciendo ${roomType}:`, error.message);
      throw error; // Re-lanzar para que el caller pueda manejar
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
    if (!this.efectosEnabled || !this.bolillerAudio) {
      console.warn('⚠️ Bolillero no disponible o efectos desactivados');
      return;
    }
    
    try {
      // Reiniciar inmediatamente sin esperar
      this.bolillerAudio.currentTime = 0;
      
      // Intentar reproducir sin await para ejecución inmediata
      const playPromise = this.bolillerAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎰 Bolillero girando iniciado exitosamente');
          })
          .catch(err => {
            console.warn('⚠️ No se pudo reproducir bolillero:', err.message);
          });
      }
    } catch (error) {
      console.error('❌ Error iniciando bolillero:', error.message);
    }
  }

  stopBolilleroGirando() {
    if (!this.bolillerAudio) return;
    
    try {
      this.bolillerAudio.pause();
      this.bolillerAudio.currentTime = 0;
      console.log('🛑 Bolillero girando detenido');
    } catch (error) {
      console.error('❌ Error deteniendo bolillero:', error.message);
    }
  }

  playBolaCayendo() {
    if (!this.efectosEnabled || !this.bolaAudio) {
      console.warn('⚠️ Efecto bola no disponible o efectos desactivados');
      return;
    }
    
    try {
      // Reiniciar desde el inicio para reproducción inmediata
      // No clonar - es más rápido reiniciar el mismo audio
      this.bolaAudio.currentTime = 0;
      
      // Reproducir inmediatamente sin await
      const playPromise = this.bolaAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Silencioso en éxito para no saturar logs
          })
          .catch(err => {
            console.warn('⚠️ No se pudo reproducir bola cayendo:', err.message);
          });
      }
    } catch (error) {
      console.error('❌ Error reproduciendo bola cayendo:', error.message);
    }
  }

  toggleMusic() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.currentAudio) {
      this.currentAudio.pause();
      console.log('🔇 Música desactivada');
    } else if (this.enabled && this.currentAudio) {
      this.currentAudio.play().catch(err => {
        console.warn('⚠️ No se pudo reanudar música:', err.message);
      });
      console.log('🎵 Música activada');
    }
    return this.enabled;
  }
  
  toggleEfectos() {
    this.efectosEnabled = !this.efectosEnabled;
    if (!this.efectosEnabled) {
      this.stopBolilleroGirando();
    }
    console.log(`🔊 Efectos: ${this.efectosEnabled ? 'ON' : 'OFF'}`);
    return this.efectosEnabled;
  }

  /**
   * Baja el volumen de la música al 70% cuando comienza el sorteo
   */
  lowerMusicVolume() {
    console.log(`🔉 [lowerMusicVolume] Llamado - currentAudio existe: ${!!this.currentAudio}, está reproduciendo: ${this.currentAudio && !this.currentAudio.paused}`);
    
    if (this.currentAudio) {
      this.isDrawing = true;
      const oldVolume = this.currentAudio.volume;
      this.currentAudio.volume = this.lowerVolume;
      console.log(`🔉 Volumen de música bajado de ${oldVolume} a ${this.currentAudio.volume} (70% del normal: ${this.normalVolume})`);
    } else {
      console.warn('⚠️ No se puede bajar volumen: no hay audio reproduciéndose');
    }
  }

  /**
   * Restaura el volumen de la música al 100% cuando termina el sorteo
   */
  restoreMusicVolume() {
    console.log(`🔊 [restoreMusicVolume] Llamado - currentAudio existe: ${!!this.currentAudio}, está reproduciendo: ${this.currentAudio && !this.currentAudio.paused}`);
    
    if (this.currentAudio) {
      this.isDrawing = false;
      const oldVolume = this.currentAudio.volume;
      this.currentAudio.volume = this.normalVolume;
      console.log(`🔊 Volumen de música restaurado de ${oldVolume} a ${this.currentAudio.volume} (100% normal: ${this.normalVolume})`);
    } else {
      console.warn('⚠️ No se puede restaurar volumen: no hay audio reproduciéndose');
    }
  }

  getStatus() {
    return {
      initialized: true,
      currentRoom: this.currentRoom,
      musicEnabled: this.enabled,
      musicPlaying: this.currentAudio && !this.currentAudio.paused,
      efectosEnabled: this.efectosEnabled,
      bolilleroPlaying: this.bolillerAudio && !this.bolillerAudio.paused,
      isDrawing: this.isDrawing,
      currentVolume: this.currentAudio ? this.currentAudio.volume : 0
    };
  }
}

// Exportar instancia única (singleton)
const audioService = new AudioService();
export default audioService;

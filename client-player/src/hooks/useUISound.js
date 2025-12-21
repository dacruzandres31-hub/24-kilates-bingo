import { useCallback } from 'react';
import uiSoundService from '../services/uiSoundService';

/**
 * Hook para agregar sonido de clic a cualquier elemento
 * 
 * Uso:
 * const handleClickWithSound = useUISound(handleClick);
 * <button onClick={handleClickWithSound}>Click Me</button>
 */
export function useUISound(callback) {
  return useCallback((...args) => {
    uiSoundService.playClick();
    if (callback) {
      callback(...args);
    }
  }, [callback]);
}

export default useUISound;

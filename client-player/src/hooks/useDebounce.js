import { useRef, useEffect } from 'react';

/**
 * useDebounce - Hook para debouncing de valores
 * Útil para evitar actualizaciones excesivas en WebSocket events
 * 
 * @param {any} value - Valor a debounce
 * @param {number} delay - Delay en milisegundos
 * @returns {any} - Valor debounced
 */
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback - Hook para debouncing de funciones
 * Útil para handlers que se llaman frecuentemente
 * 
 * @param {Function} callback - Función a debounce
 * @param {number} delay - Delay en milisegundos
 * @param {Array} deps - Dependencias
 * @returns {Function} - Función debounced
 */
export function useDebouncedCallback(callback, delay, deps = []) {
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const debouncedCallback = React.useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay, ...deps]);

    return debouncedCallback;
}

/**
 * useAdaptiveDebounce - Debounce adaptativo basado en cantidad de items
 * Delay más corto para pocos items, más largo para muchos
 * 
 * @param {number} itemCount - Cantidad de items
 * @returns {number} - Delay adaptativo en ms
 */
export function useAdaptiveDebounce(itemCount) {
    if (itemCount <= 10) return 100;  // Rápido para pocos cartones
    if (itemCount <= 25) return 300;  // Medio para cantidad moderada
    if (itemCount <= 50) return 500;  // Más lento para muchos
    return 800;                        // Muy lento para cantidad masiva
}

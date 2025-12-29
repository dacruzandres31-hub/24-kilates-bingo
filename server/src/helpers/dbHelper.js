const pool = require('../db');

/**
 * Helper para interacción segura con la Base de Datos
 */
const dbHelper = {
    /**
     * Ejecuta una consulta SQL con parámetros de forma segura y manejo de errores centralizado.
     * @param {string} sql - La consulta SQL (ej: 'SELECT * FROM users WHERE id = ?')
     * @param {Array} params - Arreglo de parámetros para la consulta
     * @param {string} context - Descripción del contexto para logs de error (ej: 'GetUserById')
     * @returns {Promise<Array|Object>} Resultado de la consulta
     */
    query: async (sql, params = [], context = 'DB_QUERY') => {
        try {
            // Medir tiempo de ejecución (útil para detectar queries lentas)
            const start = Date.now();

            const [results] = await pool.execute(sql, params);

            const duration = Date.now() - start;
            if (duration > 1000) {
                console.warn(`⚠️ Slow Query [${context}]: ${duration}ms`, { sql, params });
            }

            return results;
        } catch (error) {
            console.error(`❌ DB Error [${context}]:`, error.message, { sql, params });
            // Relanzar error para que lo maneje el controlador, pero con más contexto
            throw new Error(`Database Error in ${context}: ${error.message}`);
        }
    },

    /**
     * Ejecuta una consulta que se espera retorne una sola fila.
     * @param {string} sql 
     * @param {Array} params 
     * @param {string} context 
     * @returns {Promise<Object|null>} El primer registro encontrado o null
     */
    queryOne: async (sql, params = [], context = 'DB_QUERY_ONE') => {
        const results = await dbHelper.query(sql, params, context);
        return results.length > 0 ? results[0] : null;
    },

    /**
     * Ejecuta una transacción completa (commit si todo ok, rollback si error).
     * @param {Function} callback - Función asíncrona que recibe la conexión. Retornar lo que se quiera devolver.
     * @returns {Promise<any>} Lo que retorne el callback.
     */
    transaction: async (callback) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            console.error('❌ Transaction Rolled Back:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = dbHelper;

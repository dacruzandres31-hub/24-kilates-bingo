/**
 * Helper para estandarizar las respuestas de la API
 */
const responseHelper = {
    /**
     * Envía una respuesta exitosa (HTTP 200).
     * @param {Object} res - Objeto response de Express
     * @param {Object|Array} data - Datos a enviar
     * @param {string} message - Mensaje opcional
     */
    success: (res, data = {}, message = 'Success') => {
        return res.status(200).json({
            success: true,
            message,
            data
        });
    },

    /**
     * Envía una respuesta de creación exitosa (HTTP 201).
     * @param {Object} res 
     * @param {Object|Array} data 
     * @param {string} message 
     */
    created: (res, data = {}, message = 'Resource created successfully') => {
        return res.status(201).json({
            success: true,
            message,
            data
        });
    },

    /**
     * Envía una respuesta de error (HTTP 400, 500, etc).
     * @param {Object} res - Objeto response de Express
     * @param {number} statusCode - Código HTTP de error (default 500)
     * @param {string} message - Mensaje de error para el cliente
     * @param {string|Object} details - Detalles técnicos (opcional, útil para debugging)
     */
    error: (res, statusCode = 500, message = 'Internal Server Error', details = null) => {
        const response = {
            success: false,
            error: message
        };

        if (details && process.env.NODE_ENV !== 'production') {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    },

    /**
     * Envía error de "Recurso no encontrado" (HTTP 404).
     * @param {Object} res 
     * @param {string} message 
     */
    notFound: (res, message = 'Resource not found') => {
        return responseHelper.error(res, 404, message);
    },

    /**
     * Envía error de "No autorizado" (HTTP 401).
     * @param {Object} res 
     * @param {string} message 
     */
    unauthorized: (res, message = 'Unauthorized') => {
        return responseHelper.error(res, 401, message);
    }
};

module.exports = responseHelper;

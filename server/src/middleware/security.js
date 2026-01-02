const rateLimit = require('express-rate-limit');

/**
 * GLOBAL LIMITER
 * Protects the entire API from general abuse (e.g., bot scraping)
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Demasiadas peticiones. Por favor, intenta de nuevo más tarde.'
    }
});

/**
 * AUTH LIMITER
 * Strict limit for login and register to prevent brute force
 */
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Demasiados intentos de acceso. Tu IP ha sido bloqueada por una hora.'
    },
    skipSuccessfulRequests: true // Don't count successful logins against the limit
});

/**
 * PAYMENT LIMITER
 * Limit deposit and withdrawal requests to prevent transaction spam
 */
const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 payment requests per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Límite de solicitudes de pago alcanzado. Por favor espera unos minutos.'
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    paymentLimiter
};

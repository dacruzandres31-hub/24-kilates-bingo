/**
 * SECURITY MIDDLEWARE - Rate Limiting y Seguridad
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// Cliente Redis (opcional, fallback a memoria)
let redisClient;
if (process.env.REDIS_HOST) {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  });
}

/**
 * Rate limiter general - 100 requests por 15 min
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas solicitudes, por favor intenta más tarde',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({ client: redisClient }) : undefined
});

/**
 * Rate limiter para autenticación - 5 intentos por 15 min
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Demasiados intentos de login. Cuenta temporalmente bloqueada.',
    retryAfter: '15 minutos'
  }
});

/**
 * Rate limiter para pagos - 10 transacciones por hora
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Límite de transacciones alcanzado. Intenta en 1 hora.',
    retryAfter: '1 hora'
  }
});

/**
 * Rate limiter estricto para APIs sensibles - 20 por hora
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Límite de solicitudes excedido',
    retryAfter: '1 hora'
  }
});

/**
 * Validar input para prevenir XSS
 */
function sanitizeInput(req, res, next) {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remover tags HTML básicos
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
}

/**
 * Middleware para detectar requests sospechosos
 */
function detectSuspiciousActivity(req, res, next) {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection patterns
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i, // XSS patterns
    /\.\.\//i, // Directory traversal
    /union.*select/i, // SQL injection
    /script.*>/i // XSS
  ];

  const checkString = `${req.url}${JSON.stringify(req.body)}${JSON.stringify(req.query)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn(`⚠️ Suspicious activity detected from IP ${req.ip}:`, checkString.substring(0, 100));
      return res.status(403).json({
        error: 'Request bloqueado por actividad sospechosa'
      });
    }
  }

  next();
}

/**
 * Middleware para logs de seguridad
 */
function securityLogger(req, res, next) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id
  };

  // Log de operaciones sensibles
  const sensitivePaths = ['/api/auth/login', '/api/finance/withdraw', '/api/admin'];
  if (sensitivePaths.some(path => req.path.includes(path))) {
    console.log('🔒 [Security Log]:', JSON.stringify(logData));
  }

  next();
}

/**
 * Verificar IP bloqueada
 */
async function checkBlockedIP(req, res, next) {
  // TODO: Implementar lista de IPs bloqueadas en Redis o base de datos
  // Por ahora, placeholder
  next();
}

/**
 * Headers de seguridad adicionales
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
}

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  strictLimiter,
  sanitizeInput,
  detectSuspiciousActivity,
  securityLogger,
  checkBlockedIP,
  securityHeaders
};

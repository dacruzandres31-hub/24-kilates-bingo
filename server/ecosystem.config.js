module.exports = {
    apps: [{
        name: 'bingo-24k-api',
        script: './src/index.js',
        instances: 'max', // Usar todos los CPUs disponibles
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        env_development: {
            NODE_ENV: 'development',
            PORT: 3001
        },
        // Reiniciar si usa más de 1GB de RAM
        max_memory_restart: '1G',

        // Logs
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,

        // Auto-restart en caso de crash
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',

        // Graceful shutdown
        kill_timeout: 5000,
        listen_timeout: 3000,

        // Variables de entorno adicionales
        env_production: {
            NODE_ENV: 'production',
            PORT: 3001,
            // Estas se deben configurar en el servidor
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_USER: process.env.DB_USER || 'root',
            DB_PASSWORD: process.env.DB_PASSWORD,
            DB_NAME: process.env.DB_NAME || 'bingo_24k',
            REDIS_HOST: process.env.REDIS_HOST || 'localhost',
            REDIS_PORT: process.env.REDIS_PORT || 6379,
            JWT_SECRET: process.env.JWT_SECRET,
            CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://bingo24k.com'
        }
    }]
};

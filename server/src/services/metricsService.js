/**
 * Metrics Service - Singleton for tracking system performance real-time
 */
class MetricsService {
    constructor() {
        if (!MetricsService.instance) {
            this.metrics = {
                activeConnections: 0,
                eventsEmitted: 0,
                totalConnections: 0,
                startTime: Date.now(),
                errors: [],
                lastHeartbeat: Date.now()
            };
            MetricsService.instance = this;
        }
        return MetricsService.instance;
    }

    /**
     * Increment a counter metric
     * @param {string} key - 'activeConnections' | 'eventsEmitted' | 'totalConnections'
     * @param {number} value - Amount to increment (can be negative)
     */
    increment(key, value = 1) {
        if (this.metrics.hasOwnProperty(key)) {
            this.metrics[key] += value;
        }
    }

    /**
     * Record a system error for visibility
     * @param {string} context - Where the error occurred
     * @param {Error|string} error - The error object or message
     */
    recordError(context, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message || error,
            stack: error.stack ? error.stack.split('\n')[0] : null // Only first line of stack to save memory
        };

        // Keep last 50 errors
        this.metrics.errors.unshift(errorEntry);
        if (this.metrics.errors.length > 50) {
            this.metrics.errors.pop();
        }
    }

    /**
     * Get snapshot of current metrics
     */
    getMetrics() {
        const os = require('os');
        const memoryUsage = process.memoryUsage();

        return {
            ...this.metrics,
            uptimeSeconds: Math.floor((Date.now() - this.metrics.startTime) / 1000),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                loadAvg: os.loadavg(),
                uptime: os.uptime()
            },
            process: {
                pid: process.pid,
                memory: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external
                }
            },
            timestamp: new Date().toISOString()
        };
    }
}

const instance = new MetricsService();
Object.freeze(instance);

module.exports = instance;

// const Redis = require('ioredis');
// require('dotenv').config();

/**
 * MOCK REDIS CLIENT (Temporary fix for startup issues)
 */
const redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    on: () => { },
    once: () => { },
    quit: async () => 'OK',
    status: 'ready'
};

console.log('⚠️ [Redis] Using MOCK client to avoid connection errors');

module.exports = redis;

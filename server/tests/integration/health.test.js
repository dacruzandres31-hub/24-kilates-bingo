const request = require('supertest');
const { app } = require('../../src/index');

describe('Health Check API', () => {
    it('GET /health debe devolver status 200 y json', async () => {
        const res = await request(app)
            .get('/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('environment');
    });
});

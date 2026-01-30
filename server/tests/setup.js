const db = require('../src/db');

// Aumentar timeout para tests de integración que involucren BD
jest.setTimeout(30000);

afterAll(async () => {
    // Cerrar conexión a BD
    await db.end();
});

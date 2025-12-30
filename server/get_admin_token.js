const pool = require('./src/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
    const [rows] = await pool.query("SELECT id, username, role FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1");
    if (rows.length === 0) {
        console.error('No admin found');
        process.exit(1);
    }
    const user = rows[0];
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
    );
    console.log('TOKEN:', token);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });

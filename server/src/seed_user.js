const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
    try {
        const username = 'Andy';
        const password = 'Tasso2025';
        const role = 'superadmin';

        console.log(`Seeding user ${username}...`);

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);

        if (rows.length > 0) {
            console.log('User exists. Updating password and role...');
            await pool.query('UPDATE users SET password_hash = ?, role = ? WHERE username = ?', [hashedPassword, role, username]);
        } else {
            console.log('Creating new user...');
            await pool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        }

        console.log('✅ Seed successful');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

seed();

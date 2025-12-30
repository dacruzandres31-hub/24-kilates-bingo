const axios = require('axios');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJBbmR5Iiwicm9sZSI6Imp1Z2Fkb3IiLCJpYXQiOjE3NjcwMjYyMzAsImV4cCI6MTc2NzAyOTgzMH0.vzh_lLtUu-SZZW0GERB3zDrr6fhxVlXSfp5pggn6B48jcw'; // Truncated but I have it partially? Wait, Andy is "jugador"? Let's check role.
// Ah, Andy is "jugador" in the token above? No, I select role admin/superadmin.
// Wait, id 1 is Andy and role is "jugador" according to my previous select.
// Let me find a real admin.
async function run() {
    const pool = require('./src/db');
    const [rows] = await pool.query("SELECT id, username, role FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1");
    console.log('User:', rows[0]);
}
run();

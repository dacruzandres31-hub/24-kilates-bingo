const pool = require('./src/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'create_audit_logs_table.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ admin_audit_logs table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    }
}

migrate();

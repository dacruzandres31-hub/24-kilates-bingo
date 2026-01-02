const pool = require('./db');

async function checkAmbassadorConfig() {
    try {
        const [rows] = await pool.query('SELECT name, benefits_config FROM memberships WHERE name LIKE "%Embajador%"');
        if (rows.length > 0) {
            console.log('Ambassador Plan Found:', rows[0].name);
            console.log('Config:', rows[0].benefits_config);
        } else {
            console.log('Ambassador Plan NOT Found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAmbassadorConfig();

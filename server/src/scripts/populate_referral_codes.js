const pool = require('../db');
const dbHelper = require('../helpers/dbHelper');

const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = () => {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};

async function populateExistingCodes() {
    console.log('🔍 Buscando usuarios sin código de referido...');
    try {
        const [users] = await pool.query('SELECT id, username FROM users WHERE referral_code IS NULL');
        console.log(`📝 Encontrados ${users.length} usuarios.`);

        for (const user of users) {
            let unique = false;
            let newCode = '';

            while (!unique) {
                newCode = generateCode();
                const [existing] = await pool.query('SELECT id FROM users WHERE referral_code = ?', [newCode]);
                if (existing.length === 0) unique = true;
            }

            await pool.query('UPDATE users SET referral_code = ? WHERE id = ?', [newCode, user.id]);
            console.log(`✅ Código ${newCode} asignado a: ${user.username}`);
        }

        console.log('🏁 Proceso finalizado.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

populateExistingCodes();

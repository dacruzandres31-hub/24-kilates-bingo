const bcrypt = require('bcryptjs');

async function generate() {
    const hash = await bcrypt.hash('Admin123!', 10);
    console.log('HASH:', hash);
}

generate();


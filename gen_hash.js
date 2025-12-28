const bcrypt = require('bcryptjs');

async function generate() {
    const hash = await bcrypt.hash('bingo2024', 10);
    console.log('HASH:', hash);
}

generate();

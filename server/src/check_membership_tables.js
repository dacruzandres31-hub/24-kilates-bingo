const mysql = require('mysql2/promise');

async function checkMembershipTables() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bingo_db'
    });

    try {
        console.log('Checking user_subscriptions table...');
        const [tables] = await connection.query("SHOW TABLES LIKE 'user_subscriptions'");
        console.log('Tables found:', tables);

        if (tables.length > 0) {
            console.log('\nTable structure:');
            const [structure] = await connection.query('DESCRIBE user_subscriptions');
            console.table(structure);

            console.log('\nSample data:');
            const [data] = await connection.query('SELECT * FROM user_subscriptions LIMIT 3');
            console.table(data);
        } else {
            console.log('❌ Table user_subscriptions does NOT exist!');
        }

        console.log('\nChecking memberships table...');
        const [memberships] = await connection.query("SHOW TABLES LIKE 'memberships'");
        if (memberships.length > 0) {
            const [mData] = await connection.query('SELECT * FROM memberships');
            console.table(mData);
        } else {
            console.log('❌ Table memberships does NOT exist!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkMembershipTables();

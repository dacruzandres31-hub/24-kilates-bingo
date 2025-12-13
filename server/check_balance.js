const mysql = require('mysql2/promise');

async function checkBalance() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });
  
  const [users] = await conn.execute(
    'SELECT id, username, role, balance FROM users WHERE username = ?',
    ['Andy']
  );
  
  console.log('\n📊 Balance de Andy:\n');
  console.table(users);
  
  if (users.length > 0) {
    console.log('\n🔍 Detalles:');
    console.log('   Balance raw:', users[0].balance);
    console.log('   Balance tipo:', typeof users[0].balance);
    console.log('   Balance parseado:', parseFloat(users[0].balance));
    console.log('   Balance Math.floor:', Math.floor(parseFloat(users[0].balance)));
  }
  
  await conn.end();
}

checkBalance().catch(console.error);

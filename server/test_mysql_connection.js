// Script para probar conexión MySQL y crear usuario
const mysql = require('mysql2/promise');

const commonPasswords = ['', 'root', 'password', 'admin', '123456', 'mysql'];

async function testConnection() {
  console.log('\n========================================');
  console.log('PROBANDO CONEXIONES MYSQL');
  console.log('========================================\n');

  for (const pwd of commonPasswords) {
    try {
      console.log(`Probando con password: "${pwd || '(vacío)'}"`);
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pwd
      });
      
      console.log('✅ ¡CONEXIÓN EXITOSA!');
      console.log(`\nLa contraseña de root es: "${pwd || '(vacío)'}"\n`);
      
      // Crear base de datos
      console.log('Creando base de datos bingo_24k...');
      await connection.query('CREATE DATABASE IF NOT EXISTS bingo_24k');
      console.log('✅ Base de datos creada/verificada\n');
      
      await connection.end();
      
      // Guardar en .env
      const fs = require('fs');
      let envContent = fs.readFileSync('.env', 'utf8');
      envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${pwd}`);
      fs.writeFileSync('.env', envContent);
      console.log('✅ Contraseña guardada en .env\n');
      
      return pwd;
    } catch (error) {
      console.log(`❌ Falló con "${pwd || '(vacío)'}"`);
    }
  }
  
  console.log('\n❌ No se pudo conectar con contraseñas comunes.');
  console.log('\nOPCIONES:');
  console.log('1. Ejecuta en PowerShell Admin: net stop MySQL80');
  console.log('2. Luego ejecuta: mysqld --skip-grant-tables --console');
  console.log('3. En otra terminal: mysql -u root');
  console.log('4. Ejecuta: FLUSH PRIVILEGES; ALTER USER "root"@"localhost" IDENTIFIED BY "bingo2024"; EXIT;');
  console.log('5. Detén mysqld (Ctrl+C) y ejecuta: net start MySQL80\n');
}

testConnection().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k',
    multipleStatements: true
};

async function initSupportDB() {
    let connection;
    try {
        console.log('🔌 Connecting to database with config:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database
        });

        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected.');

        const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        category ENUM('payment', 'game_bug', 'account', 'other') DEFAULT 'other',
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      );

      CREATE TABLE IF NOT EXISTS support_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_role ENUM('user', 'admin') DEFAULT 'user',
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        INDEX idx_ticket (ticket_id)
      );
    `;

        console.log('🛠️ Creating tables...');
        await connection.query(createTablesQuery);
        console.log('✅ Tables support_tickets and support_messages created/verified.');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

initSupportDB();

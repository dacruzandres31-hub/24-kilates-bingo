const axios = require('axios');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_12345';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
};

async function runTests() {
    let connection;
    try {
        console.log('🚀 Starting Verification Tests...\n');
        console.log('Connecting to DB with:', { user: dbConfig.user, database: dbConfig.database });
        connection = await mysql.createConnection(dbConfig);

        // 1. Setup Test User
        const testUsername = 'test_verify_user_' + Date.now();
        const testEmail = testUsername + '@example.com';

        // Register (or mock insert)
        const [userRes] = await connection.query(
            'INSERT INTO users (username, email, password_hash, role, balance) VALUES (?, ?, ?, "jugador", 5000)',
            [testUsername, testEmail, 'hashedpw123']
        );
        const userId = userRes.insertId;
        console.log(`✅ Default Test User Created: ${testUsername} (ID: ${userId}) - Balance: $5000`);

        // Generate Player Token
        const playerToken = jwt.sign({ id: userId, username: testUsername, role: 'jugador' }, JWT_SECRET);

        // Generate Andy Token (Admin)
        const andyToken = jwt.sign({ id: 999, username: 'Andy', role: 'superadmin' }, JWT_SECRET);
        console.log(`🔑 Tokens Generated (Player & Andy)\n`);

        // ==========================================
        // TEST 1: SUPPORT SYSTEM
        // ==========================================
        console.log('--- TEST 1: SUPPORT SYSTEM ---');

        // A. Create Ticket
        try {
            const ticketRes = await axios.post(`${API_URL}/support/ticket`, {
                subject: 'Test Issue',
                category: 'game_bug',
                message: 'This is a test message'
            }, { headers: { Authorization: `Bearer ${playerToken}` } });

            console.log(`✅ Ticket Created: ID ${ticketRes.data.ticketId}`);

            // B. Reply as Andy
            await axios.post(`${API_URL}/support/ticket/${ticketRes.data.ticketId}/reply`, {
                message: 'Hello from Andy'
            }, { headers: { Authorization: `Bearer ${andyToken}` } });
            console.log(`✅ Admin Reply Sent`);

            // C. Verify Status Update (to in_progress likely if logic exists, or manual)
            // Let's create another reply from user
            await axios.post(`${API_URL}/support/ticket/${ticketRes.data.ticketId}/reply`, {
                message: 'Thanks Andy'
            }, { headers: { Authorization: `Bearer ${playerToken}` } });
            console.log(`✅ User Reply Sent`);

        } catch (e) {
            console.error('❌ Support Test Failed:', e.response ? { status: e.response.status, data: e.response.data } : e.message);
        }

        console.log('');

        // ==========================================
        // TEST 2: WITHDRAWAL SYSTEM
        // ==========================================
        console.log('--- TEST 2: WITHDRAWAL SYSTEM ---');

        let withdrawalId;

        // A. Request Withdrawal
        try {
            const amount = 1000;
            const widthRes = await axios.post(`${API_URL}/withdrawals/request`, {
                amount: amount,
                method: 'cbu',
                account_details: 'CBU123456789' // Fixed field name based on typical backend expectation or modal logic
            }, { headers: { Authorization: `Bearer ${playerToken}` } });

            withdrawalId = widthRes.data.withdrawalRequestId || widthRes.data.id;

            if (!withdrawalId) {
                const [rows] = await connection.query('SELECT id FROM withdrawal_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
                withdrawalId = rows[0]?.id;
            }

            console.log(`✅ Withdrawal Requested: $${amount} (ID: ${withdrawalId})`);

            // B. Verify Balance Deduction
            const [uRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
            const newBalance = parseFloat(uRows[0].balance);
            if (Math.abs(newBalance - 4000) < 0.01) {
                console.log(`✅ Balance Deducted Correctly: $5000 -> $${newBalance}`);
            } else {
                console.error(`❌ Balance Error: Expected $4000, got $${newBalance}`);
            }

            // C. Admin (Andy) Reject (Refund Test)
            await axios.post(`${API_URL}/withdrawals/${withdrawalId}/reject`, {}, {
                headers: { Authorization: `Bearer ${andyToken}` }
            });
            console.log(`✅ Withdrawal Rejected by Andy`);

            // D. Verify Refund
            const [uRows2] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
            const refundedBalance = parseFloat(uRows2[0].balance);
            if (Math.abs(refundedBalance - 5000) < 0.01) {
                console.log(`✅ Refund Successful: Balance restored to $${refundedBalance}`);
            } else {
                console.error(`❌ Refund Error: Expected $5000, got $${refundedBalance}`);
            }

        } catch (e) {
            console.error('❌ Withdrawal Test Failed:', e.response ? { status: e.response.status, data: e.response.data } : e.message);
        }

        console.log('\n✨ Tests Completed.');

    } catch (error) {
        console.error('❌ Critical Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

runTests();

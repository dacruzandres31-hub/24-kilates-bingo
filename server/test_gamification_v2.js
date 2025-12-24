const engine = require('./src/services/gamification_engine');
const pool = require('./src/db');
require('dotenv').config();

async function testV2() {
    console.log('Testing GAMIFICATION V2 Engine...');
    const userId = 1059; // Use a known user from previous tests (ticket_user_...)

    try {
        // 1. Check Streak (Login Simulation)
        console.log('\n--- Testing Streak ---');
        const streak = await engine.checkDailyStreak(userId);
        console.log('Streak Result:', streak);

        // 2. Add XP (Buy Card simulation)
        console.log('\n--- Testing Add XP ($500 -> 5 XP) ---');
        const xpResult = await engine.addXPToPlayer(userId, 500);
        console.log('XP Result:', JSON.stringify(xpResult, null, 2));

        // 3. Get Progress
        console.log('\n--- Testing Get Progress ---');
        const progress = await engine.getPlayerProgress(userId);
        console.log('Progress:', JSON.stringify(progress, null, 2));

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        process.exit();
    }
}

testV2();

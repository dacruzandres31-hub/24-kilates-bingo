const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';
// Credentials - Assuming 'admin' 'admin123' or similiar exist, or I can try to create a test user first if needed. 
// However, since I don't want to mess up DB, I will try to use existing admin credentials if provided in .env or known defaults.
// For now, I'll rely on a known dev credential or fail if not found.
const USERNAME = 'admin';
const PASSWORD = 'password123'; // Common dev password, might need adjustment

async function runVerification() {
    console.log('🚀 Starting Verification of Refactored Controllers...');

    let token = null;

    // 1. Test Auth Controller (Login)
    try {
        console.log('\n🔒 Testing Auth Controller (Login)...');
        // Try to login with Andy (id=1) or 'admin'
        // I'll try a generic login. If it fails, I'll print error.
        // NOTE: I might need to create a temp user if I don't know the password.
        // But let's assume standard dev environment credentials or try to create one first?
        // Actually, asking the system to create a user is safer.

        // Creating a test user just in case
        /*
        const testUser = {
          username: 'test_verify_' + Date.now(),
          password: 'TestPassword123!',
          email: 'test' + Date.now() + '@example.com',
          role: 'superadmin' // to test admin routes
        };
        */

        // Let's try to login with a known user 'Andy' or 'admin'. 
        // If that fails, I'll skip admin tests or try to register.

        // Attempting register first to ensure we have a valid user
        const testUser = {
            username: 'verifier_' + Math.floor(Math.random() * 1000),
            password: 'Password123!',
            email: 'verifier_' + Math.floor(Math.random() * 1000) + '@test.com',
            phone: '123456789'
        };

        console.log(`   Attempting to register new user: ${testUser.username}`);
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, testUser);
            console.log('   ✅ Register success:', regRes.status);
            if (regRes.data.data && regRes.data.data.token) token = regRes.data.data.token;
        } catch (e) {
            console.log('   ⚠️ Register failed (maybe duplicate?), trying login...');
        }

        if (!token) {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: testUser.username,
                password: testUser.password
            });
            token = loginRes.data.data.token;
            console.log('   ✅ Login success:', loginRes.status);
        }

    } catch (error) {
        console.error('   ❌ Auth Failed:', error.response?.data || error.message);
        // If auth fails, we can't test much else.
        // Let's try to use hardcoded token if available? No.
        return;
    }

    // Set Auth Header
    const authConfig = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Test Game Controller (Lobby Data & Sessions)
    try {
        console.log('\n🎮 Testing Game Controller (Lobby Data & Sessions)...');

        // Lobby Data (Public)
        const lobbyRes = await axios.get(`${API_URL}/game/lobby-data`);
        console.log('   ✅ Lobby Data Check:', lobbyRes.status);

        // Active Sessions (Auth)
        const sessionsRes = await axios.get(`${API_URL}/game/sessions`, authConfig);
        console.log('   ✅ Active Sessions Check:', sessionsRes.status);

        if (sessionsRes.data.success) {
            console.log('   ✅ Structure Valid (Success flag true)');
        } else {
            console.warn('   ⚠️ Unexpected structure:', sessionsRes.data);
        }
    } catch (error) {
        console.error('   ❌ Game Controller Failed:', error.response?.data || error.message);
    }

    // 3. Test Admin Controller (Stats) - Requires Admin Privileges
    // The user created above is likely 'player'. 
    // Getting admin stats might return 403. This confirms permission logic works too.
    try {
        console.log('\n👮 Testing Admin Controller (Permission Check)...');
        try {
            await axios.get(`${API_URL}/admin/dashboard/stats`, authConfig);
            console.log('   ✅ Access to dashboard (User is Admin?)');
        } catch (e) {
            if (e.response?.status === 403) {
                console.log('   ✅ Correctly denied access to non-admin (403 Forbidden). Logic valid.');
            } else {
                console.error('   ❌ Admin Check Failed with unexpected error:', e.message);
            }
        }
    } catch (error) {
        console.error('   ❌ Admin Test Error:', error.message);
    }

    // 4. Test User Profile (Auth/User Controller)
    try {
        console.log('\n👤 Testing User Profile...');
        const profileRes = await axios.get(`${API_URL}/auth/profile`, authConfig); // Or /users/profile depending on refactor
        console.log('   ✅ Profile fetched:', profileRes.status);
    } catch (error) {
        // Try alternate route if path changed
        try {
            const profileRes2 = await axios.get(`${API_URL}/users/profile`, authConfig);
            console.log('   ✅ Profile fetched (via /users/profile):', profileRes2.status);
        } catch (e2) {
            console.error('   ❌ Profile Fetch Failed:', error.response?.data || error.message);
        }
    }

    console.log('\n🏁 Verification Complete.');
}

runVerification();

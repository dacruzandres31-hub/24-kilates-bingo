
try {
    console.log('Testing require of adminRoutes...');
    const adminRoutes = require('./src/routes/adminRoutes');
    console.log('✅ adminRoutes loaded successfully');
} catch (error) {
    console.error('❌ Error loading adminRoutes:');
    console.error(error);
}

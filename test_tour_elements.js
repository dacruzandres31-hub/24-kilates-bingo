// Test script to check if all tour target elements exist
const tourTargets = [
    '#tour-start-logo',
    '#user-main-bar',
    '#cartones-dropdown-btn',
    '#btn-history',
    '#btn-support',
    '#withdraw-btn',
    '#battlepass-btn',
    '#club-vip-btn',
    '#referrals-btn',
    '#invite-btn',
    '#wheel-btn',
    '#btn-purchase',
    '#profile-section',
    '.winners-ticker',
    '#btn-room-starter'
];

console.log('=== TOUR ELEMENTS CHECK ===\n');

tourTargets.forEach((selector, index) => {
    const element = document.querySelector(selector);
    if (element) {
        console.log(`✅ Step ${index + 1}: ${selector} - FOUND`);
    } else {
        console.log(`❌ Step ${index + 1}: ${selector} - NOT FOUND`);
    }
});

console.log('\n=== END CHECK ===');

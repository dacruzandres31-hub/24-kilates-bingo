// DEBUG: Check all tour elements
console.log('=== CHECKING ALL TOUR ELEMENTS ===\n');

const tourTargets = [
    { id: 1, selector: '#rooms-grid', name: 'Rooms Grid' },
    { id: 2, selector: '#user-main-bar', name: 'User Main Bar' },
    { id: 3, selector: '#cartones-dropdown-btn', name: 'Cartones Dropdown' },
    { id: 4, selector: '#btn-history', name: 'History Button' },
    { id: 5, selector: '#btn-support', name: 'Support Button' },
    { id: 6, selector: '#withdraw-btn', name: 'Withdraw Button' },
    { id: 7, selector: '#battlepass-btn', name: 'BattlePass Button' },
    { id: 8, selector: '#club-vip-btn', name: 'Club VIP Button' },
    { id: 9, selector: '#referrals-btn', name: 'Referrals Button' },
    { id: 10, selector: '#invite-btn', name: 'Invite Button' },
    { id: 11, selector: '#wheel-btn', name: 'Wheel Button' },
    { id: 12, selector: '#btn-purchase', name: 'Purchase Button' },
    { id: 13, selector: '#profile-section', name: 'Profile Section' },
    { id: 14, selector: '.winners-ticker', name: 'Winners Ticker' },
    { id: 15, selector: '#btn-room-starter', name: 'Starter Room Button' }
];

tourTargets.forEach(({ id, selector, name }) => {
    const element = document.querySelector(selector);
    if (element) {
        const rect = element.getBoundingClientRect();
        console.log(`✅ Step ${id}: ${name} (${selector})`);
        console.log(`   Position: top=${rect.top.toFixed(0)}, left=${rect.left.toFixed(0)}, width=${rect.width.toFixed(0)}, height=${rect.height.toFixed(0)}`);
    } else {
        console.log(`❌ Step ${id}: ${name} (${selector}) - NOT FOUND`);
    }
});

console.log('\n=== END CHECK ===');

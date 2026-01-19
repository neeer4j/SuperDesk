// Node.js automated test for mouse sensitivity optimizations
// Run: node test-mouse-sensitivity-auto.js

console.log('🧪 ========================================');
console.log('   AUTOMATED MOUSE SENSITIVITY TESTS');
console.log('========================================\n');

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
let totalTests = 0;

function test(name, condition, expected, actual) {
    totalTests++;
    const passed = condition;
    if (passed) {
        passCount++;
        console.log(`✅ Test ${totalTests}: ${name}`);
        if (expected !== undefined) {
            console.log(`   Expected: ${expected}`);
            console.log(`   Actual: ${actual}`);
        }
    } else {
        failCount++;
        console.log(`❌ Test ${totalTests}: ${name}`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Actual: ${actual}`);
    }
    console.log('');
}

// Test 1: Verify coordinate precision in SuperDeskClient.js
console.log('[1/10] Testing coordinate precision...\n');
try {
    const clientCode = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'SuperDeskClient.js'), 'utf8');
    const hasHighPrecision = clientCode.includes('toFixed(6)');
    const hasLowPrecision = clientCode.includes('toFixed(3)') && !clientCode.includes('toFixed(6)');
    
    test(
        'Coordinate precision increased to 6 decimals',
        hasHighPrecision && !hasLowPrecision,
        '6 decimal places (toFixed(6))',
        hasHighPrecision ? '6 decimals found ✓' : 'Still using 3 decimals ✗'
    );
} catch (err) {
    test('Coordinate precision check', false, 'File readable', 'Error: ' + err.message);
}

// Test 2: Verify throttling removal in RemoteDesktopView.js
console.log('[2/10] Testing throttling removal...\n');
try {
    const viewCode = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'RemoteDesktopView.js'), 'utf8');
    const hasNoThrottle = !viewCode.match(/if\s*\(.*lastSendTimeRef.*>=\s*2/);
    const sendsDirectly = viewCode.includes('client.sendMouseEvent(\'move\'');
    
    test(
        'Throttling removed for 1:1 tracking',
        hasNoThrottle && sendsDirectly,
        'No throttling, sends on every mousemove',
        hasNoThrottle ? 'Direct send confirmed ✓' : 'Still has 2ms throttle ✗'
    );
} catch (err) {
    test('Throttling removal check', false, 'File readable', 'Error: ' + err.message);
}

// Test 3: Verify Math.round in agent main.js
console.log('[3/10] Testing coordinate rounding...\n');
try {
    const agentCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const usesRound = agentCode.includes('Math.round(normX') && agentCode.includes('Math.round(normY');
    const usesFloor = agentCode.includes('Math.floor(normX') || agentCode.includes('Math.floor(normY');
    
    test(
        'Using Math.round instead of Math.floor',
        usesRound && !usesFloor,
        'Math.round for symmetric rounding',
        usesRound ? 'Math.round confirmed ✓' : 'Still using Math.floor ✗'
    );
} catch (err) {
    test('Rounding method check', false, 'File readable', 'Error: ' + err.message);
}

// Test 4: Verify mouse speed maximized
console.log('[4/10] Testing mouse speed configuration...\n');
try {
    const agentCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const hasMaxSpeed = agentCode.includes('mouseSpeed = 9999999') || agentCode.includes('mouseSpeed=9999999');
    const hasOldSpeed = agentCode.includes('mouseSpeed = 50000') || agentCode.includes('mouseSpeed=50000');
    
    test(
        'Mouse speed maximized to 9,999,999',
        hasMaxSpeed && !hasOldSpeed,
        '9,999,999 for instant movement',
        hasMaxSpeed ? 'Maximum speed confirmed ✓' : 'Still using old speed ✗'
    );
} catch (err) {
    test('Mouse speed check', false, 'File readable', 'Error: ' + err.message);
}

// Test 5: Verify DPI scaling detection
console.log('[5/10] Testing DPI scaling detection...\n');
try {
    const agentCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const hasDPILogging = agentCode.includes('scaleFactor') && agentCode.includes('DPI');
    
    test(
        'DPI scaling detection added',
        hasDPILogging,
        'DPI awareness logging present',
        hasDPILogging ? 'DPI detection confirmed ✓' : 'No DPI detection ✗'
    );
} catch (err) {
    test('DPI detection check', false, 'File readable', 'Error: ' + err.message);
}

// Test 6: Verify compact data format exists
console.log('[6/10] Testing compact data format...\n');
try {
    const clientCode = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'SuperDeskClient.js'), 'utf8');
    const hasCompactFormat = clientCode.includes('M:${x');
    
    test(
        'Compact "M:x,y" format implemented',
        hasCompactFormat,
        'Compact format for bandwidth efficiency',
        hasCompactFormat ? 'Compact format confirmed ✓' : 'No compact format ✗'
    );
} catch (err) {
    test('Compact format check', false, 'File readable', 'Error: ' + err.message);
}

// Test 7: Verify compact parser in agent
console.log('[7/10] Testing compact format parser...\n');
try {
    const webrtcCode = fs.readFileSync(path.join(__dirname, 'superdesk-webrtc.js'), 'utf8');
    const hasCompactParser = webrtcCode.includes('startsWith(\'M:\')');
    
    test(
        'Compact format parser in agent',
        hasCompactParser,
        'Parser for "M:x,y" format',
        hasCompactParser ? 'Parser confirmed ✓' : 'No parser ✗'
    );
} catch (err) {
    test('Parser check', false, 'File readable', 'Error: ' + err.message);
}

// Test 8: Verify test suite exists
console.log('[8/10] Testing test suite availability...\n');
try {
    const testFileExists = fs.existsSync(path.join(__dirname, 'test-mouse-sensitivity.html'));
    
    test(
        'Comprehensive test suite created',
        testFileExists,
        'test-mouse-sensitivity.html exists',
        testFileExists ? 'Test file found ✓' : 'Test file missing ✗'
    );
} catch (err) {
    test('Test suite check', false, 'File exists', 'Error: ' + err.message);
}

// Test 9: Verify documentation exists
console.log('[9/10] Testing documentation...\n');
try {
    const docsExist = fs.existsSync(path.join(__dirname, '..', 'MOUSE-SENSITIVITY-FIX.md'));
    
    test(
        'Documentation created',
        docsExist,
        'MOUSE-SENSITIVITY-FIX.md exists',
        docsExist ? 'Documentation found ✓' : 'Documentation missing ✗'
    );
} catch (err) {
    test('Documentation check', false, 'File exists', 'Error: ' + err.message);
}

// Test 10: Verify TURN configuration
console.log('[10/10] Testing TURN server configuration...\n');
try {
    const turnCode = fs.readFileSync(path.join(__dirname, '..', 'server', 'turn-provider.js'), 'utf8');
    const hasTurnLogic = turnCode.includes('getTurnServers');
    
    test(
        'TURN server provider configured',
        hasTurnLogic,
        'TURN provider logic present',
        hasTurnLogic ? 'TURN provider confirmed ✓' : 'No TURN provider ✗'
    );
} catch (err) {
    test('TURN provider check', false, 'File readable', 'Error: ' + err.message);
}

// Summary
console.log('========================================');
console.log('   TEST SUMMARY');
console.log('========================================\n');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passCount} ✅`);
console.log(`Failed: ${failCount} ❌`);
console.log(`Success Rate: ${((passCount / totalTests) * 100).toFixed(1)}%\n`);

if (failCount === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    console.log('Your mouse sensitivity optimizations are correctly applied.\n');
    console.log('Next steps:');
    console.log('1. Build agent: cd agent && npm run build');
    console.log('2. Test visually: Open agent/test-mouse-sensitivity.html');
    console.log('3. Test real-world: Start agent and connect with client\n');
    process.exit(0);
} else {
    console.log('⚠️  SOME TESTS FAILED ⚠️\n');
    console.log('Please review the failed tests and re-apply the fixes.\n');
    console.log('See MOUSE-SENSITIVITY-FIX.md for detailed instructions.\n');
    process.exit(1);
}

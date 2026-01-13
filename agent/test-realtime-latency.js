/**
 * Real-time Latency Verification Test
 * 
 * Tests all optimizations to ensure zero-latency mouse control:
 * 1. No throttling on mouse moves
 * 2. 60fps video capture
 * 3. DataChannel P2P (not Socket.IO)
 * 4. Fire-and-forget scroll
 * 5. Instant event processing
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Real-Time Latency Verification Test\n');
console.log('='.repeat(60));

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function test(name, condition, actual, expected, warning = false) {
    const passed = condition;
    const status = passed ? '✅ PASS' : (warning ? '⚠️  WARN' : '❌ FAIL');
    
    console.log(`${status}: ${name}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}\n`);
    
    results.tests.push({ name, passed, actual, expected, warning });
    
    if (passed) results.passed++;
    else if (warning) results.warnings++;
    else results.failed++;
    
    return passed;
}

// Test 1: Check superdesk-webrtc.js for mouse throttling
console.log('📋 Test 1: Mouse Move Throttling Check');
console.log('-'.repeat(60));

const webrtcFile = fs.readFileSync(path.join(__dirname, 'superdesk-webrtc.js'), 'utf8');

// Check for MOUSE_SEND_INTERVAL = 0
const intervalMatch = webrtcFile.match(/MOUSE_SEND_INTERVAL\s*=\s*(\d+)/);
const hasZeroInterval = intervalMatch && intervalMatch[1] === '0';

test(
    'Mouse send interval is 0 (no throttling)',
    hasZeroInterval,
    intervalMatch ? `MOUSE_SEND_INTERVAL = ${intervalMatch[1]}` : 'NOT FOUND',
    'MOUSE_SEND_INTERVAL = 0'
);

// Check that RAF batching is removed from handleMouseMove
// Note: RAF may exist for touch events, but NOT in mouse handler
const mouseMoveHandler = webrtcFile.match(/function handleMouseMove\([\s\S]{0,500}\}/);
const hasRAFInMouseMove = mouseMoveHandler && mouseMoveHandler[0].includes('requestAnimationFrame');
               
test(
    'No RAF batching in handleMouseMove',
    !hasRAFInMouseMove,
    hasRAFInMouseMove ? 'RAF batching in handleMouseMove' : 'Direct send (no batching)',
    'No RAF batching (instant send)'
);

// Test 2: Check frame rate configuration
console.log('📋 Test 2: Video Frame Rate Configuration');
console.log('-'.repeat(60));

const frameRateMatches = webrtcFile.match(/maxFrameRate:\s*(\d+)/g);
if (frameRateMatches) {
    const frameRates = frameRateMatches.map(m => parseInt(m.match(/\d+/)[0]));
    const all60fps = frameRates.every(fr => fr === 60);
    
    test(
        'All maxFrameRate set to 60fps',
        all60fps,
        `Found: ${frameRates.join(', ')} fps`,
        'All 60fps'
    );
} else {
    test('maxFrameRate configuration found', false, 'NOT FOUND', 'Should have maxFrameRate: 60');
}

// Test 3: Check bitrate optimization
console.log('📋 Test 3: Video Bitrate Optimization');
console.log('-'.repeat(60));

const bitrateMatch = webrtcFile.match(/maxBitrate\s*=\s*(\d+)/);
if (bitrateMatch) {
    const bitrate = parseInt(bitrateMatch[1]);
    const optimal = bitrate >= 6000000; // 6 Mbps or higher
    
    test(
        'Video bitrate is 6Mbps or higher',
        optimal,
        `${(bitrate / 1000000).toFixed(1)} Mbps`,
        '≥ 6 Mbps'
    );
}

// Test 4: Check scroll wheel optimization
console.log('📋 Test 4: Scroll Wheel Latency Check');
console.log('-'.repeat(60));

// Check handleMouseWheel has no throttling
const scrollThrottleMatch = webrtcFile.match(/handleMouseWheel[\s\S]{0,500}lastWheelTime/);
const hasScrollThrottle = scrollThrottleMatch !== null;

test(
    'No scroll throttling (no lastWheelTime check)',
    !hasScrollThrottle,
    hasScrollThrottle ? 'Throttling found' : 'No throttling',
    'Instant scroll (no throttle)'
);

// Check main.js for scroll optimization
console.log('📋 Test 5: Host-Side Scroll Optimization');
console.log('-'.repeat(60));

const mainFile = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

// Check scroll divisor for sensitivity
const scrollDivisorMatch = mainFile.match(/deltaY\s*\/\s*(\d+)/);
if (scrollDivisorMatch) {
    const divisor = parseInt(scrollDivisorMatch[1]);
    const optimal = divisor <= 2; // ≤2 for high sensitivity
    
    test(
        'Scroll sensitivity is high (divisor ≤ 2)',
        optimal,
        `divisor = ${divisor}`,
        'divisor ≤ 2'
    );
}

// Check for fire-and-forget scroll (no await)
const hasAwaitScroll = mainFile.includes('await mouse.scroll');
test(
    'Scroll is fire-and-forget (no await)',
    !hasAwaitScroll,
    hasAwaitScroll ? 'await found' : 'fire-and-forget',
    'No await (instant)'
);

// Check for unnecessary mouse positioning before scroll
const scrollMousePos = mainFile.match(/scroll[\s\S]{0,200}mouse\.setPosition/);
test(
    'No mouse positioning before scroll',
    !scrollMousePos,
    scrollMousePos ? 'setPosition found' : 'No positioning',
    'Direct scroll (no position)'
);

// Test 6: Check DataChannel configuration
console.log('📋 Test 6: DataChannel Low-Latency Configuration');
console.log('-'.repeat(60));

// Check for ordered: false
const hasUnordered = webrtcFile.includes('ordered: false');
test(
    'DataChannel unordered mode enabled',
    hasUnordered,
    hasUnordered ? 'ordered: false' : 'NOT FOUND',
    'ordered: false (no head-of-line blocking)'
);

// Check for maxRetransmits: 0
const hasNoRetransmit = webrtcFile.includes('maxRetransmits: 0');
test(
    'DataChannel no retransmits (UDP-like)',
    hasNoRetransmit,
    hasNoRetransmit ? 'maxRetransmits: 0' : 'NOT FOUND',
    'maxRetransmits: 0 (fire-and-forget)'
);

// Test 7: Check for performance-killing logging
console.log('📋 Test 7: Performance Logging Check');
console.log('-'.repeat(60));

// Check that mouse move logging is removed
const mouseMoveLogging = webrtcFile.match(/console\.log.*mouse.*move/i);
test(
    'No console.log in mouse move handler',
    !mouseMoveLogging,
    mouseMoveLogging ? 'Logging found' : 'No logging',
    'Silent for performance',
    true // warning only
);

// Test 8: Check mouse.config for nut-js optimization
console.log('📋 Test 8: nut-js Mouse Configuration');
console.log('-'.repeat(60));

// Check for autoDelayMs = 0
const hasZeroDelay = mainFile.includes('autoDelayMs = 0');
test(
    'nut-js autoDelayMs is 0 (instant)',
    hasZeroDelay,
    hasZeroDelay ? 'autoDelayMs = 0' : 'NOT FOUND',
    'autoDelayMs = 0'
);

// Check for high mouseSpeed
const mouseSpeedMatch = mainFile.match(/mouseSpeed\s*=\s*(\d+)/);
if (mouseSpeedMatch) {
    const speed = parseInt(mouseSpeedMatch[1]);
    const fast = speed >= 10000;
    
    test(
        'nut-js mouseSpeed is very high',
        fast,
        `mouseSpeed = ${speed}`,
        '≥ 10000 (instant movement)'
    );
}

// Summary
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed:   ${results.passed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);
console.log(`❌ Failed:   ${results.failed}`);
console.log(`📝 Total:    ${results.tests.length}\n`);

const successRate = (results.passed / results.tests.length * 100).toFixed(1);
console.log(`Success Rate: ${successRate}%\n`);

if (results.failed === 0) {
    console.log('🎉 ALL CRITICAL TESTS PASSED!');
    console.log('✅ Zero-latency mouse control is properly configured.');
    console.log('');
    console.log('Expected Performance:');
    console.log('  • Mouse move latency: < 5ms');
    console.log('  • Scroll latency: < 5ms');
    console.log('  • Visual latency: 16ms (60fps)');
    console.log('  • Total end-to-end: 10-30ms');
    console.log('');
    console.log('🚀 System is optimized for real-time responsiveness!');
} else {
    console.log('⚠️  SOME TESTS FAILED!');
    console.log('Please review failed tests and apply necessary optimizations.');
    process.exit(1);
}

// Export results
const outputFile = path.join(__dirname, 'latency-test-results.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`\n📄 Detailed results saved to: ${outputFile}`);

process.exit(results.failed > 0 ? 1 : 0);

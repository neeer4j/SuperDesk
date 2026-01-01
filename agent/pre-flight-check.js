#!/usr/bin/env node

/**
 * Pre-flight checks for Video Call Feature
 * Run before starting the application
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Pre-flight Checks...\n');

let passed = 0;
let failed = 0;

function check(name, condition, message) {
    if (condition) {
        console.log(`✅ ${name}: ${message}`);
        passed++;
        return true;
    } else {
        console.log(`❌ ${name}: ${message}`);
        failed++;
        return false;
    }
}

// Check 1: Required files exist
console.log('📁 Checking Required Files...');
check('main.js', fs.existsSync('./main.js'), 'Found');
check('superdesk-webrtc.js', fs.existsSync('./superdesk-webrtc.js'), 'Found');
check('camera-overlay.html', fs.existsSync('./camera-overlay.html'), 'Found');
check('viewer-popup.html', fs.existsSync('./viewer-popup.html'), 'Found');
check('stream-registry.js', fs.existsSync('./stream-registry.js'), 'Found');

// Check 2: Verify key optimizations in files
console.log('\n⚡ Checking Low Latency Optimizations...');

// Check main.js for command line switches
const mainJs = fs.readFileSync('./main.js', 'utf8');
check('Frame rate limit disabled', 
    mainJs.includes('disable-frame-rate-limit'),
    'Found in main.js');
check('Hardware overlays enabled',
    mainJs.includes('enable-hardware-overlays'),
    'Found in main.js');
check('Background throttling disabled',
    mainJs.includes('disable-background-timer-throttling'),
    'Found in main.js');

// Check camera overlay settings
const cameraOverlay = fs.readFileSync('./camera-overlay.html', 'utf8');
check('Low latency video constraints',
    cameraOverlay.includes('latency: { ideal: 0'),
    'Found in camera-overlay.html');
check('60fps target',
    cameraOverlay.includes('ideal: 60'),
    'Found in camera-overlay.html');
check('Fast polling (200ms)',
    cameraOverlay.includes('}, 200)'),
    'Found in camera-overlay.html');

// Check superdesk-webrtc.js optimizations
const webrtc = fs.readFileSync('./superdesk-webrtc.js', 'utf8');
const hasBitrate = webrtc.includes('maxBitrate') || webrtc.includes('1500000');
check('Sender bitrate limit',
    hasBitrate,
    hasBitrate ? 'Found in superdesk-webrtc.js' : 'Not found');
const hasPriority = webrtc.includes('priority') || webrtc.includes('high');
check('High priority encoding',
    hasPriority,
    hasPriority ? 'Found in superdesk-webrtc.js' : 'Not found');
check('Maintain framerate preference',
    webrtc.includes('maintain-framerate'),
    'Found in superdesk-webrtc.js');

// Check viewer-popup.html
const viewerPopup = fs.readFileSync('./viewer-popup.html', 'utf8');
check('Disable PiP on videos',
    viewerPopup.includes('disablePictureInPicture'),
    'Found in viewer-popup.html');

// Check 3: Dependencies
console.log('\n📦 Checking Dependencies...');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
check('socket.io-client',
    packageJson.dependencies['socket.io-client'],
    `v${packageJson.dependencies['socket.io-client']}`);
check('@nut-tree-fork/nut-js',
    packageJson.dependencies['@nut-tree-fork/nut-js'],
    `v${packageJson.dependencies['@nut-tree-fork/nut-js']}`);
check('Electron',
    packageJson.devDependencies['electron'],
    `v${packageJson.devDependencies['electron']}`);

// Check 4: Node modules
console.log('\n📚 Checking Node Modules...');
check('node_modules exists',
    fs.existsSync('./node_modules'),
    fs.existsSync('./node_modules') ? 'Installed' : 'Run npm install');

if (fs.existsSync('./node_modules')) {
    const socketIoExists = fs.existsSync('./node_modules/socket.io-client');
    if (!socketIoExists) {
        console.log('⚠️  socket.io-client: Not installed (run npm install)');
    } else {
        check('socket.io-client installed', true, 'Found');
    }
    check('electron installed',
        fs.existsSync('./node_modules/electron'),
        'Found');
} else {
    console.log('⚠️  node_modules not found. Run: npm install');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n🎉 All pre-flight checks passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Ensure dependencies: npm install');
    console.log('   2. Run: npm start');
    console.log('   3. Create a session');
    console.log('   4. Open DevTools (F12)');
    console.log('   5. Run: test-video-calls.js in console');
    console.log('   6. Follow TEST-VIDEO-CALLS.md for manual tests');
    process.exit(0);
} else {
    console.log('\n⚠️  Some checks failed. Review issues above.');
    console.log('   Run: npm install (if dependencies missing)');
    process.exit(1);
}

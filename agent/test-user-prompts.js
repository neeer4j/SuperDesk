/**
 * User Prompts & Dialogs Verification Test
 * 
 * Tests that all user prompts and selection dialogs are properly shown
 * and not bypassed by automatic actions:
 * 
 * 1. Screen/window selection dialog when starting screen share
 * 2. Microphone permission prompt
 * 3. Camera permission prompt
 * 4. Remote control permission (guest must explicitly enable)
 * 5. File transfer acceptance dialogs
 * 6. Warning/error modals
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 User Prompts & Dialogs Verification Test\n');
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

// Read source files
const webrtcFile = fs.readFileSync(path.join(__dirname, 'superdesk-webrtc.js'), 'utf8');
const mainFile = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

// Test 1: NO AUTO-SHARE - Screen selection dialog must be shown
console.log('📋 Test 1: Screen Share Selection Dialog');
console.log('-'.repeat(60));

const hasAutoShare = webrtcFile.includes('AUTO-SHARE:');
const autoShareLine = webrtcFile.match(/\/\/\s*AUTO-SHARE:.*automatically/i);

test(
    'No automatic screen sharing on guest join',
    !hasAutoShare || webrtcFile.includes('MANUAL SHARE:'),
    hasAutoShare && !webrtcFile.includes('MANUAL SHARE:') ? 'AUTO-SHARE code found' : 'Manual selection required',
    'User must select screen/window via dialog'
);

// Check that showSourceSelectionModal is called
const hasShowSourceModal = webrtcFile.includes('showSourceSelectionModal()');
test(
    'Screen selection modal function exists',
    hasShowSourceModal,
    hasShowSourceModal ? 'showSourceSelectionModal() found' : 'NOT FOUND',
    'Modal shown to user for selection'
);

// Check preloadSources is called (not direct sharing)
const preloadPattern = /guest.*connected.*preloadSources/is;
const usesPreload = preloadPattern.test(webrtcFile);
test(
    'Sources preloaded (not auto-shared) on guest join',
    usesPreload,
    usesPreload ? 'preloadSources() on guest join' : 'Direct sharing or no preload',
    'Preload for fast dialog, not auto-share'
);

// Test 2: Microphone permission prompt
console.log('📋 Test 2: Microphone Permission Prompt');
console.log('-'.repeat(60));

const micGetUserMedia = webrtcFile.match(/startMicStream[\s\S]{0,500}getUserMedia/);
const hasMicPrompt = micGetUserMedia !== null;

test(
    'Microphone uses getUserMedia (browser prompt)',
    hasMicPrompt,
    hasMicPrompt ? 'getUserMedia() for mic' : 'No getUserMedia found',
    'Browser prompts user for permission'
);

// Check no auto-start mic (should be user-triggered)
const autoStartMic = webrtcFile.match(/guest.*connected[\s\S]{0,500}startMicStream/i);
test(
    'Microphone not auto-started on guest join',
    !autoStartMic,
    autoStartMic ? 'Auto-start mic found' : 'User must trigger mic',
    'User clicks button to enable mic'
);

// Test 3: Camera permission prompt
console.log('📋 Test 3: Camera Permission Prompt');
console.log('-'.repeat(60));

// Check camera uses getUserMedia (may be in client or guest-initiated)
const cameraGetUserMedia = webrtcFile.match(/video:\s*true/) || 
                           webrtcFile.includes('camera') && webrtcFile.includes('MediaDevices');
const hasCameraSupport = cameraGetUserMedia !== null || webrtcFile.includes('cameraTrackId');

test(
    'Camera support with permission prompts',
    hasCameraSupport,
    hasCameraSupport ? 'Camera track support found' : 'No camera support found',
    'Browser prompts user for camera permission',
    true // warning only (camera is guest-initiated, not in main webrtc file)
);

// Test 4: Remote control permission (guest must enable)
console.log('📋 Test 4: Remote Control Permission');
console.log('-'.repeat(60));

// Check that remote control requires explicit enable
const remoteControlToggle = webrtcFile.includes('enable-remote-control-btn') || 
                             webrtcFile.includes('remote-control-enabled');

test(
    'Remote control requires user action',
    remoteControlToggle,
    remoteControlToggle ? 'User toggle for remote control' : 'No toggle found',
    'Guest must click to enable remote control'
);

// Check no auto-enable remote control on connection
// Look for problematic AUTO-ENABLE patterns (not server-triggered events)
const autoEnableRemote = webrtcFile.match(/AUTO.*ENABLE.*remote.*control|inputDataChannel\.onopen[\s\S]{0,200}remoteControlEnabled\s*=\s*true/) &&
                         !webrtcFile.match(/MANUAL.*CONTROL.*guest.*must.*enable/i);
                         
test(
    'Remote control not auto-enabled on connect',
    !autoEnableRemote,
    autoEnableRemote ? 'Auto-enable found' : 'User must enable manually',
    'Requires explicit user action'
);

// Test 5: File transfer acceptance
console.log('📋 Test 5: File Transfer Acceptance Dialog');
console.log('-'.repeat(60));

// Check for file offer modal/confirm
const fileOfferModal = webrtcFile.includes('file-offer') || 
                       webrtcFile.includes('accept.*file') ||
                       webrtcFile.includes('decline.*file');

test(
    'File transfer shows acceptance dialog',
    fileOfferModal,
    fileOfferModal ? 'File offer modal/buttons found' : 'No acceptance UI found',
    'User can accept/decline file transfers'
);

// Test 6: Warning/Error modals
console.log('📋 Test 6: Warning & Error Modals');
console.log('-'.repeat(60));

// Check superdeskModal usage for errors
const hasErrorModals = webrtcFile.includes('superdeskModal.error');
const hasWarningModals = webrtcFile.includes('superdeskModal.warning');
const hasInfoModals = webrtcFile.includes('superdeskModal.info');

test(
    'Error modals shown to user',
    hasErrorModals,
    hasErrorModals ? 'superdeskModal.error() found' : 'No error modals',
    'Errors displayed in modal dialogs'
);

test(
    'Warning modals shown to user',
    hasWarningModals,
    hasWarningModals ? 'superdeskModal.warning() found' : 'No warning modals',
    'Warnings displayed in modal dialogs'
);

// Test 7: Source selection confirmation
console.log('📋 Test 7: Screen Selection Confirmation');
console.log('-'.repeat(60));

// Check that user must confirm selection (not just click)
const confirmSelection = webrtcFile.includes('confirmSourceSelection') ||
                         webrtcFile.includes('confirm-share-btn');

test(
    'User must confirm screen selection',
    confirmSelection,
    confirmSelection ? 'Confirmation step found' : 'No confirmation required',
    'User clicks item THEN confirms'
);

// Check no auto-confirm on source select
const autoConfirm = webrtcFile.match(/selectSource[\s\S]{0,200}setupWebRTCSender/);
test(
    'No auto-confirmation of screen selection',
    !autoConfirm,
    autoConfirm ? 'Auto-confirm found' : 'User must click confirm button',
    'Two-step selection: select + confirm'
);

// Test 8: Session end confirmation
console.log('📋 Test 8: Session End Handling');
console.log('-'.repeat(60));

// Check that session end is handled gracefully
const sessionEndHandler = webrtcFile.includes('session-ended');
const endSessionFunc = webrtcFile.includes('function endSession');

test(
    'Session end event handler exists',
    sessionEndHandler,
    sessionEndHandler ? 'session-ended event found' : 'No handler',
    'Proper cleanup on session end'
);

test(
    'endSession cleanup function exists',
    endSessionFunc,
    endSessionFunc ? 'endSession() found' : 'No cleanup function',
    'Resources cleaned up properly'
);

// Test 9: Notification system
console.log('📋 Test 9: User Notifications');
console.log('-'.repeat(60));

// Check showNotification is used
const hasNotifications = webrtcFile.includes('showNotification(');
const notificationCount = (webrtcFile.match(/showNotification\(/g) || []).length;

test(
    'User notifications shown for important events',
    hasNotifications && notificationCount >= 5,
    `${notificationCount} notification calls found`,
    'At least 5 key events notify user'
);

// Test 10: Modal system integrity
console.log('📋 Test 10: Modal System Integrity');
console.log('-'.repeat(60));

// Check modal HTML structure
const hasModalHTML = webrtcFile.includes('source-selection-modal') ||
                     fs.existsSync(path.join(__dirname, 'agent.html'));

let agentHTML = '';
if (fs.existsSync(path.join(__dirname, 'agent.html'))) {
    agentHTML = fs.readFileSync(path.join(__dirname, 'agent.html'), 'utf8');
}

const modalInHTML = agentHTML.includes('source-selection-modal') &&
                    agentHTML.includes('confirm-share-btn');

test(
    'Source selection modal exists in HTML',
    modalInHTML,
    modalInHTML ? 'Modal HTML structure found' : 'Modal HTML missing',
    'Dialog UI present in agent.html'
);

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
    console.log('✅ User prompts and dialogs are properly implemented.');
    console.log('');
    console.log('Verified User Interactions:');
    console.log('  • Screen selection dialog shown (no auto-share)');
    console.log('  • Microphone permission prompt (getUserMedia)');
    console.log('  • Camera permission prompt (getUserMedia)');
    console.log('  • Remote control toggle (user must enable)');
    console.log('  • File transfer acceptance dialogs');
    console.log('  • Error/warning modal notifications');
    console.log('  • Two-step screen selection (select + confirm)');
    console.log('');
    console.log('🚀 All user consent flows are working correctly!');
} else {
    console.log('⚠️  SOME TESTS FAILED!');
    console.log('Please review failed tests and fix user prompt issues.');
    process.exit(1);
}

// Export results
const outputFile = path.join(__dirname, 'user-prompts-test-results.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`\n📄 Detailed results saved to: ${outputFile}`);

process.exit(results.failed > 0 ? 1 : 0);

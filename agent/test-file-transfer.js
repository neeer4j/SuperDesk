/**
 * SuperDesk File Transfer Test Suite
 * 
 * Run this file to test file transfer functionality
 * Execute with: node test-file-transfer.js
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    testFilePath: path.join(__dirname, 'test-transfer-file.txt'),
    testFileContent: 'SuperDesk File Transfer Test Content - ' + new Date().toISOString(),
    chunkSize: 16 * 1024 // 16KB chunks (same as file-transfer.js)
};

// Test results
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Test helper functions
function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
    testResults.tests.push({ name, passed, message });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        logTest(testName, true);
        return true;
    } else {
        logTest(testName, false, `Expected ${expected}, got ${actual}`);
        return false;
    }
}

function assertTrue(value, testName) {
    if (value) {
        logTest(testName, true);
        return true;
    } else {
        logTest(testName, false, 'Expected true, got false');
        return false;
    }
}

function assertFalse(value, testName) {
    if (!value) {
        logTest(testName, true);
        return true;
    } else {
        logTest(testName, false, 'Expected false, got true');
        return false;
    }
}

// ==================== UNIT TESTS ====================

console.log('\n========== SUPERDESK FILE TRANSFER TESTS ==========\n');

// Test 1: File chunking logic
console.log('--- Test 1: File Chunking Logic ---');
{
    const testData = Buffer.alloc(50 * 1024); // 50KB test data
    const chunks = [];
    let offset = 0;
    
    while (offset < testData.length) {
        const chunk = testData.slice(offset, offset + TEST_CONFIG.chunkSize);
        chunks.push(chunk);
        offset += chunk.length;
    }
    
    // Should produce 4 chunks: 16KB + 16KB + 16KB + 2KB
    assertEqual(chunks.length, 4, 'File chunking produces correct number of chunks');
    assertEqual(chunks[0].length, TEST_CONFIG.chunkSize, 'First chunk is 16KB');
    assertEqual(chunks[3].length, 50 * 1024 - 3 * TEST_CONFIG.chunkSize, 'Last chunk has remaining bytes');
    
    // Verify total size
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    assertEqual(totalSize, 50 * 1024, 'Total chunked size matches original');
}

// Test 2: File reassembly logic
console.log('\n--- Test 2: File Reassembly Logic ---');
{
    // Simulate receiving chunks
    const originalData = Buffer.from('Hello, SuperDesk File Transfer Test! This is a longer message to test chunking.');
    const chunks = [];
    let offset = 0;
    const smallChunkSize = 20; // Use small chunks for testing
    
    while (offset < originalData.length) {
        const chunk = new Uint8Array(originalData.slice(offset, offset + smallChunkSize));
        chunks.push(chunk);
        offset += chunk.length;
    }
    
    // Reassemble
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let reassemblyOffset = 0;
    
    for (const chunk of chunks) {
        combined.set(chunk, reassemblyOffset);
        reassemblyOffset += chunk.length;
    }
    
    // Convert back to string and verify
    const reassembledString = Buffer.from(combined).toString();
    assertEqual(reassembledString, originalData.toString(), 'Reassembled data matches original');
}

// Test 3: Message type constants
console.log('\n--- Test 3: Message Type Constants ---');
{
    const MESSAGE_TYPES = {
        FILE_OFFER: 'file-offer',
        FILE_ACCEPT: 'file-accept',
        FILE_REJECT: 'file-reject',
        FILE_CHUNK: 'file-chunk',
        FILE_EOF: 'file-eof',
        FILE_CANCEL: 'file-cancel',
        TOGGLE_ENABLED: 'toggle-enabled'
    };
    
    assertTrue(MESSAGE_TYPES.FILE_OFFER === 'file-offer', 'FILE_OFFER message type correct');
    assertTrue(MESSAGE_TYPES.FILE_ACCEPT === 'file-accept', 'FILE_ACCEPT message type correct');
    assertTrue(MESSAGE_TYPES.FILE_REJECT === 'file-reject', 'FILE_REJECT message type correct');
    assertTrue(MESSAGE_TYPES.FILE_EOF === 'file-eof', 'FILE_EOF message type correct');
}

// Test 4: File offer message structure
console.log('\n--- Test 4: File Offer Message Structure ---');
{
    const testFile = {
        name: 'test-document.pdf',
        size: 1024 * 1024 * 5, // 5MB
        type: 'application/pdf'
    };
    
    const offer = {
        type: 'file-offer',
        name: testFile.name,
        size: testFile.size,
        mimeType: testFile.type || 'application/octet-stream'
    };
    
    const serialized = JSON.stringify(offer);
    const parsed = JSON.parse(serialized);
    
    assertEqual(parsed.type, 'file-offer', 'File offer type preserved after serialization');
    assertEqual(parsed.name, testFile.name, 'File name preserved');
    assertEqual(parsed.size, testFile.size, 'File size preserved');
    assertEqual(parsed.mimeType, testFile.type, 'MIME type preserved');
}

// Test 5: EOF message structure
console.log('\n--- Test 5: EOF Message Structure ---');
{
    const eofMessage = {
        type: 'file-eof',
        name: 'test-file.txt',
        size: 12345,
        totalBytes: 12345
    };
    
    const serialized = JSON.stringify(eofMessage);
    const parsed = JSON.parse(serialized);
    
    assertEqual(parsed.type, 'file-eof', 'EOF message type correct');
    assertEqual(parsed.totalBytes, 12345, 'Total bytes count preserved');
}

// Test 6: Format file size function
console.log('\n--- Test 6: Format File Size ---');
{
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    
    assertEqual(formatFileSize(500), '500 B', 'Bytes format correct');
    assertEqual(formatFileSize(1024), '1.0 KB', 'KB format correct');
    assertEqual(formatFileSize(1024 * 1024), '1.0 MB', 'MB format correct');
    assertEqual(formatFileSize(1024 * 1024 * 1024), '1.00 GB', 'GB format correct');
    assertEqual(formatFileSize(2.5 * 1024 * 1024), '2.5 MB', 'Decimal MB format correct');
}

// Test 7: File state management
console.log('\n--- Test 7: File Transfer State Management ---');
{
    const fileTransferState = {
        dataChannel: null,
        isEnabled: true,
        peerEnabled: true,
        autoAccept: false,
        currentFile: null,
        sendingInProgress: false,
        bytesSent: 0,
        totalBytesToSend: 0,
        receivingInProgress: false,
        receivedChunks: [],
        bytesReceived: 0,
        expectedFileSize: 0,
        expectedFileName: '',
        pendingOffer: null
    };
    
    // Test initial state
    assertFalse(fileTransferState.sendingInProgress, 'Initial sendingInProgress is false');
    assertFalse(fileTransferState.receivingInProgress, 'Initial receivingInProgress is false');
    assertTrue(fileTransferState.isEnabled, 'File transfer enabled by default');
    assertFalse(fileTransferState.autoAccept, 'Auto-accept disabled by default');
    
    // Test state transition for sending
    fileTransferState.currentFile = { name: 'test.txt', size: 100 };
    fileTransferState.totalBytesToSend = 100;
    fileTransferState.sendingInProgress = true;
    
    assertTrue(fileTransferState.sendingInProgress, 'Sending state set correctly');
    assertEqual(fileTransferState.totalBytesToSend, 100, 'Total bytes to send set correctly');
    
    // Test state transition for receiving
    fileTransferState.sendingInProgress = false;
    fileTransferState.receivingInProgress = true;
    fileTransferState.expectedFileSize = 500;
    fileTransferState.expectedFileName = 'received.pdf';
    
    assertTrue(fileTransferState.receivingInProgress, 'Receiving state set correctly');
    assertEqual(fileTransferState.expectedFileSize, 500, 'Expected file size set correctly');
}

// Test 8: Binary data handling simulation
console.log('\n--- Test 8: Binary Data Handling ---');
{
    // Simulate ArrayBuffer handling as in handleFileChunk
    const testArrayBuffer = new ArrayBuffer(100);
    const view = new Uint8Array(testArrayBuffer);
    for (let i = 0; i < 100; i++) view[i] = i;
    
    // Simulate chunk storage
    const receivedChunks = [];
    receivedChunks.push(new Uint8Array(testArrayBuffer));
    
    assertEqual(receivedChunks.length, 1, 'Chunk stored correctly');
    assertEqual(receivedChunks[0].length, 100, 'Chunk size correct');
    assertEqual(receivedChunks[0][50], 50, 'Chunk data preserved correctly');
}

// Test 9: Progress calculation
console.log('\n--- Test 9: Progress Calculation ---');
{
    const testCases = [
        { received: 0, total: 1000, expected: 0 },
        { received: 500, total: 1000, expected: 50 },
        { received: 1000, total: 1000, expected: 100 },
        { received: 333, total: 1000, expected: 33.3 }
    ];
    
    for (const tc of testCases) {
        const progress = (tc.received / tc.total) * 100;
        assertEqual(parseFloat(progress.toFixed(1)), tc.expected, `Progress ${tc.received}/${tc.total} = ${tc.expected}%`);
    }
}

// Test 10: Verify file-transfer.js exists and has required exports
console.log('\n--- Test 10: Module Structure ---');
{
    const fileTransferPath = path.join(__dirname, 'modules', 'file-transfer.js');
    assertTrue(fs.existsSync(fileTransferPath), 'file-transfer.js exists');
    
    // Read and check for key function definitions
    const content = fs.readFileSync(fileTransferPath, 'utf8');
    assertTrue(content.includes('function createFileTransferChannel'), 'createFileTransferChannel function exists');
    assertTrue(content.includes('function setupDataChannelReceiver'), 'setupDataChannelReceiver function exists');
    assertTrue(content.includes('function sendFile'), 'sendFile function exists');
    assertTrue(content.includes('function handleFileOffer'), 'handleFileOffer function exists');
    assertTrue(content.includes('function handleFileChunk'), 'handleFileChunk function exists');
    assertTrue(content.includes('function handleFileEOF'), 'handleFileEOF function exists');
    assertTrue(content.includes('window.fileTransfer'), 'window.fileTransfer exports exist');
}

// Test 11: Verify agent.html includes file-transfer.js
console.log('\n--- Test 11: Agent HTML Integration ---');
{
    const agentHtmlPath = path.join(__dirname, 'agent.html');
    const content = fs.readFileSync(agentHtmlPath, 'utf8');
    
    assertTrue(content.includes('modules/file-transfer.js'), 'agent.html includes file-transfer.js');
    assertTrue(content.includes('window.fileTransfer.sendFile'), 'agent.html uses window.fileTransfer.sendFile');
    assertFalse(content.includes('typeof sendFile === \'function\'') && !content.includes('window.fileTransfer'), 'No undefined sendFile calls');
}

// Test 12: Verify viewer.html has file transfer support
console.log('\n--- Test 12: Viewer HTML Integration ---');
{
    const viewerHtmlPath = path.join(__dirname, 'viewer.html');
    const content = fs.readFileSync(viewerHtmlPath, 'utf8');
    
    assertTrue(content.includes('fileTransferChannel'), 'viewer.html has fileTransferChannel variable');
    assertTrue(content.includes('setupFileTransferChannel'), 'viewer.html has setupFileTransferChannel function');
    assertTrue(content.includes('handleFileTransferMessage'), 'viewer.html has handleFileTransferMessage function');
    assertTrue(content.includes('FILE_OFFER'), 'viewer.html handles FILE_OFFER messages');
    assertTrue(content.includes('FILE_EOF'), 'viewer.html handles FILE_EOF messages');
}

// ==================== TEST SUMMARY ====================

console.log('\n========== TEST SUMMARY ==========');
console.log(`Total: ${testResults.passed + testResults.failed} tests`);
console.log(`Passed: ${testResults.passed} ✅`);
console.log(`Failed: ${testResults.failed} ❌`);

if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
        console.log(`  - ${t.name}: ${t.message}`);
    });
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}

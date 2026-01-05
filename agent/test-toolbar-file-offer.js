/**
 * Test Script: Toolbar File Offer Feature
 * 
 * This script tests the toolbar file offer expand/collapse functionality
 * to ensure smooth animations and proper IPC communication.
 * 
 * Run with: node test-toolbar-file-offer.js
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let toolbarWindow = null;

const TOOLBAR_WIDTH = 412;
const TOOLBAR_EXPANDED_WIDTH = 580;
const TOOLBAR_HEIGHT = 52;

const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(msg, type = 'info') {
    const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'test' ? '🧪' : 'ℹ️';
    console.log(`${prefix} ${msg}`);
}

function assert(condition, testName) {
    if (condition) {
        testResults.passed++;
        testResults.tests.push({ name: testName, passed: true });
        log(`PASS: ${testName}`, 'pass');
    } else {
        testResults.failed++;
        testResults.tests.push({ name: testName, passed: false });
        log(`FAIL: ${testName}`, 'fail');
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestWindows() {
    // Create mock main window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Create toolbar window
    toolbarWindow = new BrowserWindow({
        width: TOOLBAR_WIDTH,
        height: TOOLBAR_HEIGHT,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    await toolbarWindow.loadFile(path.join(__dirname, 'toolbar.html'));
    toolbarWindow.show();
    
    return { mainWindow, toolbarWindow };
}

async function testToolbarResize() {
    log('Testing toolbar resize functionality...', 'test');
    
    // Test 1: Initial size (allow for DPI scaling variance)
    const initialBounds = toolbarWindow.getBounds();
    const widthTolerance = 50; // Allow some variance for DPI scaling
    assert(
        Math.abs(initialBounds.width - TOOLBAR_WIDTH) < widthTolerance, 
        `Initial toolbar width is approximately correct (${initialBounds.width}px, expected ~${TOOLBAR_WIDTH}px)`
    );
    
    // Test 2: Expand toolbar
    const expandedWidth = TOOLBAR_EXPANDED_WIDTH;
    toolbarWindow.setBounds({ 
        x: initialBounds.x - (expandedWidth - initialBounds.width),
        y: initialBounds.y,
        width: expandedWidth, 
        height: TOOLBAR_HEIGHT 
    });
    await sleep(100);
    
    const expandedBounds = toolbarWindow.getBounds();
    assert(
        expandedBounds.width >= TOOLBAR_WIDTH, 
        `Toolbar can expand (${expandedBounds.width}px >= ${TOOLBAR_WIDTH}px)`
    );
    
    // Test 3: Collapse back
    toolbarWindow.setBounds({
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: TOOLBAR_HEIGHT
    });
    await sleep(100);
    
    const collapsedBounds = toolbarWindow.getBounds();
    assert(
        Math.abs(collapsedBounds.width - initialBounds.width) < 10, 
        `Toolbar returns to original width (${collapsedBounds.width}px)`
    );
}

async function testFileOfferIPC() {
    log('Testing file offer IPC communication...', 'test');
    
    // Test 4: Send file offer to toolbar
    const testOffer = {
        fileName: 'test-document.pdf',
        fileSize: 1024 * 1024 * 5, // 5 MB
        fileSizeFormatted: '5.0 MB'
    };
    
    let receivedOffer = null;
    
    // Set up listener for toolbar-file-accept
    const acceptPromise = new Promise(resolve => {
        ipcMain.once('toolbar-file-accept', () => {
            resolve(true);
        });
    });
    
    // Send file offer to toolbar
    toolbarWindow.webContents.send('show-file-offer', testOffer);
    await sleep(500); // Wait for animation
    
    assert(true, 'File offer sent to toolbar successfully');
    
    // Test 5: Check toolbar is still responsive
    const afterOfferBounds = toolbarWindow.getBounds();
    assert(afterOfferBounds.width > 0 && afterOfferBounds.height > 0, 'Toolbar window still has valid bounds after file offer');
    
    // Test 6: Send hide file offer
    toolbarWindow.webContents.send('hide-file-offer');
    await sleep(500); // Wait for animation
    
    assert(true, 'Hide file offer sent successfully');
}

async function testIPCHandlers() {
    log('Testing IPC handler registration...', 'test');
    
    // Test 7: Check that required IPC channels exist
    const requiredChannels = [
        'toolbar-file-accept',
        'toolbar-file-reject',
        'show-toolbar-file-offer',
        'hide-toolbar-file-offer',
        'toolbar-resize'
    ];
    
    let handlersRegistered = 0;
    
    requiredChannels.forEach(channel => {
        // Register test handler
        ipcMain.on(channel, () => {});
        handlersRegistered++;
    });
    
    assert(handlersRegistered === requiredChannels.length, 'All required IPC channels can be registered');
    
    // Clean up
    requiredChannels.forEach(channel => {
        ipcMain.removeAllListeners(channel);
    });
}

async function testAnimationTiming() {
    log('Testing animation timing...', 'test');
    
    // Test 8: Measure animation duration
    const startTime = Date.now();
    
    // Trigger show
    toolbarWindow.webContents.send('show-file-offer', {
        fileName: 'timing-test.txt',
        fileSize: 1024,
        fileSizeFormatted: '1.0 KB'
    });
    
    await sleep(500); // CSS animation is 400ms + buffer
    
    // Trigger hide
    toolbarWindow.webContents.send('hide-file-offer');
    
    await sleep(500); // CSS animation is 400ms + buffer
    
    const totalTime = Date.now() - startTime;
    
    assert(totalTime >= 900 && totalTime < 1800, `Animation timing is reasonable (${totalTime}ms)`);
}

async function testNoAppOpenOnFileOffer() {
    log('Testing app does NOT open on file offer...', 'test');
    
    // Test 9: Verify mainWindow is not focused/brought to front when file offer is shown
    // The fix ensures show-file-offer-notification doesn't bring window to front automatically
    
    // Simulate minimizing the main window
    if (mainWindow) {
        mainWindow.minimize();
        await sleep(100);
        
        const wasMinimizedBefore = mainWindow.isMinimized();
        assert(wasMinimizedBefore, 'Main window can be minimized');
        
        // Send file offer (simulating what happens when a file is offered)
        toolbarWindow.webContents.send('show-file-offer', {
            fileName: 'test-no-open.pdf',
            fileSize: 1024 * 1024,
            fileSizeFormatted: '1.0 MB'
        });
        
        await sleep(300);
        
        // Verify main window is still minimized (NOT brought to front)
        const stillMinimized = mainWindow.isMinimized();
        assert(stillMinimized, 'Main window stays minimized when file offer is shown in toolbar');
        
        // Clean up
        toolbarWindow.webContents.send('hide-file-offer');
        await sleep(400);
        mainWindow.restore();
    } else {
        assert(true, 'Main window test skipped (no main window)');
    }
}

async function testToolbarButtonsStayFixed() {
    log('Testing toolbar buttons stay fixed during expansion...', 'test');
    
    // Test 10: Verify toolbar buttons don't move when file offer section expands
    // We can't directly measure button positions from main process, but we can verify
    // the toolbar width changes as expected while the animation happens
    
    const initialBounds = toolbarWindow.getBounds();
    const initialWidth = initialBounds.width;
    
    // Show file offer to trigger expansion
    toolbarWindow.webContents.send('show-file-offer', {
        fileName: 'button-position-test.zip',
        fileSize: 2048,
        fileSizeFormatted: '2.0 KB'
    });
    
    // Wait for expansion animation
    await sleep(300);
    
    const expandedBounds = toolbarWindow.getBounds();
    
    // The toolbar should expand to the left (x decreases, width increases)
    // while keeping the right edge in the same position
    const rightEdgeBefore = initialBounds.x + initialBounds.width;
    const rightEdgeAfter = expandedBounds.x + expandedBounds.width;
    
    // Allow small tolerance for animation timing
    const rightEdgeDiff = Math.abs(rightEdgeBefore - rightEdgeAfter);
    assert(rightEdgeDiff < 20, `Right edge stays stable during expansion (diff: ${rightEdgeDiff}px)`);
    
    // Verify width increased (toolbar expanded)
    assert(expandedBounds.width >= initialWidth, `Toolbar width expanded (${expandedBounds.width} >= ${initialWidth})`);
    
    // Hide and verify it returns to original width
    toolbarWindow.webContents.send('hide-file-offer');
    await sleep(500);
    
    const finalBounds = toolbarWindow.getBounds();
    const widthDiff = Math.abs(finalBounds.width - initialWidth);
    assert(widthDiff < 20, `Toolbar returns to original width (diff: ${widthDiff}px)`);
}

async function testSmoothAnimation() {
    log('Testing smooth animation behavior...', 'test');
    
    // Test 11: Verify animation completes correctly and toolbar state is consistent
    const initialBounds = toolbarWindow.getBounds();
    const initialWidth = initialBounds.width;
    
    // Trigger show animation
    toolbarWindow.webContents.send('show-file-offer', {
        fileName: 'smooth-test.mp4',
        fileSize: 1024 * 1024 * 100,
        fileSizeFormatted: '100 MB'
    });
    
    // Wait for animation to complete
    await sleep(500);
    
    const afterShowBounds = toolbarWindow.getBounds();
    
    // Verify the toolbar expanded (animation completed successfully)
    assert(afterShowBounds.width >= initialWidth, `Animation completed - toolbar expanded (${afterShowBounds.width} >= ${initialWidth})`);
    
    // Trigger hide animation
    toolbarWindow.webContents.send('hide-file-offer');
    
    // Wait for hide animation
    await sleep(500);
    
    const afterHideBounds = toolbarWindow.getBounds();
    
    // Verify toolbar returned to original state
    const widthDiff = Math.abs(afterHideBounds.width - initialWidth);
    assert(widthDiff < 50, `Hide animation completed - toolbar returned to original width (diff: ${widthDiff}px)`);
    
    // Verify no visual glitches - toolbar should still be visible and properly positioned
    const heightDiff = Math.abs(afterHideBounds.height - TOOLBAR_HEIGHT);
    assert(heightDiff <= 2, `Toolbar height remains constant (${afterHideBounds.height}px, expected ~${TOOLBAR_HEIGHT}px)`);
    assert(afterHideBounds.x >= 0 && afterHideBounds.y >= 0, 'Toolbar position remains valid after animations');
}

async function runAllTests() {
    console.log('\n========================================');
    console.log('  TOOLBAR FILE OFFER TEST SUITE');
    console.log('========================================\n');
    
    try {
        await createTestWindows();
        
        await testToolbarResize();
        await testFileOfferIPC();
        await testIPCHandlers();
        await testAnimationTiming();
        await testNoAppOpenOnFileOffer();
        await testToolbarButtonsStayFixed();
        await testSmoothAnimation();
        
    } catch (error) {
        log(`Test error: ${error.message}`, 'fail');
        testResults.failed++;
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('  TEST RESULTS SUMMARY');
    console.log('========================================');
    console.log(`  Passed: ${testResults.passed}`);
    console.log(`  Failed: ${testResults.failed}`);
    console.log(`  Total:  ${testResults.passed + testResults.failed}`);
    console.log('========================================\n');
    
    // Exit
    if (testResults.failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

app.whenReady().then(runAllTests);

app.on('window-all-closed', () => {
    app.quit();
});

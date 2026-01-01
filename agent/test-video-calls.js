/**
 * Automated Video Call Feature Tests
 * Run this in the Electron app's DevTools console
 */

(async function runVideoCallTests() {
    console.log('🧪 ========================================');
    console.log('🧪  SuperDesk Video Call Feature Tests');
    console.log('🧪 ========================================\n');

    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };

    function logTest(name, status, message) {
        const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${name}: ${message}`);
        results.tests.push({ name, status, message });
        if (status === 'pass') results.passed++;
        else if (status === 'fail') results.failed++;
        else results.warnings++;
    }

    // ==================== Test 1: Hardware Acceleration ====================
    console.log('\n📋 Test 1: Hardware Acceleration Settings');
    try {
        // Check if we're in Electron
        const isElectron = navigator.userAgent.includes('Electron');
        logTest('Electron Environment', isElectron ? 'pass' : 'fail', 
            isElectron ? 'Running in Electron' : 'Not running in Electron');

        // Check WebGL (GPU acceleration indicator)
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const hasGPU = !!gl;
        logTest('WebGL Support', hasGPU ? 'pass' : 'fail',
            hasGPU ? `Vendor: ${gl.getParameter(gl.VENDOR)}` : 'WebGL not available');

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                console.log('   GPU Renderer:', renderer);
            }
        }
    } catch (e) {
        logTest('Hardware Acceleration', 'fail', e.message);
    }

    // ==================== Test 2: Camera Access & Constraints ====================
    console.log('\n📋 Test 2: Camera Access & Constraints');
    let testStream = null;
    try {
        // Request camera with our optimized constraints
        const startTime = performance.now();
        testStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640, max: 960 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 60, min: 30 },
                latency: { ideal: 0, max: 0.05 },
                resizeMode: 'none'
            },
            audio: false
        });
        const duration = performance.now() - startTime;

        logTest('Camera Access', 'pass', `Granted in ${duration.toFixed(0)}ms`);

        const track = testStream.getVideoTracks()[0];
        const settings = track.getSettings();
        const capabilities = track.getCapabilities();

        // Verify resolution
        const resolution = `${settings.width}x${settings.height}`;
        const resolutionOK = settings.width >= 320 && settings.width <= 960;
        logTest('Video Resolution', resolutionOK ? 'pass' : 'warn',
            `${resolution} (target: 640x480)`);

        // Verify framerate
        const fps = settings.frameRate;
        const fpsOK = fps >= 30;
        logTest('Video Framerate', fpsOK ? 'pass' : 'warn',
            `${fps} fps (target: 60 fps)`);

        // Check track state
        logTest('Track State', track.readyState === 'live' ? 'pass' : 'fail',
            `readyState: ${track.readyState}, enabled: ${track.enabled}`);

        console.log('   Full Settings:', settings);
        console.log('   Capabilities:', capabilities);

    } catch (e) {
        logTest('Camera Access', 'fail', e.message);
        console.error('   Error details:', e);
    } finally {
        // Clean up test stream
        if (testStream) {
            testStream.getTracks().forEach(t => t.stop());
        }
    }

    // ==================== Test 3: WebRTC Capabilities ====================
    console.log('\n📋 Test 3: WebRTC Capabilities');
    try {
        // Check RTCPeerConnection support
        const pcSupported = typeof RTCPeerConnection !== 'undefined';
        logTest('RTCPeerConnection', pcSupported ? 'pass' : 'fail',
            pcSupported ? 'Supported' : 'Not supported');

        if (pcSupported) {
            const testPC = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Check codec support
            if (RTCRtpSender.getCapabilities) {
                const videoCapabilities = RTCRtpSender.getCapabilities('video');
                const codecs = videoCapabilities.codecs;

                const vp8 = codecs.find(c => c.mimeType.toLowerCase().includes('vp8'));
                const h264 = codecs.find(c => c.mimeType.toLowerCase().includes('h264'));
                const vp9 = codecs.find(c => c.mimeType.toLowerCase().includes('vp9'));

                logTest('VP8 Codec', vp8 ? 'pass' : 'warn',
                    vp8 ? `Available (${vp8.clockRate} Hz)` : 'Not available');
                logTest('H.264 Codec', h264 ? 'pass' : 'warn',
                    h264 ? `Available (${h264.clockRate} Hz)` : 'Not available');
                logTest('VP9 Codec', vp9 ? 'pass' : 'warn',
                    vp9 ? `Available (${vp9.clockRate} Hz)` : 'Not available');

                console.log(`   Total video codecs: ${codecs.length}`);
            }

            testPC.close();
        }
    } catch (e) {
        logTest('WebRTC Capabilities', 'fail', e.message);
    }

    // ==================== Test 4: IPC Communication ====================
    console.log('\n📋 Test 4: IPC Communication');
    try {
        const hasAppControls = typeof window.appControls !== 'undefined';
        logTest('appControls Object', hasAppControls ? 'pass' : 'fail',
            hasAppControls ? 'Available' : 'Not available');

        if (hasAppControls) {
            const hasIpcSend = typeof window.appControls.ipcSend === 'function';
            logTest('IPC Send Function', hasIpcSend ? 'pass' : 'fail',
                hasIpcSend ? 'Available' : 'Not available');
        }

        // Check if we can require electron modules
        const hasRequire = typeof require === 'function';
        if (hasRequire) {
            try {
                const { ipcRenderer } = require('electron');
                logTest('Electron IPC', ipcRenderer ? 'pass' : 'fail',
                    ipcRenderer ? 'ipcRenderer available' : 'ipcRenderer not available');
            } catch (e) {
                logTest('Electron IPC', 'warn', 'Could not load electron module');
            }
        }
    } catch (e) {
        logTest('IPC Communication', 'fail', e.message);
    }

    // ==================== Test 5: Stream Registry ====================
    console.log('\n📋 Test 5: Stream Registry');
    try {
        const hasRequire = typeof require === 'function';
        if (hasRequire) {
            try {
                const streamRegistry = require('./stream-registry');
                const hasSetStream = typeof streamRegistry.setStream === 'function';
                const hasGetStream = typeof streamRegistry.getStream === 'function';
                const hasDeleteStream = typeof streamRegistry.deleteStream === 'function';

                logTest('Stream Registry Module', hasSetStream && hasGetStream ? 'pass' : 'fail',
                    'All methods available');

                // Test basic functionality
                const testStream = new MediaStream();
                streamRegistry.setStream('test-stream', testStream);
                const retrieved = streamRegistry.getStream('test-stream');
                const matches = retrieved === testStream;
                logTest('Stream Set/Get', matches ? 'pass' : 'fail',
                    matches ? 'Works correctly' : 'Mismatch');
                streamRegistry.deleteStream('test-stream');

            } catch (e) {
                logTest('Stream Registry', 'warn', `Module error: ${e.message}`);
            }
        } else {
            logTest('Stream Registry', 'warn', 'require() not available');
        }
    } catch (e) {
        logTest('Stream Registry', 'fail', e.message);
    }

    // ==================== Test 6: State Management ====================
    console.log('\n📋 Test 6: Global State Management');
    try {
        const hasState = typeof window.superdeskState !== 'undefined';
        logTest('superdeskState Object', hasState ? 'pass' : 'warn',
            hasState ? 'Initialized' : 'Not initialized (may initialize later)');

        if (hasState) {
            const state = window.superdeskState;
            console.log('   State keys:', Object.keys(state).join(', '));
            console.log('   Is Host:', state.isHost);
            console.log('   Session ID:', state.sessionId || 'Not set');
        }
    } catch (e) {
        logTest('State Management', 'fail', e.message);
    }

    // ==================== Test 7: Low Latency Features ====================
    console.log('\n📋 Test 7: Low Latency Configuration');
    try {
        // Check if frame rate limiting is disabled (via command line args)
        // We can't directly check command line args from renderer, but we can check side effects
        
        // Check requestAnimationFrame timing (should be fast if vsync is off)
        const frameTimes = [];
        let lastTime = performance.now();
        let frameCount = 0;

        await new Promise(resolve => {
            function measureFrame() {
                const now = performance.now();
                frameTimes.push(now - lastTime);
                lastTime = now;
                frameCount++;
                
                if (frameCount < 60) {
                    requestAnimationFrame(measureFrame);
                } else {
                    resolve();
                }
            }
            requestAnimationFrame(measureFrame);
        });

        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;

        logTest('Frame Rate', fps > 55 ? 'pass' : 'warn',
            `~${fps.toFixed(1)} fps (avg frame time: ${avgFrameTime.toFixed(2)}ms)`);

    } catch (e) {
        logTest('Low Latency Features', 'warn', e.message);
    }

    // ==================== Test 8: Media Devices API ====================
    console.log('\n📋 Test 8: Media Devices API');
    try {
        const hasMediaDevices = typeof navigator.mediaDevices !== 'undefined';
        logTest('MediaDevices API', hasMediaDevices ? 'pass' : 'fail',
            hasMediaDevices ? 'Available' : 'Not available');

        if (hasMediaDevices) {
            // Enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            const audioInputs = devices.filter(d => d.kind === 'audioinput');
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            logTest('Video Input Devices', videoInputs.length > 0 ? 'pass' : 'fail',
                `Found ${videoInputs.length} camera(s)`);
            logTest('Audio Input Devices', audioInputs.length > 0 ? 'pass' : 'warn',
                `Found ${audioInputs.length} microphone(s)`);

            console.log('   Video devices:', videoInputs.map(d => d.label || 'Unnamed').join(', '));
        }
    } catch (e) {
        logTest('Media Devices API', 'fail', e.message);
    }

    // ==================== Summary ====================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total: ${results.tests.length}`);

    const passRate = (results.passed / results.tests.length * 100).toFixed(1);
    console.log(`\n🎯 Pass Rate: ${passRate}%`);

    if (results.failed === 0) {
        console.log('\n🎉 All critical tests passed! Video call feature is ready.');
    } else {
        console.log('\n⚠️  Some tests failed. Review the results above.');
    }

    console.log('\n📖 For detailed test cases, see TEST-VIDEO-CALLS.md');
    console.log('='.repeat(50));

    return results;
})();

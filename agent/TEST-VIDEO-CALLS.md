# Video Call Feature Test Cases

## Test Environment Setup
- **Date**: December 31, 2025
- **Platform**: Windows
- **Components**: SuperDesk Agent (Electron)
- **Test Focus**: Video call functionality with ultra-low latency

---

## Test Case 1: Camera Overlay Always-On-Top Visibility
**Objective**: Verify camera overlays remain visible even when app is minimized

### Test Steps:
1. Start SuperDesk Agent
2. Create a session and enable local camera
3. Minimize the main application window
4. Check if local camera overlay remains visible
5. Open a fullscreen application (e.g., browser F11)
6. Verify camera overlay is still visible over fullscreen app

### Expected Results:
- ✅ Local camera overlay stays visible when app is minimized
- ✅ Remote camera overlay stays visible when app is minimized
- ✅ Both overlays visible over fullscreen applications
- ✅ Overlays can be dragged and resized

### Verification Points:
```javascript
// main.js line ~1042-1070
minimizable: false,  // Prevents minimizing
focusable: false,    // Don't steal focus
backgroundThrottling: false  // Keep video playing
setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
```

---

## Test Case 2: Low Latency Video Stream Quality
**Objective**: Verify video has minimal latency (< 100ms)

### Test Steps:
1. Start SuperDesk Agent as host
2. Join session from guest device
3. Enable camera on both sides
4. Perform real-time actions (wave hand, move object)
5. Measure perceived latency

### Expected Results:
- ✅ Latency < 100ms (appears instant)
- ✅ 60 FPS framerate (smooth motion)
- ✅ Clear video quality at 640x480 resolution

### Verification Points:
```javascript
// superdesk-webrtc.js line ~3652-3662
video: {
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 60, min: 30 },
    latency: { ideal: 0, max: 0.05 },
    resizeMode: 'none'
}

// Sender optimization line ~3695-3712
maxBitrate: 1500000,  // 1.5 Mbps
priority: 'high',
degradationPreference: 'maintain-framerate'
```

---

## Test Case 3: Dual Camera View Support
**Objective**: Verify both local and remote cameras display simultaneously

### Test Steps:
1. Start host session
2. Enable host camera
3. Guest joins session
4. Enable guest camera
5. Verify both camera overlays are visible

### Expected Results:
- ✅ Host sees their own camera (local overlay, bottom-left)
- ✅ Host sees guest's camera (remote overlay, bottom-right)
- ✅ Both overlays update in real-time
- ✅ No conflicts or flickering

### Verification Points:
```javascript
// main.js showLocalCameraOverlay() ~1025
x: 20, y: height - 170  // Bottom-left

// main.js showRemoteCameraOverlay() ~1090
x: width - 220, y: height - 170  // Bottom-right
```

---

## Test Case 4: Fast Camera State Detection
**Objective**: Verify instant camera on/off response

### Test Steps:
1. Start video call with camera off
2. Turn camera on
3. Measure time until overlay appears
4. Turn camera off
5. Measure time until overlay disappears

### Expected Results:
- ✅ Camera overlay appears within 200ms
- ✅ Camera overlay disappears immediately (< 100ms)
- ✅ No ghost overlays or stuck windows

### Verification Points:
```javascript
// camera-overlay.html line ~103
pollInterval: 200ms  // Faster polling

// viewer-popup.html line ~401
checkCameraOverlays() interval: 100ms
```

---

## Test Case 5: Hardware Acceleration
**Objective**: Verify GPU acceleration is enabled for video encoding/decoding

### Test Steps:
1. Start SuperDesk Agent
2. Open Chrome DevTools in Electron
3. Navigate to chrome://gpu
4. Check video acceleration status

### Expected Results:
- ✅ Hardware video decode: Enabled
- ✅ Hardware video encode: Enabled
- ✅ GPU rasterization: Enabled
- ✅ Zero-copy: Enabled

### Verification Points:
```javascript
// main.js line ~17-40
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('disable-frame-rate-limit')
app.commandLine.appendSwitch('enable-hardware-overlays')
```

---

## Test Case 6: Camera Overlay Lifecycle
**Objective**: Verify proper cleanup when camera stops or disconnects

### Test Steps:
1. Start video call with camera enabled
2. Stop camera stream
3. Verify overlay closes automatically
4. Restart camera
5. End session abruptly (close browser)
6. Verify overlay closes on both sides

### Expected Results:
- ✅ Overlay closes when camera is manually stopped
- ✅ Overlay closes when track ends
- ✅ No orphaned overlay windows
- ✅ Memory is properly released

### Verification Points:
```javascript
// camera-overlay.html line ~134-137
videoTrack.onended = () => {
    ipcRenderer.send('close-camera-overlay', 'remote')
}

// Health check line ~145-153
setInterval(() => {
    if (tracks[0].readyState === 'ended') {
        ipcRenderer.send('close-camera-overlay', 'remote')
    }
}, 1000)
```

---

## Test Case 7: Framerate Priority Over Quality
**Objective**: Verify video maintains 60fps even under poor network

### Test Steps:
1. Start video call with camera
2. Simulate network throttling (Chrome DevTools: Slow 3G)
3. Monitor framerate and quality
4. Verify framerate stays high while quality adapts

### Expected Results:
- ✅ Framerate maintained at 50-60fps
- ✅ Resolution drops if needed (adaptive)
- ✅ No freezing or stuttering
- ✅ Smooth motion throughout

### Verification Points:
```javascript
// superdesk-webrtc.js line ~3710
degradationPreference: 'maintain-framerate'
// Prioritizes FPS over resolution
```

---

## Performance Benchmarks

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Video Latency | < 100ms | _TBD_ | ⏳ |
| Camera On Delay | < 200ms | _TBD_ | ⏳ |
| Camera Off Delay | < 100ms | _TBD_ | ⏳ |
| Framerate (good network) | 60 fps | _TBD_ | ⏳ |
| Framerate (poor network) | > 30 fps | _TBD_ | ⏳ |
| CPU Usage (idle) | < 5% | _TBD_ | ⏳ |
| CPU Usage (video call) | < 25% | _TBD_ | ⏳ |
| Memory Usage | < 200 MB | _TBD_ | ⏳ |

---

## Automated Test Script

```javascript
// Run in Electron DevTools console

async function runVideoCallTests() {
    console.log('🧪 Starting Video Call Tests...\n');
    
    // Test 1: Check hardware acceleration
    console.log('Test 1: Hardware Acceleration');
    const gpuInfo = await navigator.gpu?.requestAdapter();
    console.log('GPU Available:', !!gpuInfo);
    
    // Test 2: Camera constraints
    console.log('\nTest 2: Camera Constraints');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640, max: 960 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 60, min: 30 }
            }
        });
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        console.log('✅ Camera Settings:', settings);
        console.log('   - Resolution:', settings.width + 'x' + settings.height);
        console.log('   - Framerate:', settings.frameRate);
        stream.getTracks().forEach(t => t.stop());
    } catch (e) {
        console.error('❌ Camera test failed:', e.message);
    }
    
    // Test 3: Verify IPC channels
    console.log('\nTest 3: IPC Channels');
    if (window.appControls) {
        console.log('✅ appControls available');
        console.log('   - ipcSend:', typeof window.appControls.ipcSend);
    } else {
        console.error('❌ appControls not available');
    }
    
    // Test 4: WebRTC capabilities
    console.log('\nTest 4: WebRTC Capabilities');
    const pc = new RTCPeerConnection();
    console.log('✅ RTCPeerConnection created');
    console.log('   - Signaling State:', pc.signalingState);
    
    if (RTCRtpSender.getCapabilities) {
        const videoCapabilities = RTCRtpSender.getCapabilities('video');
        console.log('   - Video codecs:', videoCapabilities.codecs.length);
        const vp8 = videoCapabilities.codecs.find(c => c.mimeType.includes('VP8'));
        const h264 = videoCapabilities.codecs.find(c => c.mimeType.includes('H264'));
        console.log('   - VP8 support:', !!vp8);
        console.log('   - H264 support:', !!h264);
    }
    pc.close();
    
    console.log('\n✅ All tests completed');
}

// Run the tests
runVideoCallTests();
```

---

## Manual Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Start agent: `npm run start`
- [ ] Create session and note session ID
- [ ] Join from another device using session ID
- [ ] Enable camera on host
- [ ] Verify local camera overlay appears (bottom-left)
- [ ] Enable camera on guest
- [ ] Verify remote camera overlay appears (bottom-right)
- [ ] Minimize main application window
- [ ] Confirm both overlays still visible
- [ ] Open fullscreen app (F11 in browser)
- [ ] Confirm overlays visible over fullscreen
- [ ] Drag overlay windows to new positions
- [ ] Resize overlay windows
- [ ] Wave hand in front of camera
- [ ] Verify < 100ms latency perceived
- [ ] Turn camera off on guest
- [ ] Verify remote overlay disappears immediately
- [ ] Turn camera back on
- [ ] Verify overlay reappears within 200ms
- [ ] End session
- [ ] Verify all overlays close properly

---

## Test Case 8: Bidirectional Camera - Role Verification
**Objective**: Verify both host and guest can see each other's cameras with correct labels

### Scenario A: User is HOST, Friend is GUEST
#### Test Steps:
1. User starts SuperDesk Agent and creates a session (User becomes HOST)
2. Friend joins the session using another device/instance (Friend becomes GUEST)
3. HOST enables their camera
4. GUEST should see HOST's camera overlay labeled "Remote Camera"
5. GUEST enables their camera  
6. HOST should see GUEST's camera overlay labeled "Remote Camera"
7. Both should see their own camera labeled "My Camera"

#### Expected Results:
- ✅ HOST sees their own camera overlay labeled "My Camera" (bottom-left)
- ✅ HOST sees GUEST's camera overlay labeled "Remote Camera" (bottom-right or popup)
- ✅ GUEST sees HOST's camera overlay labeled "Remote Camera"
- ✅ GUEST sees their own camera labeled "My Camera" (in viewer-popup)

### Scenario B: Roles Swapped - User is GUEST, Friend is HOST
#### Test Steps:
1. Friend starts SuperDesk Agent and creates a session (Friend becomes HOST)
2. User joins the session (User becomes GUEST)
3. Friend (HOST) enables their camera
4. User (GUEST) should see Friend's camera labeled "Remote Camera"
5. User (GUEST) enables their camera
6. Friend (HOST) should see User's camera labeled "Remote Camera"

#### Expected Results:
- ✅ Same behavior as Scenario A but with swapped roles
- ✅ Labels are consistent regardless of which person is host/guest
- ✅ Both parties can see both cameras simultaneously

### Verification Points:
```javascript
// Labels should be consistent:
// - Own camera: "My Camera"
// - Other person's camera: "Remote Camera"

// Files updated for consistent labeling:
// - guest-camera-popup.html: "Remote Camera"
// - host-camera-popup.html: "Remote Camera"  
// - viewer-popup.html: "Remote Camera" and "My Camera"
// - superdesk-webrtc.js: in-page overlay uses "Remote Camera"
// - main.js: local camera overlay uses "My Camera"
// - RemoteDesktopView.js (web client): "Remote Camera"
```

---

## Test Case 9: Cross-Platform Camera Support
**Objective**: Verify camera works between different client types

### Test Steps:
1. HOST uses SuperDesk Agent (Electron app)
2. GUEST uses web browser client (React app)
3. HOST enables camera
4. Verify GUEST sees camera in browser with label "Remote Camera"
5. Note: Web client may not have camera send capability yet

### Expected Results:
- ✅ Web client receives and displays HOST's camera correctly
- ✅ Label shows "Remote Camera" in web client overlay

---

## Test Case 10: Camera Stream State Persistence
**Objective**: Verify camera overlay state is maintained correctly when toggling

### Test Steps:
1. Establish connection between HOST and GUEST
2. HOST enables camera → overlay appears
3. HOST disables camera → overlay disappears
4. HOST enables camera again → overlay reappears
5. Repeat 3 times rapidly
6. GUEST does the same toggle sequence
7. Verify no ghost overlays or stream leaks

### Expected Results:
- ✅ Camera overlay appears/disappears instantly (< 200ms)
- ✅ No leftover overlays after disabling
- ✅ Stream properly released (check Task Manager for memory)
- ✅ Re-enabling camera works reliably every time

---

## Known Issues & Limitations

1. **Browser Compatibility**: Some features require Chromium-based browsers
2. **Network Requirements**: Best performance on > 2 Mbps connections
3. **Platform**: Optimized for Windows; may need adjustments for macOS/Linux

---

## Troubleshooting

### Overlay Not Appearing
- Check console for "show-local-camera-overlay" or "show-remote-camera-overlay" messages
- Verify stream registry has the camera stream
- Check if overlay window was created but hidden

### High Latency
- Check network connection quality
- Verify hardware acceleration is enabled (chrome://gpu)
- Reduce resolution in getUserMedia constraints
- Check CPU usage (should be < 25%)

### Overlay Disappears Randomly
- Check track lifecycle events (onended, onmute)
- Verify health check intervals are running
- Check for errors in overlay window console

---

## Test Results Summary

**Test Date**: _To be filled after testing_

**Overall Status**: ⏳ Pending

**Critical Issues**: _None identified in code review_

**Performance**: _To be measured_

**Recommendations**: 
1. Run tests on various network conditions (WiFi, 4G, throttled)
2. Test with multiple concurrent sessions
3. Monitor memory leaks during extended calls
4. Test camera quality degradation under load

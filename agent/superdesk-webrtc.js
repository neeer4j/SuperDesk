/* SuperDesk Remote Desktop - Complete WebRTC Implementation */

// Global state
window.superdeskState = {
    socket: null,
    webrtc: null,
    sessionId: null,
    isHost: false,
    guestConnected: false,
    sharingActive: false,
    remoteControlEnabled: false,
    serverUrl: window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://superdesk-7m7f.onrender.com'
};

// Initialize Socket.IO connection
async function initializeSocket() {
    if (window.superdeskState.socket && window.superdeskState.socket.connected) {
        return window.superdeskState.socket;
    }

    return new Promise((resolve, reject) => {
        const socket = io(window.superdeskState.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true
        });

        socket.on('connect', () => {
            console.log('✅ Connected to server');
            window.superdeskState.socket = socket;
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            reject(error);
        });

        // Session events
        socket.on('session-created', (data) => {
            console.log('Session created:', data.sessionId);
            window.superdeskState.sessionId = data.sessionId;
            document.getElementById('session-id').textContent = data.sessionId;
        });

        socket.on('guest-joined', (data) => {
            console.log('🎉 Guest joined!', data.guestId);
            window.superdeskState.guestConnected = true;
            showNotification('Guest Connected', 'A user has joined your session');
            enableShareButton();
        });

        socket.on('session-joined', () => {
            console.log('✅ Successfully joined session');
            showNotification('Connected', 'Waiting for host to share screen...');
        });

        socket.on('session-error', (error) => {
            console.error('Session error:', error);
            alert(`Error: ${error}`);
        });

        socket.on('session-ended', () => {
            console.log('Session ended');
            endSession();
        });

        // Handle incoming mouse events (when guest controls our mouse)
        // TODO: Implement via IPC to main process since nut-js can't be used in renderer
        socket.on('mouse-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            console.log('Received mouse event (handler not yet implemented):', data.type);
            // Remote control functionality requires IPC setup
            // Will be implemented in next update
        });

        // Handle incoming keyboard events (when guest types on our keyboard)
        // TODO: Implement via IPC to main process since nut-js can't be used in renderer
        socket.on('keyboard-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            console.log('Received keyboard event (handler not yet implemented):', data.type, data.key);
            // Remote control functionality requires IPC setup
            // Will be implemented in next update
        });
    });
}

// Create session (Host)
async function createSession() {
    try {
        const socket = await initializeSocket();
        window.superdeskState.isHost = true;
        
        socket.emit('create-session', { type: 'agent' });
        
        console.log('Creating session...');
    } catch (error) {
        console.error('Failed to create session:', error);
        alert('Failed to create session. Check your internet connection.');
    }
}

// Join session (Guest)
async function joinSession(sessionId) {
    if (!sessionId || sessionId.length !== 8) {
        alert('Please enter a valid 8-character session ID');
        return;
    }

    try {
        const socket = await initializeSocket();
        window.superdeskState.isHost = false;
        window.superdeskState.sessionId = sessionId;

        socket.emit('join-session', sessionId);
        
        // Setup WebRTC for receiving
        await setupWebRTCReceiver(socket, sessionId);
        
        console.log('Joining session:', sessionId);
    } catch (error) {
        console.error('Failed to join session:', error);
        alert('Failed to join session: ' + error.message);
    }
}

// Setup WebRTC for host (sender)
async function setupWebRTCSender(socket, sessionId, sourceId) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });

    // Get screen stream
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId
            }
        }
    });

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        }
    };

    // Listen for answer from guest
    socket.on('answer', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    // Listen for ICE candidates from guest
    socket.on('ice-candidate', async (data) => {
        if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('offer', {
        sessionId,
        offer
    });

    window.superdeskState.webrtc = { peerConnection, stream };
    window.superdeskState.sharingActive = true;

    console.log('✅ Screen sharing started');
    return peerConnection;
}

// Setup WebRTC for guest (receiver)
async function setupWebRTCReceiver(socket, sessionId) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
        console.log('📺 Received remote stream');
        displayRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        }
    };

    // Listen for offer from host
    socket.on('offer', async (data) => {
        console.log('Received offer from host');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
            sessionId,
            targetId: data.from,
            answer
        });
    });

    // Listen for ICE candidates from host
    socket.on('ice-candidate', async (data) => {
        if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    window.superdeskState.webrtc = { peerConnection };
    return peerConnection;
}

// Display remote stream
function displayRemoteStream(stream) {
    let videoContainer = document.getElementById('remote-video-container');
    
    if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.id = 'remote-video-container';
        videoContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const video = document.createElement('video');
        video.id = 'remote-video';
        video.autoplay = true;
        video.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
        `;
        video.srcObject = stream;
        
        // Control panel
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            gap: 10px;
        `;
        
        // Fullscreen button
        const fullscreenBtn = createButton('⛶ Fullscreen', () => {
            if (!document.fullscreenElement) {
                videoContainer.requestFullscreen();
                fullscreenBtn.textContent = '⛶ Exit Fullscreen';
            } else {
                document.exitFullscreen();
                fullscreenBtn.textContent = '⛶ Fullscreen';
            }
        });
        
        // Remote control toggle
        const controlBtn = createButton('🖱️ Enable Control', () => {
            if (window.superdeskState.remoteControlEnabled) {
                disableRemoteControl();
                controlBtn.textContent = '🖱️ Enable Control';
            } else {
                enableRemoteControl();
                controlBtn.textContent = '🖱️ Disable Control';
            }
        });
        
        // End session button
        const endBtn = createButton('✕ End Session', () => {
            endSession();
        }, '#dc2626');
        
        controls.appendChild(fullscreenBtn);
        controls.appendChild(controlBtn);
        controls.appendChild(endBtn);
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(controls);
        document.body.appendChild(videoContainer);
    }
}

// Helper to create button
function createButton(text, onClick, bgColor = '#613da9') {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        padding: 12px 24px;
        background: ${bgColor};
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
    `;
    btn.onclick = onClick;
    return btn;
}

// Start screen share (Host)
async function startScreenShare() {
    if (!window.superdeskState.guestConnected) {
        alert('No guest connected yet. Please wait for someone to join your session.');
        return;
    }

    try {
        // Get available sources using exposed API from preload
        if (!window.appControls || !window.appControls.getDesktopSources) {
            throw new Error('Desktop capture API not available. Please restart the app.');
        }

        const sources = await window.appControls.getDesktopSources({
            types: ['screen', 'window']
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }

        // For now, use the first screen source (primary display)
        // TODO: Add UI for source selection
        const primaryScreen = sources.find(s => s.name.includes('Entire screen') || s.name.includes('Screen 1')) || sources[0];

        await setupWebRTCSender(
            window.superdeskState.socket,
            window.superdeskState.sessionId,
            primaryScreen.id
        );

        showNotification('Sharing Started', 'Your screen is now being shared');
        document.getElementById('start-share-btn').textContent = 'Stop Sharing';
        document.getElementById('start-share-btn').style.background = '#dc2626';

    } catch (error) {
        console.error('Failed to start screen share:', error);
        alert('Failed to start screen sharing: ' + error.message);
    }
}

// Enable remote control
function enableRemoteControl() {
    window.superdeskState.remoteControlEnabled = true;
    window.superdeskState.socket.emit('enable-remote-control', {
        sessionId: window.superdeskState.sessionId
    });
    
    // Setup mouse/keyboard event capture
    const video = document.getElementById('remote-video');
    if (video) {
        video.addEventListener('mousemove', handleMouseMove);
        video.addEventListener('mousedown', handleMouseDown);
        video.addEventListener('mouseup', handleMouseUp);
        video.addEventListener('click', handleMouseClick);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    console.log('Remote control enabled');
}

// Disable remote control
function disableRemoteControl() {
    window.superdeskState.remoteControlEnabled = false;
    window.superdeskState.socket.emit('disable-remote-control', {
        sessionId: window.superdeskState.sessionId
    });
    
    const video = document.getElementById('remote-video');
    if (video) {
        video.removeEventListener('mousemove', handleMouseMove);
        video.removeEventListener('mousedown', handleMouseDown);
        video.removeEventListener('mouseup', handleMouseUp);
        video.removeEventListener('click', handleMouseClick);
    }
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    console.log('Remote control disabled');
}

// Mouse event handlers
function handleMouseMove(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'move',
        x,
        y
    });
}

function handleMouseClick(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'click',
        button: e.button
    });
}

function handleMouseDown(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'down',
        button: e.button
    });
}

function handleMouseUp(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'up',
        button: e.button
    });
}

// Keyboard event handlers
function handleKeyDown(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    e.preventDefault();
    window.superdeskState.socket.emit('keyboard-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'down',
        key: e.key,
        code: e.code,
        modifiers: {
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey
        }
    });
}

function handleKeyUp(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    e.preventDefault();
    window.superdeskState.socket.emit('keyboard-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'up',
        key: e.key,
        code: e.code
    });
}

// End session
function endSession() {
    if (window.superdeskState.socket) {
        window.superdeskState.socket.emit('end-session', window.superdeskState.sessionId);
    }
    
    // Cleanup
    if (window.superdeskState.webrtc) {
        if (window.superdeskState.webrtc.stream) {
            window.superdeskState.webrtc.stream.getTracks().forEach(track => track.stop());
        }
        if (window.superdeskState.webrtc.peerConnection) {
            window.superdeskState.webrtc.peerConnection.close();
        }
    }
    
    const videoContainer = document.getElementById('remote-video-container');
    if (videoContainer) {
        videoContainer.remove();
    }
    
    // Reset state
    window.superdeskState.guestConnected = false;
    window.superdeskState.sharingActive = false;
    window.superdeskState.remoteControlEnabled = false;
    window.superdeskState.webrtc = null;
    
    // Reset UI
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.textContent = 'Start Screen Share';
        shareBtn.style.background = '#613da9';
        shareBtn.disabled = true;
        shareBtn.style.opacity = '0.5';
    }
    
    showNotification('Session Ended', 'The remote desktop session has ended');
}

// Enable share button when guest connects
function enableShareButton() {
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.style.opacity = '1';
        shareBtn.style.cursor = 'pointer';
    }
}

// Show notification
function showNotification(title, message) {
    // Simple alert for now
    // TODO: Implement better notification UI
    console.log(`${title}: ${message}`);
    if (typeof alert !== 'undefined') {
        alert(`${title}\n\n${message}`);
    }
}

// Export functions
window.createSession = createSession;
window.joinSession = joinSession;
window.startScreenShare = startScreenShare;
window.endSession = endSession;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        createSession(); // Auto-create session for host
    });
} else {
    createSession();
}

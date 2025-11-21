/* SuperDesk WebRTC - Clean Implementation */

// Global state
window.superdeskState = {
    socket: null,
    peerConnection: null,
    sessionId: null,
    isHost: false,
    isConnected: false,
    remoteControlEnabled: false,
    serverUrl: 'https://superdesk-7m7f.onrender.com'
};

// Initialize Socket.IO
async function initializeSocket() {
    return new Promise((resolve, reject) => {
        if (window.superdeskState.socket?.connected) {
            resolve(window.superdeskState.socket);
            return;
        }

        const socket = io(window.superdeskState.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true
        });

        socket.on('connect', () => {
            console.log('✅ Connected to server');
            window.superdeskState.socket = socket;
            setupSocketListeners(socket);
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            reject(error);
        });
    });
}

// Setup socket event listeners
function setupSocketListeners(socket) {
    // Session events
    socket.on('session-created', (data) => {
        console.log('📝 Session created:', data.sessionId);
        window.superdeskState.sessionId = data.sessionId;
        const sessionIdEl = document.getElementById('session-id');
        if (sessionIdEl) sessionIdEl.textContent = data.sessionId;
    });

    socket.on('guest-joined', (data) => {
        console.log('👤 Guest joined:', data.guestId);
        const shareBtn = document.getElementById('start-share-btn');
        if (shareBtn) {
            shareBtn.disabled = false;
            shareBtn.style.opacity = '1';
        }
        alert('A guest has joined your session! You can now start sharing.');
    });

    socket.on('session-joined', () => {
        console.log('✅ Joined session successfully');
        window.superdeskState.isConnected = true;
        const connectBtn = document.getElementById('connect-session-btn');
        if (connectBtn) {
            connectBtn.textContent = '✓ Connected';
            connectBtn.style.background = '#10b981';
            connectBtn.disabled = true;
        }
    });

    socket.on('session-error', (error) => {
        console.error('❌ Session error:', error);
        alert('Error: ' + error);
    });

    // Remote control events
    socket.on('mouse-event', (data) => {
        if (!window.superdeskState.isHost) return;
        if (window.appControls?.ipcSend) {
            window.appControls.ipcSend('robot-mouse-event', {
                type: data.type === 'move' ? 'mousemove' : data.type === 'down' ? 'mousedown' : 'mouseup',
                x: data.x * 1920,
                y: data.y * 1080,
                button: data.button || 0
            });
        }
    });

    socket.on('keyboard-event', (data) => {
        if (!window.superdeskState.isHost) return;
        if (window.appControls?.ipcSend) {
            window.appControls.ipcSend('robot-keyboard-event', {
                type: data.type,
                key: data.key,
                code: data.code
            });
        }
    });
}

// Create session (Host)
async function createSession() {
    try {
        const socket = await initializeSocket();
        window.superdeskState.isHost = true;
        socket.emit('create-session', { type: 'desktop-sharing' });
        console.log('🔵 Creating session...');
    } catch (error) {
        console.error('Failed to create session:', error);
        alert('Failed to create session: ' + error.message);
    }
}

// Join session (Guest)
async function joinSession(sessionId) {
    if (!sessionId || sessionId.length !== 8) {
        alert('Please enter a valid 8-character session ID');
        return;
    }

    try {
        const connectBtn = document.getElementById('connect-session-btn');
        if (connectBtn) {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;
        }

        const socket = await initializeSocket();
        window.superdeskState.isHost = false;
        window.superdeskState.sessionId = sessionId;

        // Setup WebRTC receiver BEFORE joining
        await setupWebRTCReceiver(socket, sessionId);

        // Now join the session
        socket.emit('join-session', sessionId);
        console.log('🔵 Joining session:', sessionId);
    } catch (error) {
        console.error('Failed to join session:', error);
        alert('Failed to join session: ' + error.message);
        const connectBtn = document.getElementById('connect-session-btn');
        if (connectBtn) {
            connectBtn.textContent = 'Connect to Session';
            connectBtn.disabled = false;
        }
    }
}

// Start screen share (Host)
async function startScreenShare() {
    try {
        console.log('🎬 Starting screen share...');

        // Get desktop sources
        const sources = await window.appControls.getDesktopSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 300, height: 200 }
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }

        // For simplicity, auto-select first screen
        const screen = sources.find(s => s.id.startsWith('screen:')) || sources[0];
        console.log('📺 Selected source:', screen.id);

        await setupWebRTCSender(window.superdeskState.socket, window.superdeskState.sessionId, screen.id);
    } catch (error) {
        console.error('Failed to start screen share:', error);
        alert('Failed to start screen share: ' + error.message);
    }
}

// Setup WebRTC Sender (Host)
async function setupWebRTCSender(socket, sessionId, sourceId) {
    console.log('🔄 Setting up WebRTC sender...');

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

    // Add stream tracks
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
        console.log('➕ Added track:', track.kind);
    });

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        }
    };

    // Listen for answer
    socket.on('answer', async (data) => {
        console.log('📨 Received answer');
        if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('✅ Remote description set');
        }
    });

    // Listen for ICE candidates
    socket.on('ice-candidate', async (data) => {
        if (data.candidate && peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('offer', { sessionId, offer });
    console.log('📤 Offer sent');

    window.superdeskState.peerConnection = peerConnection;
    alert('Screen sharing started!');
}

// Setup WebRTC Receiver (Guest)
async function setupWebRTCReceiver(socket, sessionId) {
    console.log('🔄 Setting up WebRTC receiver...');

    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
        console.log('📺 Received stream!');
        const stream = event.streams[0];
        
        // Display video
        const videoContainer = document.getElementById('join-video-container');
        const video = document.getElementById('join-remote-video');
        
        if (videoContainer && video) {
            video.srcObject = stream;
            video.play();
            videoContainer.classList.remove('hidden');
            console.log('✅ Video displayed');
        }
    };

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        }
    };

    // Listen for offer
    socket.on('offer', async (data) => {
        console.log('📨 Received offer');
        if (peerConnection.signalingState === 'stable') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('answer', {
                sessionId,
                targetId: data.from,
                answer
            });
            console.log('📤 Answer sent');
        }
    });

    // Listen for ICE candidates
    socket.on('ice-candidate', async (data) => {
        if (data.candidate && peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    window.superdeskState.peerConnection = peerConnection;
}

// Remote control functions
function enableRemoteControl() {
    window.superdeskState.remoteControlEnabled = true;
    const video = document.getElementById('join-remote-video');
    
    if (video) {
        video.addEventListener('mousemove', handleMouseMove);
        video.addEventListener('mousedown', handleMouseDown);
        video.addEventListener('mouseup', handleMouseUp);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    console.log('🖱️ Remote control enabled');
}

function disableRemoteControl() {
    window.superdeskState.remoteControlEnabled = false;
    const video = document.getElementById('join-remote-video');
    
    if (video) {
        video.removeEventListener('mousemove', handleMouseMove);
        video.removeEventListener('mousedown', handleMouseDown);
        video.removeEventListener('mouseup', handleMouseUp);
    }
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    console.log('🖱️ Remote control disabled');
}

function handleMouseMove(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'move',
        x, y
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

function handleKeyDown(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    e.preventDefault();
    window.superdeskState.socket.emit('keyboard-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'down',
        key: e.key,
        code: e.code
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
    if (window.superdeskState.peerConnection) {
        window.superdeskState.peerConnection.close();
    }
    if (window.superdeskState.socket) {
        window.superdeskState.socket.emit('end-session', window.superdeskState.sessionId);
    }
    location.reload();
}

// Export functions
window.createSession = createSession;
window.joinSession = joinSession;
window.startScreenShare = startScreenShare;
window.enableRemoteControl = enableRemoteControl;
window.disableRemoteControl = disableRemoteControl;
window.endSession = endSession;

// Auto-create session on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSession);
} else {
    createSession();
}

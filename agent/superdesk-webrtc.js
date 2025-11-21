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
            window.superdeskState.guestConnected = true;
            updateJoinButtonState('connected');
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
        socket.on('mouse-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            
            try {
                // Use IPC to send mouse events to main process for nut-js execution
                if (window.appControls && window.appControls.ipcSend) {
                    window.appControls.ipcSend('robot-mouse-event', {
                        type: data.type === 'move' ? 'mousemove' : data.type === 'down' ? 'mousedown' : 'mouseup',
                        x: data.x * 1920, // Scale to reference width
                        y: data.y * 1080, // Scale to reference height
                        button: data.button || 0
                    });
                }
            } catch (err) {
                console.error('Failed to send mouse event to main process:', err);
            }
        });

        // Handle incoming keyboard events (when guest types on our keyboard)
        socket.on('keyboard-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            
            try {
                // Use IPC to send keyboard events to main process for nut-js execution
                if (window.appControls && window.appControls.ipcSend) {
                    window.appControls.ipcSend('robot-keyboard-event', {
                        type: data.type, // 'keydown' or 'keyup'
                        key: data.key,
                        code: data.code
                    });
                }
            } catch (err) {
                console.error('Failed to send keyboard event to main process:', err);
            }
        });

        // Handle enable/disable remote control from guest
        socket.on('enable-remote-control', (data) => {
            if (!window.superdeskState.isHost) return;
            
            console.log('Guest enabled remote control');
            if (window.appControls && window.appControls.ipcSend) {
                window.appControls.ipcSend('robot-set-enabled', true);
            }
        });

        socket.on('disable-remote-control', (data) => {
            if (!window.superdeskState.isHost) return;
            
            console.log('Guest disabled remote control');
            if (window.appControls && window.appControls.ipcSend) {
                window.appControls.ipcSend('robot-set-enabled', false);
                window.appControls.ipcSend('robot-release-keys');
            }
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
        updateJoinButtonState('connecting');
        
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
        updateJoinButtonState('disconnected');
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

    // Get screen stream using Electron's desktopCapturer
    // Note: sourceId must be from desktopCapturer.getSources()
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    maxWidth: 1920,
                    minHeight: 720,
                    maxHeight: 1080,
                    minFrameRate: 15,
                    maxFrameRate: 30
                }
            }
        });
    } catch (err) {
        console.error('getUserMedia failed:', err);
        throw new Error('Failed to capture screen: ' + err.message + '. Make sure you selected a valid source.');
    }

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
        console.log('Added track:', track.kind, track.label);
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
    socket.once('answer', async (data) => {
        if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('✅ Remote description set');
        } else {
            console.warn('Ignoring answer in wrong state:', peerConnection.signalingState);
        }
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
        const stream = event.streams[0];
        
        // Show video in join-view container
        const videoContainer = document.getElementById('join-video-container');
        const video = document.getElementById('join-remote-video');
        
        if (videoContainer && video) {
            video.srcObject = stream;
            video.play().catch(e => console.log('Auto-play handled'));
            videoContainer.classList.remove('hidden');
            console.log('✅ Video shown in join session area');
        } else {
            console.error('❌ Join video elements not found');
        }
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
    socket.once('offer', async (data) => {
        console.log('Received offer from host');
        if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'have-remote-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('answer', {
                sessionId,
                targetId: data.from,
                answer
            });
            console.log('✅ Answer sent to host');
        } else {
            console.warn('Ignoring offer in wrong state:', peerConnection.signalingState);
        }
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

// Display remote stream - now handled by HTML viewer
// Video display is managed by the remote-desktop-viewer div in agent.html

// Start screen share (Host)
// Global variable to store available sources and selected source
window.availableSources = {
    screens: [],
    windows: [],
    selected: null,
    currentTab: 'screens'
};

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
            types: ['screen', 'window'],
            thumbnailSize: { width: 300, height: 200 }
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }

        // Separate screens and windows
        window.availableSources.screens = sources.filter(s => s.id.startsWith('screen:'));
        window.availableSources.windows = sources.filter(s => s.id.startsWith('window:'));

        // Show source selection modal
        showSourceSelectionModal();

    } catch (error) {
        console.error('Failed to start screen share:', error);
        alert('Failed to start screen sharing: ' + error.message);
    }
}

function showSourceSelectionModal() {
    const modal = document.getElementById('source-selection-modal');
    modal.classList.remove('hidden');
    
    // Show screens tab by default
    switchSourceTab('screens');
}

function closeSourceModal() {
    const modal = document.getElementById('source-selection-modal');
    modal.classList.add('hidden');
    window.availableSources.selected = null;
}

function switchSourceTab(tab) {
    window.availableSources.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.source-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Render sources for the selected tab
    renderSources(tab);
}

function renderSources(tab) {
    const sourceList = document.getElementById('source-list');
    const sources = tab === 'screens' ? window.availableSources.screens : window.availableSources.windows;
    
    if (sources.length === 0) {
        sourceList.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">No ' + tab + ' available</div>';
        return;
    }
    
    sourceList.innerHTML = sources.map((source, index) => `
        <div class="source-item" data-source-id="${source.id}" onclick="selectSourceAndConfirm('${source.id}')">
            <img src="${source.thumbnail.toDataURL()}" class="source-thumbnail" alt="${source.name}">
            <div class="source-name">${source.name}</div>
        </div>
    `).join('');
}

function selectSource(sourceId) {
    window.availableSources.selected = sourceId;
    
    // Update visual selection
    document.querySelectorAll('.source-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.sourceId === sourceId);
    });
    
    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-share-btn');
    if (confirmBtn) confirmBtn.disabled = false;
}

// Select source and immediately confirm (used when clicking a source item)
function selectSourceAndConfirm(sourceId) {
    if (!sourceId) {
        console.error('selectSourceAndConfirm called with invalid sourceId:', sourceId);
        return;
    }
    window.availableSources.selected = sourceId;
    console.log('Source selected:', sourceId);
    confirmSourceSelection();
}

async function confirmSourceSelection() {
    if (!window.availableSources.selected) {
        console.error('No source selected');
        alert('Please select a screen or window to share');
        return;
    }
    
    try {
        const selectedSourceId = window.availableSources.selected;
        console.log('Starting screen share with sourceId:', selectedSourceId);
        
        closeSourceModal();
        
        await setupWebRTCSender(
            window.superdeskState.socket,
            window.superdeskState.sessionId,
            selectedSourceId
        );

        showNotification('Sharing Started', 'Your screen is now being shared');
        document.getElementById('start-share-btn').textContent = 'Stop Sharing';
        document.getElementById('start-share-btn').style.background = '#dc2626';

    } catch (error) {
        console.error('Failed to start screen sharing:', error);
        alert('Failed to start screen sharing: ' + error.message);
    }
}

// Enable remote control
function enableRemoteControl() {
    window.superdeskState.remoteControlEnabled = true;
    window.superdeskState.socket.emit('enable-remote-control', {
        sessionId: window.superdeskState.sessionId
    });
    
    // Setup mouse/keyboard event capture on both video elements
    const video = document.getElementById('remote-video');
    const joinVideo = document.getElementById('join-remote-video');
    
    if (video) {
        video.addEventListener('mousemove', handleMouseMove);
        video.addEventListener('mousedown', handleMouseDown);
        video.addEventListener('mouseup', handleMouseUp);
        video.addEventListener('click', handleMouseClick);
    }
    
    if (joinVideo) {
        joinVideo.addEventListener('mousemove', handleMouseMove);
        joinVideo.addEventListener('mousedown', handleMouseDown);
        joinVideo.addEventListener('mouseup', handleMouseUp);
        joinVideo.addEventListener('click', handleMouseClick);
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
    const joinVideo = document.getElementById('join-remote-video');
    
    if (video) {
        video.removeEventListener('mousemove', handleMouseMove);
        video.removeEventListener('mousedown', handleMouseDown);
        video.removeEventListener('mouseup', handleMouseUp);
        video.removeEventListener('click', handleMouseClick);
    }
    
    if (joinVideo) {
        joinVideo.removeEventListener('mousemove', handleMouseMove);
        joinVideo.removeEventListener('mousedown', handleMouseDown);
        joinVideo.removeEventListener('mouseup', handleMouseUp);
        joinVideo.removeEventListener('click', handleMouseClick);
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

// Update join button state
function updateJoinButtonState(state) {
    const joinBtn = document.getElementById('connect-session-btn');
    if (!joinBtn) return;
    
    if (state === 'connected') {
        joinBtn.textContent = '✓ Connected';
        joinBtn.style.background = '#10b981';
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.8';
    } else if (state === 'connecting') {
        joinBtn.textContent = 'Connecting...';
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.7';
    } else {
        joinBtn.textContent = 'Connect to Session';
        joinBtn.style.background = '#613da9';
        joinBtn.disabled = false;
        joinBtn.style.opacity = '1';
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
window.selectSourceAndConfirm = selectSourceAndConfirm;
window.confirmSourceSelection = confirmSourceSelection;
window.enableRemoteControl = enableRemoteControl;
window.disableRemoteControl = disableRemoteControl;
window.endSession = endSession;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        createSession(); // Auto-create session for host
    });
} else {
    createSession();
}

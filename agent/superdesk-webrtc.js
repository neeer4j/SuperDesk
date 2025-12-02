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

// Fetch TURN/STUN configuration from server
async function fetchWebRTCConfig() {
    try {
        console.log('🔧 Fetching WebRTC config from server...');
        const response = await fetch(`${window.superdeskState.serverUrl}/api/webrtc-config`);
        
        if (!response.ok) {
            console.warn('⚠️ Failed to fetch WebRTC config from server, using fallback TURN servers');
            return getFallbackIceServers();
        }
        
        const config = await response.json();
        console.log('✅ Received WebRTC config from server:', config);
        
        if (config.iceServers && config.iceServers.length > 0) {
            console.log('🎯 Using Cloudflare TURN servers:', config.iceServers.length, 'servers');
            return config.iceServers;
        } else {
            console.warn('⚠️ Server returned empty ICE servers, using fallback');
            return getFallbackIceServers();
        }
    } catch (error) {
        console.error('❌ Error fetching WebRTC config:', error);
        console.log('🔄 Using fallback TURN servers');
        return getFallbackIceServers();
    }
}

// Fallback ICE servers if server config fails
function getFallbackIceServers() {
    return [
        // Google STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // OpenRelay TURN servers (Free public TURN)
        {
            urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:80?transport=tcp'],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        // Numb TURN servers
        {
            urls: ['turn:numb.viagenie.ca', 'turn:numb.viagenie.ca:3478'],
            username: 'webrtc@live.com',
            credential: 'muazkh'
        }
    ];
}

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
            if (window.superdeskModal) {
                window.superdeskModal.error(`${error}`, 'Session Error');
            }
        });

        socket.on('session-ended', () => {
            console.log('Session ended');
            endSession();
        });

        // Handle incoming mouse events (when guest controls our mouse)
        socket.on('mouse-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            
            console.log('🖱️ HOST received mouse event:', { type: data.type, x: data.x, y: data.y, button: data.button });
            
            try {
                // Use IPC to send mouse events to main process for nut-js execution
                // data.x and data.y are already normalized (0..1), pass them directly
                if (window.appControls && window.appControls.ipcSend) {
                    window.appControls.ipcSend('robot-mouse-event', {
                        type: data.type,  // Keep original type: 'move', 'down', 'up', 'click'
                        x: data.x,        // Already normalized 0..1
                        y: data.y,        // Already normalized 0..1
                        button: data.button || 0
                    });
                    console.log('✅ HOST sent IPC robot-mouse-event');
                } else {
                    console.error('❌ window.appControls.ipcSend not available');
                }
            } catch (err) {
                console.error('Failed to send mouse event to main process:', err);
            }
        });

        // Handle incoming keyboard events (when guest types on our keyboard)
        socket.on('keyboard-event', async (data) => {
            if (!window.superdeskState.isHost) return;
            
            console.log('⌨️ HOST received keyboard event:', { type: data.type, key: data.key, code: data.code });
            
            try {
                // Use IPC to send keyboard events to main process for nut-js execution
                if (window.appControls && window.appControls.ipcSend) {
                    window.appControls.ipcSend('robot-keyboard-event', {
                        type: data.type === 'down' ? 'keydown' : 'keyup',  // Map 'down'/'up' to 'keydown'/'keyup'
                        key: data.key,
                        code: data.code
                    });
                    console.log('✅ HOST sent IPC robot-keyboard-event');
                } else {
                    console.error('❌ window.appControls.ipcSend not available');
                }
            } catch (err) {
                console.error('Failed to send keyboard event to main process:', err);
            }
        });

        // Handle enable/disable remote control notifications from server
        // Server emits 'remote-control-enabled' / 'remote-control-disabled' to the host
        socket.on('remote-control-enabled', (data) => {
            if (!window.superdeskState.isHost) return;

            console.log('Guest enabled remote control (server notification)');
            if (window.appControls && window.appControls.ipcSend) {
                // Refresh screen size to get current dimensions
                window.appControls.ipcSend('robot-refresh-screen-size');
                // Enable remote control
                window.appControls.ipcSend('robot-set-enabled', true);
            }
        });

        socket.on('remote-control-disabled', (data) => {
            if (!window.superdeskState.isHost) return;

            console.log('Guest disabled remote control (server notification)');
            if (window.appControls && window.appControls.ipcSend) {
                window.appControls.ipcSend('robot-set-enabled', false);
                window.appControls.ipcSend('robot-release-keys');
            }
        });

        // Host stopped sharing - guest should stop sending events and show exit UI
        socket.on('host-stopped-sharing', () => {
            console.log('🛑 Host stopped sharing - disabling remote control');
            if (!window.superdeskState.isHost) {
                // Disable remote control
                if (window.superdeskState.remoteControlEnabled) {
                    disableRemoteControl();
                }
                
                // Reset control button to default state
                const controlBtn = document.getElementById('control-toggle-btn');
                if (controlBtn) {
                    controlBtn.textContent = '🖱️ Enable Control';
                    controlBtn.style.background = 'rgba(255,255,255,0.15)';
                }
                const indicator = document.getElementById('control-indicator');
                if (indicator) indicator.style.display = 'none';
                
                // Show "Sharing Ended" overlay on the popup
                showSharingEndedOverlay();
            }
        });
    });
}

// Show overlay when host stops sharing
function showSharingEndedOverlay() {
    const popup = document.getElementById('remote-desktop-popup');
    if (!popup || popup.style.display === 'none') return;
    
    // Ensure guest cursor is visible
    const joinVideo = document.getElementById('join-remote-video');
    if (joinVideo) {
        joinVideo.classList.remove('control-active');
        joinVideo.style.cursor = 'default';
    }
    
    // Make sure body cursor is visible
    document.body.style.cursor = 'default';
    
    // Hide controls bar
    const controls = document.getElementById('popup-controls');
    if (controls) controls.style.display = 'none';
    
    // Create overlay with visible cursor
    let overlay = document.getElementById('sharing-ended-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sharing-ended-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 1000003; cursor: default;';
        overlay.innerHTML = `
            <div style="text-align: center; cursor: default;">
                <div style="font-size: 64px; margin-bottom: 20px;">🛑</div>
                <div style="color: white; font-size: 24px; font-weight: 600; margin-bottom: 12px;">Screen Sharing Ended</div>
                <div style="color: #9ca3af; font-size: 14px; margin-bottom: 30px;">The host has stopped sharing their screen</div>
                <button id="exit-session-btn" style="padding: 12px 32px; background: #613da9; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 16px; font-weight: 500; transition: background 0.2s;">
                    Exit Session
                </button>
            </div>
        `;
        popup.appendChild(overlay);
        
        // Add click handler for exit button
        document.getElementById('exit-session-btn').addEventListener('click', () => {
            if (typeof window.hideRemoteDesktopPopup === 'function') {
                window.hideRemoteDesktopPopup();
            }
            overlay.remove();
            // Show controls again for next session
            if (controls) controls.style.display = 'flex';
        });
    }
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
        if (window.superdeskModal) {
            window.superdeskModal.error('Failed to create session. Check your internet connection.', 'Connection Error');
        }
    }
}

// Join session (Guest)
async function joinSession(sessionId) {
    if (!sessionId || sessionId.length !== 8) {
        if (window.superdeskModal) {
            window.superdeskModal.warning('Please enter a valid 8-character session ID', 'Invalid Session ID');
        }
        return;
    }

    try {
        console.log('🔄 ========== JOINING SESSION ==========');
        console.log('🔄 Session ID:', sessionId);
        updateJoinButtonState('connecting');
        
        // Update placeholder to show connecting state
        const placeholder = document.getElementById('stream-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🔄</div>
                    <div style="font-size: 14px; color: #10b981; margin-bottom: 8px;">Connecting to host...</div>
                    <div style="font-size: 12px; color: #6b7280;">Setting up secure connection</div>
                </div>
            `;
        }
        
        const socket = await initializeSocket();
        window.superdeskState.isHost = false;
        window.superdeskState.sessionId = sessionId;

        // CRITICAL: Setup WebRTC receiver FIRST, then join
        // This ensures the 'offer' listener is ready before the host sends it
        console.log('🔄 Setting up WebRTC receiver BEFORE joining...');
        await setupWebRTCReceiver(socket, sessionId);
        console.log('✅ WebRTC receiver ready');
        
        console.log('🔄 Now emitting join-session...');
        socket.emit('join-session', sessionId);
        console.log('✅ Join request sent');
        
        console.log('✅ ========== JOIN COMPLETE ==========');
    } catch (error) {
        console.error('❌ Failed to join session:', error);
        if (window.superdeskModal) {
            window.superdeskModal.error('Failed to join session: ' + error.message, 'Join Failed');
        }
        updateJoinButtonState('disconnected');
        
        // Show error in placeholder
        const placeholder = document.getElementById('stream-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">❌</div>
                    <div style="font-size: 14px; color: #ef4444; margin-bottom: 8px;">Connection failed</div>
                    <div style="font-size: 12px; color: #6b7280;">${error.message}</div>
                </div>
            `;
        }
    }
}

// Setup WebRTC for host (sender)
async function setupWebRTCSender(socket, sessionId, sourceId) {
    console.log('🎥 ========== SETTING UP HOST (SENDER) ==========');
    console.log('🎥 Session ID:', sessionId);
    console.log('🎥 Source ID:', sourceId);
    
    console.log('🔧 Fetching ICE servers from backend...');
    const iceServers = await fetchWebRTCConfig();
    
    console.log('🔧 Configuring RTCPeerConnection with', iceServers.length, 'ICE servers');
    const peerConnection = new RTCPeerConnection({
        iceServers: iceServers,
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    });
    
    console.log('✅ HOST ICE configuration complete with Cloudflare TURN servers');
    
    // Create file transfer DataChannel (HOST creates, GUEST receives)
    if (window.fileTransfer && typeof window.fileTransfer.createChannel === 'function') {
        console.log('📁 HOST: Creating file transfer DataChannel...');
        window.fileTransfer.createChannel(peerConnection);
    }

    // Log connection state changes with detailed info
    peerConnection.onconnectionstatechange = () => {
        console.log('🔌 HOST Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
            console.error('❌ WebRTC connection FAILED');
            console.error('ICE state:', peerConnection.iceConnectionState);
            console.error('Signaling state:', peerConnection.signalingState);
            
            // Try ICE restart
            console.log('🔄 Attempting ICE restart...');
            peerConnection.restartIce();
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 HOST ICE connection state:', peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'checking') {
            console.log('🔄 HOST Checking ICE candidates...');
        } else if (peerConnection.iceConnectionState === 'connected') {
            console.log('✅ HOST ICE CONNECTED! Connection established.');
        } else if (peerConnection.iceConnectionState === 'completed') {
            console.log('✅ HOST ICE COMPLETED! Connection finalized.');
        } else if (peerConnection.iceConnectionState === 'failed') {
            console.error('❌ HOST ICE FAILED - No valid candidate pair found');
            console.error('💡 Possible issues:');
            console.error('   1. Both devices on same machine (use different devices)');
            console.error('   2. Firewall blocking UDP/TCP ports');
            console.error('   3. TURN servers not reachable');
        } else if (peerConnection.iceConnectionState === 'disconnected') {
            console.warn('⚠️ HOST ICE DISCONNECTED - Connection lost');
        }
    };

    peerConnection.onsignalingstatechange = () => {
        console.log('📡 HOST Signaling state:', peerConnection.signalingState);
    };

    // Get screen stream using Electron's desktopCapturer
    // Note: sourceId must be from desktopCapturer.getSources()
    let stream;
    try {
        console.log('🎥 Getting screen stream...');
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
        console.log('✅ Stream obtained:', stream.id);
        console.log('✅ Video tracks:', stream.getVideoTracks().length);
    } catch (err) {
        console.error('❌ getUserMedia failed:', err);
        throw new Error('Failed to capture screen: ' + err.message + '. Make sure you selected a valid source.');
    }

    // Add tracks to peer connection
    console.log('🎥 ========== ADDING TRACKS TO PEER CONNECTION ==========');
    const tracks = stream.getTracks();
    console.log('🎥 Total tracks to add:', tracks.length);
    
    tracks.forEach((track, index) => {
        console.log(`🎥 Track #${index + 1}:`, {
            kind: track.kind,
            label: track.label,
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
        });
        
        const sender = peerConnection.addTrack(track, stream);
        console.log('✅ Track added successfully, Sender:', {
            track: sender.track ? 'SET' : 'NOT SET',
            transport: sender.transport ? 'SET' : 'NOT SET'
        });
    });
    
    console.log('🎥 All tracks added. Total senders:', peerConnection.getSenders().length);
    
    // Verify tracks were actually added
    setTimeout(() => {
        const senders = peerConnection.getSenders();
        console.log('🔍 HOST: Verifying senders after 1 second...');
        console.log('🔍 Total senders:', senders.length);
        senders.forEach((sender, i) => {
            console.log(`🔍 Sender #${i + 1}:`, {
                hasTrack: !!sender.track,
                trackKind: sender.track?.kind,
                trackEnabled: sender.track?.enabled,
                trackReadyState: sender.track?.readyState
            });
        });
    }, 1000);

    // Handle ICE candidates
    let hostCandidates = { host: 0, srflx: 0, relay: 0 };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const type = event.candidate.type;
            hostCandidates[type] = (hostCandidates[type] || 0) + 1;
            
            console.log('🧊 HOST ICE candidate #' + (hostCandidates.host + hostCandidates.srflx + hostCandidates.relay) + ':', type, event.candidate.protocol);
            console.log('   Address:', event.candidate.address || 'N/A');
            console.log('   Port:', event.candidate.port || 'N/A');
            
            if (type === 'relay') {
                console.log('✅ TURN RELAY WORKING! Got relay candidate from:', event.candidate.relatedAddress);
            }
            
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        } else {
            console.log('🧊 HOST ICE gathering complete');
            console.log('📊 HOST ICE Candidate Summary:');
            console.log('   - host (local):', hostCandidates.host);
            console.log('   - srflx (STUN):', hostCandidates.srflx);
            console.log('   - relay (TURN):', hostCandidates.relay);
            
            if (hostCandidates.relay === 0) {
                console.error('❌ NO TURN RELAY CANDIDATES! TURN servers not working!');
                console.error('❌ This will cause connection failures on different networks!');
                console.error('💡 Possible causes:');
                console.error('   1. TURN servers unreachable or down');
                console.error('   2. Invalid TURN credentials');
                console.error('   3. Firewall blocking TURN ports');
            }
        }
    };

    // Listen for answer from guest
    console.log('👂 HOST Setting up answer listener...');
    socket.once('answer', async (data) => {
        console.log('📨 ========== HOST RECEIVED ANSWER ==========');
        console.log('📨 Answer type:', data.answer?.type);
        console.log('📨 Answer SDP length:', data.answer?.sdp?.length || 0);
        console.log('📨 From guest:', data.from);
        console.log('📨 Current signaling state:', peerConnection.signalingState);
        
        if (peerConnection.signalingState === 'have-local-offer') {
            try {
                console.log('📨 Setting remote description with answer...');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                console.log('✅ HOST Remote description set successfully');
                console.log('✅ New signaling state:', peerConnection.signalingState);
            } catch (error) {
                console.error('❌ HOST Error setting remote description:', error);
                console.error('❌ Error details:', error.message, error.name);
            }
        } else {
            console.warn('⚠️ HOST Ignoring answer - wrong state:', peerConnection.signalingState);
            console.warn('⚠️ Expected: have-local-offer');
        }
    });

    // Listen for ICE candidates from guest
    socket.on('ice-candidate', async (data) => {
        if (data.candidate) {
            console.log('🧊 HOST Received ICE candidate from guest');
            
            // Check if connection is still open
            if (peerConnection.signalingState === 'closed') {
                console.warn('⚠️ HOST Ignoring ICE candidate - connection already closed');
                return;
            }
            
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('✅ HOST ICE candidate added');
            } catch (error) {
                console.error('❌ HOST Error adding ICE candidate:', error);
            }
        }
    });

    // Create and send offer
    console.log('📤 HOST Creating offer...');
    const offer = await peerConnection.createOffer();
    console.log('📤 Offer created, type:', offer.type);
    console.log('📤 Offer SDP length:', offer.sdp?.length || 0);
    
    await peerConnection.setLocalDescription(offer);
    console.log('✅ HOST Local description set');
    console.log('✅ Signaling state after setLocalDescription:', peerConnection.signalingState);

    const offerPayload = {
        sessionId,
        offer
    };
    console.log('📤 HOST Sending offer payload:', { sessionId, offerType: offer.type });
    socket.emit('offer', offerPayload);
    console.log('📤 ✅ Offer emitted to session:', sessionId);
    console.log('✅ HOST Offer sent');

    window.superdeskState.webrtc = { peerConnection, stream };
    window.superdeskState.sharingActive = true;
    
    console.log('✅ HOST WebRTC state saved globally - ready for remote control');

    // Start connection health monitoring
    const healthMonitor = monitorConnectionHealth(peerConnection);
    window.superdeskState.healthMonitor = healthMonitor;

    console.log('✅ ========== HOST SETUP COMPLETE ==========');
    return peerConnection;
}

// Setup WebRTC for guest (receiver)
async function setupWebRTCReceiver(socket, sessionId) {
    console.log('🎥 ========== SETTING UP RECEIVER (GUEST) ==========');
    console.log('🎥 Session ID:', sessionId);
    
    console.log('🔧 Fetching ICE servers from backend...');
    const iceServers = await fetchWebRTCConfig();
    
    console.log('🔧 Configuring RTCPeerConnection with', iceServers.length, 'ICE servers');
    const peerConnection = new RTCPeerConnection({
        iceServers: iceServers,
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    });
    
    console.log('✅ GUEST ICE configuration complete with Cloudflare TURN servers');
    
    // Setup file transfer DataChannel receiver (GUEST receives DataChannel created by HOST)
    if (window.fileTransfer && typeof window.fileTransfer.setupReceiver === 'function') {
        console.log('📁 GUEST: Setting up file transfer DataChannel receiver...');
        window.fileTransfer.setupReceiver(peerConnection);
    }

    // Log connection state changes with detailed info
    peerConnection.onconnectionstatechange = () => {
        console.log('🔌 GUEST Connection state:', peerConnection.connectionState);
        updateDebugStatus('connection', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'failed') {
            console.error('❌ GUEST WebRTC connection FAILED');
            console.error('ICE state:', peerConnection.iceConnectionState);
            console.error('Signaling state:', peerConnection.signalingState);
            updateDebugStatus('error', 'Connection failed - trying ICE restart');
            
            // Try ICE restart
            console.log('🔄 GUEST Attempting ICE restart...');
            peerConnection.restartIce();
        }
        
        // Update health indicator
        if (typeof updateHealthIndicator === 'function') {
            updateHealthIndicator(peerConnection.connectionState);
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 GUEST ICE connection state:', peerConnection.iceConnectionState);
        updateDebugStatus('ice', peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'checking') {
            console.log('🔄 GUEST Checking ICE candidates...');
            updateDebugStatus('status', 'Negotiating connection');
        } else if (peerConnection.iceConnectionState === 'connected') {
            console.log('✅ GUEST ICE CONNECTED! Video should appear now.');
            updateDebugStatus('status', 'Connected - waiting for video');
            
            // Log selected candidate pair
            peerConnection.getStats().then(stats => {
                stats.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        console.log('📊 Selected candidate pair:', report);
                        console.log('   Local:', report.localCandidateId);
                        console.log('   Remote:', report.remoteCandidateId);
                    }
                });
            });
        } else if (peerConnection.iceConnectionState === 'completed') {
            console.log('✅ GUEST ICE COMPLETED! Connection finalized.');
        } else if (peerConnection.iceConnectionState === 'failed') {
            console.error('❌ GUEST ICE FAILED - No valid candidate pair found');
            updateDebugStatus('error', 'ICE failed - check firewall');
            console.error('💡 Possible issues:');
            console.error('   1. Testing on SAME MACHINE? Use 2 different devices!');
            console.error('   2. Both on same WiFi? Try different networks!');
            console.error('   3. Firewall blocking all ports?');
        } else if (peerConnection.iceConnectionState === 'disconnected') {
            console.warn('⚠️ GUEST ICE DISCONNECTED - Connection lost');
            updateDebugStatus('warning', 'Connection lost');
        }
        
        // Update health indicator for ICE states
        if (typeof updateHealthIndicator === 'function') {
            const iceState = peerConnection.iceConnectionState;
            if (iceState === 'checking') updateHealthIndicator('connecting');
            else if (iceState === 'connected' || iceState === 'completed') updateHealthIndicator('connected');
            else if (iceState === 'failed') updateHealthIndicator('failed');
            else if (iceState === 'disconnected') updateHealthIndicator('disconnected');
        }
    };

    peerConnection.onsignalingstatechange = () => {
        console.log('📡 Signaling state:', peerConnection.signalingState);
        updateDebugStatus('signaling', peerConnection.signalingState);
    };

    // Handle incoming stream
    let tracksReceived = 0;
    peerConnection.ontrack = (event) => {
        tracksReceived++;
        console.log('📺 ========== ONTRACK EVENT FIRED #' + tracksReceived + ' ==========');
        console.log('📺 Track kind:', event.track.kind);
        console.log('📺 Track id:', event.track.id);
        console.log('📺 Track label:', event.track.label);
        console.log('📺 Track readyState:', event.track.readyState);
        console.log('📺 Track enabled:', event.track.enabled);
        console.log('📺 Track muted:', event.track.muted);
        console.log('📺 Streams count:', event.streams.length);
        if (event.streams.length > 0) {
            console.log('📺 Stream ID:', event.streams[0].id);
            console.log('📺 Stream active:', event.streams[0].active);
            console.log('📺 Stream video tracks:', event.streams[0].getVideoTracks().length);
            console.log('📺 Stream audio tracks:', event.streams[0].getAudioTracks().length);
        }
        updateDebugStatus('stream', 'received');
        
        const stream = event.streams[0];
        
        // Get video elements
        const video = document.getElementById('join-remote-video');
        const placeholder = document.getElementById('stream-placeholder');
        const controlsOverlay = document.getElementById('video-controls-overlay');
        
        console.log('📺 Looking for elements...');
        console.log('   - video:', video ? 'FOUND' : 'NOT FOUND');
        console.log('   - placeholder:', placeholder ? 'FOUND' : 'NOT FOUND');
        console.log('   - controlsOverlay:', controlsOverlay ? 'FOUND' : 'NOT FOUND');
        
        if (video) {
            console.log('📺 Setting srcObject...');
            video.srcObject = stream;

            // Only show popup when stream has at least one active video track
            const hasVideoTrack = stream && stream.getVideoTracks && stream.getVideoTracks().length > 0;
            const videoTrackActive = hasVideoTrack ? stream.getVideoTracks()[0].readyState !== 'ended' : false;
            if (hasVideoTrack && videoTrackActive) {
                // Show the remote desktop popup
                if (typeof window.showRemoteDesktopPopup === 'function') {
                    window.showRemoteDesktopPopup();
                    console.log('✅ Remote desktop popup opened');
                }
            } else {
                console.warn('⚠️ Received stream but no active video tracks - not opening popup');
            }
            
            // Hide placeholder and update status
            if (placeholder) {
                placeholder.style.display = 'none';
                console.log('✅ Placeholder hidden');
            }
            
            // Update connection status indicator
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            if (statusIndicator && statusText) {
                statusIndicator.style.background = '#10b981';
                statusText.textContent = 'Streaming';
                statusText.style.color = '#10b981';
                console.log('✅ Status updated to streaming');
            }
            
            video.play()
                .then(() => {
                    console.log('✅ Video playing successfully');
                    console.log('📺 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                })
                .catch(e => console.log('⚠️ Auto-play handled:', e.message));
            
            console.log('📺 Video element state:', {
                srcObject: video.srcObject ? 'SET' : 'NOT SET',
                readyState: video.readyState,
                paused: video.paused,
                muted: video.muted,
                width: video.videoWidth,
                height: video.videoHeight
            });
            updateDebugStatus('video', 'displayed');
        } else {
            console.error('❌ Video element not found!');
            updateDebugStatus('video', 'element-missing');
        }
    };

    // Handle ICE candidates
    let guestCandidates = { host: 0, srflx: 0, relay: 0 };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const type = event.candidate.type;
            guestCandidates[type] = (guestCandidates[type] || 0) + 1;
            
            console.log('🧊 GUEST ICE candidate #' + (guestCandidates.host + guestCandidates.srflx + guestCandidates.relay) + ':', type, event.candidate.protocol);
            console.log('   Address:', event.candidate.address || 'N/A');
            console.log('   Port:', event.candidate.port || 'N/A');
            
            if (type === 'relay') {
                console.log('✅ TURN RELAY WORKING! Got relay candidate from:', event.candidate.relatedAddress);
            }
            
            updateDebugStatus('ice-candidate', event.candidate.type);
            socket.emit('ice-candidate', {
                sessionId,
                candidate: event.candidate
            });
        } else {
            console.log('🧊 GUEST ICE gathering complete');
            console.log('📊 GUEST ICE Candidate Summary:');
            console.log('   - host (local):', guestCandidates.host);
            console.log('   - srflx (STUN):', guestCandidates.srflx);
            console.log('   - relay (TURN):', guestCandidates.relay);
            
            if (guestCandidates.relay === 0) {
                console.error('❌ NO TURN RELAY CANDIDATES! TURN servers not working!');
                console.error('❌ Connection will fail if on different networks!');
                console.error('💡 Try: Check if TURN servers are reachable from your network');
            }
        }
    };

    // Listen for offer from host
    console.log('👂 Setting up offer listener...');
    socket.once('offer', async (data) => {
        console.log('📨 ========== GUEST RECEIVED OFFER ==========');
        console.log('📨 Offer type:', data.offer?.type);
        console.log('📨 Offer SDP length:', data.offer?.sdp?.length || 0);
        console.log('📨 From host:', data.from);
        console.log('📨 Session ID:', data.sessionId);
        console.log('📨 Current signaling state:', peerConnection.signalingState);
        updateDebugStatus('offer', 'received');
        
        if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'have-remote-offer') {
            try {
                console.log('📨 Setting remote description with offer...');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                console.log('✅ Remote description set successfully');
                console.log('✅ New signaling state:', peerConnection.signalingState);
                
                console.log('📨 Creating answer...');
                const answer = await peerConnection.createAnswer();
                console.log('📨 Answer created, type:', answer.type);
                console.log('📨 Answer SDP length:', answer.sdp?.length || 0);
                
                await peerConnection.setLocalDescription(answer);
                console.log('✅ Local description (answer) set');
                console.log('✅ Signaling state after setLocalDescription:', peerConnection.signalingState);
                
                // Check what transceivers are expecting
                console.log('🔍 GUEST: Checking expected tracks...');
                const transceivers = peerConnection.getTransceivers();
                console.log('🔍 Total transceivers:', transceivers.length);
                transceivers.forEach((t, i) => {
                    console.log(`🔍 Transceiver #${i + 1}:`, {
                        direction: t.direction,
                        currentDirection: t.currentDirection,
                        mid: t.mid,
                        hasReceiver: !!t.receiver,
                        receiverTrack: t.receiver?.track ? t.receiver.track.kind : 'NO TRACK'
                    });
                });
                
                const answerPayload = {
                    sessionId,
                    targetId: data.from,
                    answer
                };
                console.log('📤 GUEST Sending answer to host:', data.from);
                console.log('📤 Answer payload:', { sessionId, targetId: data.from, answerType: answer.type });
                socket.emit('answer', answerPayload);
                console.log('📤 ✅ Answer emitted');
                updateDebugStatus('answer', 'sent');
            } catch (error) {
                console.error('❌ Error handling offer:', error);
                console.error('❌ Error details:', error.message, error.name, error.stack);
                updateDebugStatus('error', error.message);
            }
        } else {
            console.warn('⚠️ Ignoring offer - wrong state:', peerConnection.signalingState);
            console.warn('⚠️ Expected: stable or have-remote-offer');
            updateDebugStatus('offer', 'wrong-state');
        }
    });

    // Listen for ICE candidates from host
    socket.on('ice-candidate', async (data) => {
        if (data.candidate) {
            console.log('🧊 GUEST Received ICE candidate from host');
            
            // Check if connection is still open
            if (peerConnection.signalingState === 'closed') {
                console.warn('⚠️ GUEST Ignoring ICE candidate - connection already closed');
                return;
            }
            
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('✅ GUEST ICE candidate added');
            } catch (error) {
                console.error('❌ GUEST Error adding ICE candidate:', error);
            }
        }
    });

    // Store peer connection globally for remote control access
    window.superdeskState.webrtc = { peerConnection };
    
    console.log('✅ WebRTC receiver setup complete');
    console.log('✅ GUEST WebRTC state saved globally - ready for remote control');
    updateDebugStatus('setup', 'complete');
    
    // Log if NO tracks received after 10 seconds
    setTimeout(() => {
        if (tracksReceived === 0) {
            console.error('❌ ========== NO TRACKS RECEIVED after 10 seconds! ==========');
            console.error('❌ WebRTC connection completed BUT no media tracks received');
            console.error('❌ Possible causes:');
            console.error('   1. HOST not actually capturing/sharing screen');
            console.error('   2. HOST screen capture permission denied');
            console.error('   3. HOST addTrack() not called');
            console.error('   4. Firewall blocking media (but allowing signaling)');
            console.log('🔍 Current connection state:', peerConnection.connectionState);
            console.log('🔍 Current ICE state:', peerConnection.iceConnectionState);
            console.log('🔍 Current signaling state:', peerConnection.signalingState);
            updateDebugStatus('error', 'no-tracks-received');
        }
    }, 10000);
    
    // Start connection health monitoring
    const healthMonitor = monitorConnectionHealth(peerConnection);
    window.superdeskState.healthMonitor = healthMonitor;
    
    window.superdeskState.webrtc = { peerConnection };
    return peerConnection;
}

// Debug status helper
function updateDebugStatus(key, value) {
    const debugDiv = document.getElementById('debug-status');
    if (debugDiv) {
        const timestamp = new Date().toLocaleTimeString();
        const emoji = getStatusEmoji(key, value);
        const statusLine = `[${timestamp}] ${emoji} ${key}: ${value}\n`;
        debugDiv.textContent = statusLine + debugDiv.textContent;
        // Keep only last 20 lines
        const lines = debugDiv.textContent.split('\n');
        if (lines.length > 20) {
            debugDiv.textContent = lines.slice(0, 20).join('\n');
        }
    }
}

// Get emoji for status updates
function getStatusEmoji(key, value) {
    if (value === 'connected' || value === 'complete' || value === 'displayed' || value === 'sent' || value === 'received') {
        return '✅';
    } else if (value === 'connecting' || value === 'checking') {
        return '🔄';
    } else if (value.includes('failed') || value.includes('error') || value.includes('missing')) {
        return '❌';
    } else if (value === 'disconnected' || value === 'closed') {
        return '⚠️';
    }
    return '📌';
}

// Connection health monitor
function monitorConnectionHealth(peerConnection) {
    let lastState = peerConnection.iceConnectionState;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    
    const checkInterval = setInterval(() => {
        const currentState = peerConnection.iceConnectionState;
        
        // If connection failed or disconnected, try to recover
        if (currentState === 'failed' && reconnectAttempts < maxReconnectAttempts) {
            console.log(`🔄 Connection failed, attempting reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            updateDebugStatus('reconnect', `attempt ${reconnectAttempts + 1}`);
            peerConnection.restartIce();
            reconnectAttempts++;
        } else if (currentState === 'connected') {
            reconnectAttempts = 0; // Reset on successful connection
        } else if (currentState === 'closed') {
            clearInterval(checkInterval);
            updateDebugStatus('monitor', 'stopped - connection closed');
        }
        
        lastState = currentState;
    }, 5000); // Check every 5 seconds
    
    // Stop monitoring when connection closes
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'closed') {
            clearInterval(checkInterval);
        }
    };
    
    return checkInterval;
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
        if (window.superdeskModal) {
            window.superdeskModal.warning('No guest connected yet. Please wait for someone to join your session.', 'No Guest Connected');
        }
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
        if (window.superdeskModal) {
            window.superdeskModal.error('Failed to start screen sharing: ' + error.message, 'Screen Share Error');
        }
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
        if (window.superdeskModal) {
            window.superdeskModal.warning('Please select a screen or window to share', 'No Source Selected');
        }
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
        
        // Show file transfer section
        if (typeof showHostFileTransferSection === 'function') {
            showHostFileTransferSection();
        }

    } catch (error) {
        console.error('Failed to start screen sharing:', error);
        if (window.superdeskModal) {
            window.superdeskModal.error('Failed to start screen sharing: ' + error.message, 'Screen Share Error');
        }
    }
}

// Enable remote control
function enableRemoteControl() {
    console.log('🟢 enableRemoteControl() called');
    console.log('  - Current state:', window.superdeskState?.remoteControlEnabled);
    console.log('  - Socket connected:', window.superdeskState?.socket?.connected);
    console.log('  - Session ID:', window.superdeskState?.sessionId);
    
    if (!window.superdeskState || !window.superdeskState.socket) {
        console.error('❌ Cannot enable remote control: socket not available');
        return;
    }
    
    window.superdeskState.remoteControlEnabled = true;
    window.superdeskState.socket.emit('enable-remote-control', {
        sessionId: window.superdeskState.sessionId
    });
    
    // Setup mouse/keyboard event capture on video element(s)
    const video = document.getElementById('remote-video');
    const joinVideo = document.getElementById('join-remote-video');
    
    console.log('  - video element found:', !!video);
    console.log('  - joinVideo element found:', !!joinVideo);
    
    if (video) {
        // Use capture to ensure we intercept events before any other handlers
        video.addEventListener('mousemove', handleMouseMove, { capture: true });
        video.addEventListener('mousedown', handleMouseDown, { capture: true });
        video.addEventListener('mouseup', handleMouseUp, { capture: true });
        video.addEventListener('click', handleMouseClick, { capture: true });
        video.addEventListener('wheel', handleMouseWheel, { capture: true, passive: false });
        console.log('  ✅ Event listeners attached to remote-video (capture)');
    }
    
    if (joinVideo) {
        joinVideo.addEventListener('mousemove', handleMouseMove, { capture: true });
        joinVideo.addEventListener('mousedown', handleMouseDown, { capture: true });
        joinVideo.addEventListener('mouseup', handleMouseUp, { capture: true });
        joinVideo.addEventListener('click', handleMouseClick, { capture: true });
        joinVideo.addEventListener('wheel', handleMouseWheel, { capture: true, passive: false });
        console.log('  ✅ Event listeners attached to join-remote-video (capture)');
    }
    
    // Use capture so key events are captured regardless of focus inside the UI
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });
    
    console.log('✅ Remote control enabled successfully');
    // Hide guest cursor over video when control is enabled
    if (joinVideo) {
        try {
            joinVideo.classList.add('control-active');
        } catch (e) {
            console.warn('Could not add control-active class to joinVideo', e);
        }
    }
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
        video.removeEventListener('mousemove', handleMouseMove, { capture: true });
        video.removeEventListener('mousedown', handleMouseDown, { capture: true });
        video.removeEventListener('mouseup', handleMouseUp, { capture: true });
        video.removeEventListener('click', handleMouseClick, { capture: true });
        video.removeEventListener('wheel', handleMouseWheel, { capture: true });
    }
    
    if (joinVideo) {
        joinVideo.removeEventListener('mousemove', handleMouseMove, { capture: true });
        joinVideo.removeEventListener('mousedown', handleMouseDown, { capture: true });
        joinVideo.removeEventListener('mouseup', handleMouseUp, { capture: true });
        joinVideo.removeEventListener('click', handleMouseClick, { capture: true });
        joinVideo.removeEventListener('wheel', handleMouseWheel, { capture: true });
        // Restore guest cursor visibility
        try {
            joinVideo.classList.remove('control-active');
        } catch (e) {
            console.warn('Could not remove control-active class from joinVideo', e);
        }
    }
    
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
    document.removeEventListener('keyup', handleKeyUp, { capture: true });
    
    // Reset control button to default styling
    const controlBtn = document.getElementById('control-toggle-btn');
    if (controlBtn) {
        controlBtn.textContent = '🖱️ Enable Control';
        controlBtn.style.background = 'rgba(255,255,255,0.15)';
    }
    const indicator = document.getElementById('control-indicator');
    if (indicator) indicator.style.display = 'none';
    
    console.log('Remote control disabled');
}

// Mouse event handlers with RAF-based batching for minimum latency
let mouseMoveCount = 0;
let pendingMouseMove = null;
let rafScheduled = false;

function handleMouseMove(e) {
    if (!window.superdeskState.remoteControlEnabled) {
        if (mouseMoveCount === 0) {
            console.warn('⚠️ Mouse move detected but remote control NOT enabled');
            mouseMoveCount++;
        }
        return;
    }
    
    mouseMoveCount++;
    
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    if (!window.superdeskState.socket || !window.superdeskState.socket.connected) {
        return;
    }
    
    // Always store the latest position
    pendingMouseMove = { x, y };
    
    // Use requestAnimationFrame for optimal timing - syncs with display refresh
    if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            if (pendingMouseMove && window.superdeskState.socket) {
                const { x, y } = pendingMouseMove;
                pendingMouseMove = null;
                window.superdeskState.socket.emit('mouse-event', {
                    sessionId: window.superdeskState.sessionId,
                    type: 'move',
                    x,
                    y
                });
            }
        });
    }
}

function handleMouseClick(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'click',
        button: e.button,
        x,
        y
    });
}

function handleMouseDown(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'down',
        button: e.button,
        x,
        y
    });
}

function handleMouseUp(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'up',
        button: e.button,
        x,
        y
    });
}

// Mouse wheel/scroll handler
let wheelEventCount = 0;
function handleMouseWheel(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    // Prevent page scrolling
    e.preventDefault();
    e.stopPropagation();
    
    wheelEventCount++;
    if (wheelEventCount === 1 || wheelEventCount % 5 === 0) {
        console.log(`🖱️ Wheel event #${wheelEventCount}:`, { deltaX: e.deltaX, deltaY: e.deltaY });
    }
    
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Normalize delta values - different browsers report different scales
    // Most browsers use 100 for one "click" of the scroll wheel
    const deltaX = Math.sign(e.deltaX) * Math.min(Math.abs(e.deltaX), 120);
    const deltaY = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120);

    window.superdeskState.socket.emit('mouse-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'scroll',
        deltaX: deltaX,
        deltaY: deltaY,
        x,
        y
    });
}

// Keyboard event handlers
let keyEventCount = 0;
function handleKeyDown(e) {
    if (!window.superdeskState.remoteControlEnabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    keyEventCount++;
    if (keyEventCount === 1 || keyEventCount % 10 === 0) {
        console.log(`⌨️ Key down event #${keyEventCount}:`, e.key, e.code);
    }
    
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
    e.stopPropagation();
    
    window.superdeskState.socket.emit('keyboard-event', {
        sessionId: window.superdeskState.sessionId,
        type: 'up',
        key: e.key,
        code: e.code
    });
}

// Stop screen sharing
function stopScreenShare() {
    console.log('🛑 Stopping screen share...');
    
    // Disable remote control if we're the host
    if (window.superdeskState.isHost) {
        console.log('🛑 Disabling remote control on host...');
        if (window.appControls && window.appControls.ipcSend) {
            window.appControls.ipcSend('robot-set-enabled', false);
            window.appControls.ipcSend('robot-release-keys');
        }
        window.superdeskState.remoteControlEnabled = false;
    }
    
    // Notify server and all guests that sharing has stopped
    if (window.superdeskState.socket) {
        window.superdeskState.socket.emit('stop-sharing', {
            sessionId: window.superdeskState.sessionId
        });
    }
    
    // Stop all tracks
    if (window.superdeskState.webrtc && window.superdeskState.webrtc.stream) {
        window.superdeskState.webrtc.stream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
        });
    }
    
    // Close peer connection
    if (window.superdeskState.webrtc && window.superdeskState.webrtc.peerConnection) {
        window.superdeskState.webrtc.peerConnection.close();
        console.log('Closed peer connection');
    }
    
    // Reset state
    window.superdeskState.sharingActive = false;
    window.superdeskState.webrtc = null;
    
    // Update button to WHITE (default state)
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.textContent = 'Start Screen Share';
        shareBtn.style.background = 'rgba(255,255,255,0.15)';  // White/transparent default
    }
    
    // Hide file transfer section
    if (typeof hideHostFileTransferSection === 'function') {
        hideHostFileTransferSection();
    }
    
    console.log('✅ Screen sharing stopped and remote control disabled');
    showNotification('Sharing Stopped', 'Screen sharing has been stopped');
}

// End session
function endSession() {
    console.log('🛑 Ending session...');
    
    // FIRST: Disable remote control on main process (stops cursor movement immediately)
    if (window.appControls && window.appControls.ipcSend) {
        console.log('🛑 Sending robot-set-enabled FALSE to main process');
        window.appControls.ipcSend('robot-set-enabled', false);
        window.appControls.ipcSend('robot-release-keys');
    }
    
    // Disable remote control state
    if (window.superdeskState.remoteControlEnabled) {
        disableRemoteControl();
    }
    window.superdeskState.remoteControlEnabled = false;
    
    if (window.superdeskState.socket) {
        window.superdeskState.socket.emit('end-session', window.superdeskState.sessionId);
    }
    
    // Stop sharing if active
    if (window.superdeskState.sharingActive) {
        stopScreenShare();
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
    
    // Close the popup if guest
    if (typeof window.hideRemoteDesktopPopup === 'function') {
        window.hideRemoteDesktopPopup();
        console.log('✅ Popup closed');
    }
    
    // Restore cursor visibility for guest
    const joinVideo = document.getElementById('join-remote-video');
    if (joinVideo) {
        joinVideo.classList.remove('control-active');
        joinVideo.srcObject = null;
        console.log('✅ Guest cursor restored');
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
    
    // Reset UI - Start Screen Share button to WHITE (disabled state)
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.textContent = 'Start Screen Share';
        shareBtn.style.background = 'rgba(255,255,255,0.15)';  // White/transparent
        shareBtn.disabled = true;
        shareBtn.style.opacity = '0.5';
    }
    
    // Reset join button
    const joinBtn = document.getElementById('connect-session-btn');
    if (joinBtn) {
        joinBtn.textContent = 'Connect to Session';
        joinBtn.disabled = false;
        joinBtn.style.opacity = '1';
    }
    
    console.log('✅ Session ended successfully');
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
    console.log(`${title}: ${message}`);
    // Use custom modal if available, otherwise just log
    if (window.superdeskModal) {
        window.superdeskModal.success(message, title);
    }
}

// Export functions
window.createSession = createSession;
window.joinSession = joinSession;
window.startScreenShare = startScreenShare;
window.stopScreenShare = stopScreenShare;
window.selectSourceAndConfirm = selectSourceAndConfirm;
window.confirmSourceSelection = confirmSourceSelection;
window.enableRemoteControl = enableRemoteControl;
window.disableRemoteControl = disableRemoteControl;
window.endSession = endSession;

// Export WebRTC setup functions for guest to use
window.superdeskWebRTC = {
    setupWebRTCSender: setupWebRTCSender,
    setupWebRTCReceiver: setupWebRTCReceiver
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ SuperDesk initialized - Creating session for hosting');
        // Auto-create session on load so session ID is always available
        createSession();
    });
} else {
    console.log('✅ SuperDesk initialized - Creating session for hosting');
    createSession();
}

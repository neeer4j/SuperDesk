const io = require('socket.io-client');
const { ipcRenderer } = require('electron');

let socket;
let peerConnection;
let localStream;
let sessionId;
let currentGuestId = null; // target guest for directed signaling
let isSharing = false;
let pendingIceCandidates = []; // Buffer for early ICE candidates
let remoteControlEnabled = false;

// Server URL - use Render deployment
const SERVER_URL = 'https://superdesk-7m7f.onrender.com';

// ICE servers configuration (dynamic fetch from server)
let iceServers = { iceServers: [] };

async function loadIceServers() {
  try {
    const resp = await fetch(`${SERVER_URL}/api/webrtc-config`);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.iceServers)) {
        iceServers = { iceServers: data.iceServers };
        console.log('Loaded ICE servers from server:', iceServers);
        return;
      }
    }
  } catch (e) {
    console.warn('Failed to load ICE servers from server, using fallback');
  }
  iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  };
}

// Cap an RTCRtpSender to a maximum bitrate in Mbps (safe helper)
async function capSenderToMbps(sender, mbps) {
  if (!sender || typeof sender.getParameters !== 'function') return false;
  if (typeof sender.setParameters !== 'function') {
    console.warn('RTCRtpSender.setParameters not supported in this engine.');
    return false;
  }
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    const bps = Math.floor(mbps * 1_000_000);
    for (const enc of params.encodings) {
      enc.maxBitrate = bps;
    }
    await sender.setParameters(params);
    return true;
  } catch (err) {
    console.warn('Failed to set sender parameters:', err);
    return false;
  }
}

// Connect to signaling server
function connectToServer() {
  console.log('Connecting to server:', SERVER_URL);
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', async () => {
    console.log('✅ Agent connected to server');
    updateStatus('Connected to server');
    // Load ICE servers from backend for best cross-network success
    await loadIceServers();
    
    // Create a new session as HOST
    socket.emit('create-session');
  });
  
  socket.on('session-created', (payload) => {
    // Server currently sends a plain string; support both string and object
    sessionId = typeof payload === 'string' ? payload : payload?.sessionId;
    console.log('📝 Session created:', sessionId);
    updateStatus('Ready - Waiting for guest');
    displaySessionId(sessionId);
  });
  
  // Server emits 'guest-joined' with { guestId, sessionId }
  socket.on('guest-joined', async (data) => {
    currentGuestId = data?.guestId || null;
    console.log('👤 Guest joined session:', currentGuestId);
    updateStatus('Guest connected! Click Start Screen Sharing');
  });
  
  socket.on('offer', async (data) => {
    console.log('📨 Received offer from guest');
    await handleOffer(data);
  });
  
  socket.on('answer', async (data) => {
    console.log('📨 ===== RECEIVED ANSWER FROM GUEST =====');
    console.log('Answer data:', data);
    await handleAnswer(data);
  });
  
  socket.on('ice-candidate', async (data) => {
    console.log('📨 Received ICE candidate from guest');
    console.log('Current peer connection state:', peerConnection?.connectionState);
    console.log('Current signaling state:', peerConnection?.signalingState);
    console.log('Remote description set?', !!peerConnection?.remoteDescription);
    await handleIceCandidate(data);
  });

  socket.on('remote-control-enabled', () => {
    remoteControlEnabled = true;
    ipcRenderer.send('robot-set-enabled', true);
    updateStatus('Remote control enabled');
    console.log('🎯 Remote control enabled');
  });

  socket.on('remote-control-disabled', () => {
    remoteControlEnabled = false;
    ipcRenderer.send('robot-set-enabled', false);
    updateStatus('Remote control disabled');
    console.log('🚫 Remote control disabled');
  });

  socket.on('mouse-event', forwardRemoteMouseEvent);
  socket.on('keyboard-event', forwardRemoteKeyboardEvent);

  // Handle renegotiation requests from guest
  socket.on('renegotiate', async (data) => {
    console.log('🔄 Renegotiation requested by guest');
    try {
      if (!peerConnection) {
        console.log('No peer connection, creating a new one');
        createPeerConnection();
      }
      // Recreate an offer based on existing tracks/state
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', {
        sessionId,
        targetId: currentGuestId || undefined,
        offer
      });
      console.log('📤 Sent renegotiation offer to guest');
    } catch (e) {
      console.error('Renegotiation error:', e);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    remoteControlEnabled = false;
    ipcRenderer.send('robot-set-enabled', false);
    updateStatus('Disconnected from server');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    updateStatus('Error: ' + error);
  });
}

function forwardRemoteMouseEvent(data = {}) {
  if (!remoteControlEnabled) return;
  ipcRenderer.send('robot-mouse-event', data);
}

function forwardRemoteKeyboardEvent(data = {}) {
  if (!remoteControlEnabled) return;
  ipcRenderer.send('robot-keyboard-event', data);
}

// Start screen sharing
async function startScreenShare() {
  try {
    if (isSharing) {
      console.log('Already sharing screen');
      return;
    }
    
    updateStatus('Getting screen sources...');
    document.getElementById('startBtn').disabled = true;
    
    // Get desktop sources using IPC to communicate with main process
    const sources = await ipcRenderer.invoke('get-sources');
    
    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }
    
    console.log('📺 Found screen sources:', sources.length);
    updateStatus('Capturing screen...');
    
    // Get the first screen (primary display)
    const primarySource = sources[0];
    
    // Create media stream from screen capture
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primarySource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 15,
            maxFrameRate: 30
          }
        }
      });
    } catch (e1) {
      console.warn('getUserMedia with desktop constraints failed, trying getDisplayMedia fallback:', e1);
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: { ideal: 30 },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (e2) {
        throw e2;
      }
    }
    
    localStream = stream;
    isSharing = true;
    ipcRenderer.send('robot-refresh-screen-size');
    
    console.log('✅ Screen capture started');
    console.log('Stream tracks:', stream.getTracks());
    const vt = stream.getVideoTracks()[0];
    if (vt) {
      console.log('Video track settings:', vt.getSettings ? vt.getSettings() : {});
      console.log('Video track state:', {
        enabled: vt.enabled,
        muted: vt.muted,
        readyState: vt.readyState,
        label: vt.label
      });
      vt.onended = () => console.log('Host video track ended');
      vt.onmute = () => {
        console.warn('⚠️ Host video track muted!');
        console.log('Track state:', { enabled: vt.enabled, readyState: vt.readyState });
      };
      vt.onunmute = () => console.log('Host video track unmuted');
    }
    updateStatus('Screen sharing active - Creating connection...');
    
    // Create peer connection and add stream
    createPeerConnection();
    
    // Add video track to peer connection
    let videoSender = null;
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind, {
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      });
      const sender = peerConnection.addTrack(track, stream);
      if (track.kind === 'video') videoSender = sender;
    });

    // Prefer VP8 for maximum compatibility and set reasonable bitrate/framerate
    try {
      const transceivers = peerConnection.getTransceivers();
      const videoTransceiver = transceivers.find(t => t.sender && t.sender === videoSender);
      if (videoTransceiver && RTCRtpSender.getCapabilities) {
        const caps = RTCRtpSender.getCapabilities('video');
        if (caps && caps.codecs) {
          const vp8 = caps.codecs.find(c => /VP8/i.test(c.mimeType));
          const others = caps.codecs.filter(c => !/VP8/i.test(c.mimeType));
          if (vp8 && videoTransceiver.setCodecPreferences) {
            videoTransceiver.setCodecPreferences([vp8, ...others]);
            console.log('Set codec preference to VP8 first');
          }
        }
      }
      if (videoSender) {
        // Use helper to set a robust max bitrate (2 Mbps)
        try {
          await capSenderToMbps(videoSender, 2);
          console.log('Applied video sender parameters (capped to 2 Mbps)');
        } catch (e) {
          console.warn('Failed to apply cap to video sender:', e);
        }
      }
    } catch (e) {
      console.log('Codec/encoding preference not applied (non-fatal):', e);
    }
    
    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log('📤 Sending offer to guest');
    socket.emit('offer', {
      sessionId: sessionId,
      targetId: currentGuestId || undefined,
      offer: offer
    });
    
    updateStatus('Waiting for guest to connect...');
    document.getElementById('stopBtn').disabled = false;
    
  } catch (error) {
    console.error('❌ Screen share error:', error);
    updateStatus('Error: ' + error.message);
    isSharing = false;
    document.getElementById('startBtn').disabled = false;
  }
}

// Create WebRTC peer connection
function createPeerConnection() {
  if (peerConnection) {
    console.log('Peer connection already exists');
    return;
  }
  
  console.log('Creating peer connection...');
  peerConnection = new RTCPeerConnection(iceServers);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('📤 Sending ICE candidate');
      console.log('Candidate details:', event.candidate);
      socket.emit('ice-candidate', {
        sessionId: sessionId,
        targetId: currentGuestId || undefined,
        candidate: event.candidate
      });
    } else {
      console.log('✅ All ICE candidates have been sent');
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    console.log('Full connection details:', {
      connectionState: peerConnection.connectionState,
      iceConnectionState: peerConnection.iceConnectionState,
      iceGatheringState: peerConnection.iceGatheringState,
      signalingState: peerConnection.signalingState
    });
    updateStatus('Connection: ' + peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'connected') {
      updateStatus('✅ Connected! Guest is viewing your screen');
    } else if (peerConnection.connectionState === 'failed') {
      console.error('❌ Connection failed!');
      updateStatus('❌ Connection failed - trying to reconnect...');
    }
  };
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
    console.log('ICE gathering state:', peerConnection.iceGatheringState);
    
    if (peerConnection.iceConnectionState === 'connected') {
      updateStatus('✅ Streaming desktop to guest');
      
      // Start monitoring video stats
      const statsInterval = setInterval(async () => {
        if (!peerConnection || peerConnection.connectionState === 'closed') {
          clearInterval(statsInterval);
          return;
        }
        
        try {
          const stats = await peerConnection.getStats();
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              console.log('📊 Video stats:', {
                bytesSent: report.bytesSent,
                packetsSent: report.packetsSent,
                framesEncoded: report.framesEncoded,
                timestamp: report.timestamp
              });
            }
          });
        } catch (e) {
          console.error('Error getting stats:', e);
        }
      }, 5000); // Check every 5 seconds
    } else if (peerConnection.iceConnectionState === 'failed') {
      console.error('❌ ICE connection failed!');
      updateStatus('❌ ICE connection failed');
    }
  };
  
  console.log('✅ Peer connection created');
}

// Handle offer from guest
async function handleOffer(data) {
  try {
    if (!peerConnection) {
      createPeerConnection();
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    
    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log('📤 Sending answer');
    socket.emit('answer', {
      sessionId: sessionId,
      answer: answer
    });
    
  } catch (error) {
    console.error('Error handling offer:', error);
    updateStatus('Error handling offer: ' + error.message);
  }
}

// Handle answer from guest
async function handleAnswer(data) {
  try {
    console.log('=== HANDLING ANSWER ===');
    console.log('Answer data:', data);
    console.log('Current peer connection state:', peerConnection?.connectionState);
    console.log('Current signaling state:', peerConnection?.signalingState);
    
    if (!peerConnection) {
      console.error('❌ No peer connection to handle answer!');
      return;
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    console.log('✅ Answer set successfully');
    console.log('New signaling state:', peerConnection.signalingState);
    console.log('Local description:', peerConnection.localDescription ? 'Set' : 'Not set');
    console.log('Remote description:', peerConnection.remoteDescription ? 'Set' : 'Not set');

    // Process any buffered ICE candidates
    if (pendingIceCandidates.length > 0) {
      console.log(`Processing ${pendingIceCandidates.length} buffered ICE candidates...`);
      for (const candidate of pendingIceCandidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ Buffered ICE candidate added');
        } catch (error) {
          console.error('Error adding buffered ICE candidate:', error);
        }
      }
      // Clear the buffer
      pendingIceCandidates = [];
    }
  } catch (error) {
    console.error('❌ Error handling answer:', error);
    updateStatus('Error handling answer: ' + error.message);
  }
}

// Handle ICE candidate
async function handleIceCandidate(data) {
  try {
    console.log('handleIceCandidate called');
    console.log('Peer connection exists?', !!peerConnection);
    console.log('Remote description exists?', !!peerConnection?.remoteDescription);
    console.log('Signaling state:', peerConnection?.signalingState);
    
    // If the remote description is not set, buffer the candidate
    if (!peerConnection || !peerConnection.remoteDescription) {
      console.log('⚠️ Remote description not set. Buffering ICE candidate. (Buffer size:', pendingIceCandidates.length + 1, ')');
      pendingIceCandidates.push(data.candidate);
      return;
    }
    
    console.log('Attempting to add ICE candidate immediately...');
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    console.log('✅ ICE candidate added successfully');
  } catch (error) {
    console.error('❌ Error adding ICE candidate:', error);
    console.error('Candidate data:', data.candidate);
  }
}

// Stop screen sharing
function stopScreenShare() {
  remoteControlEnabled = false;
  ipcRenderer.send('robot-set-enabled', false);
  ipcRenderer.send('robot-release-keys');

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  isSharing = false;
  updateStatus('Screen sharing stopped');
  console.log('Screen sharing stopped');
  
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
}

// UI update functions
function updateStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function displaySessionId(id) {
  const sessionIdEl = document.getElementById('sessionId');
  if (sessionIdEl) {
    sessionIdEl.textContent = id;
  }
}

// Expose functions to window for button clicks
window.startScreenShare = startScreenShare;
window.stopScreenShare = stopScreenShare;

// Generate a moving canvas test pattern and stream it (for pipeline debugging)
async function startTestPattern() {
  try {
    if (isSharing) {
      console.log('Already sharing');
      return;
    }
    updateStatus('Starting test pattern...');
    document.getElementById('startBtn').disabled = true;

    const width = 1280, height = 720;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    let t = 0;
    function draw() {
      ctx.fillStyle = '#222';
      ctx.fillRect(0,0,width,height);
      // color bars
      const colors = ['#F44336','#FF9800','#FFEB3B','#4CAF50','#2196F3','#3F51B5','#9C27B0'];
      const barW = Math.ceil(width / colors.length);
      colors.forEach((c, i) => {
        ctx.fillStyle = c; ctx.fillRect(i*barW, 0, barW, height/2);
      });
      // moving text
      ctx.fillStyle = 'white';
      ctx.font = '28px sans-serif';
      ctx.fillText('SuperDesk Test Pattern', 40 + (Math.sin(t/10)*80), height/2 + 50);
      ctx.fillText('Time: ' + new Date().toLocaleTimeString(), 40, height/2 + 90);
      t++;
      requestAnimationFrame(draw);
    }
    draw();

    const stream = canvas.captureStream(30);
    localStream = stream;
    isSharing = true;
    ipcRenderer.send('robot-refresh-screen-size');
    createPeerConnection();
    let videoSender = null;
    stream.getTracks().forEach(track => {
      console.log('Adding test track:', track.kind);
      const sender = peerConnection.addTrack(track, stream);
      if (track.kind === 'video') videoSender = sender;
    });

    try {
      if (videoSender) {
        // Cap test pattern sender to 1.5 Mbps
        await capSenderToMbps(videoSender, 1.5);
      }
    } catch (e) { console.warn('Failed to cap test pattern sender:', e); }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { sessionId, targetId: currentGuestId || undefined, offer });
    updateStatus('Test pattern streaming - waiting for guest...');
    document.getElementById('stopBtn').disabled = false;
  } catch (e) {
    console.error('Test pattern error:', e);
    updateStatus('Error: ' + e.message);
    isSharing = false;
    document.getElementById('startBtn').disabled = false;
  }
}

window.startTestPattern = startTestPattern;

// Start connection when script loads
console.log('Agent renderer script loaded');
connectToServer();

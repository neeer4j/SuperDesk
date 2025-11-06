const io = require('socket.io-client');
const electron = require('electron');

let socket;
let peerConnection;
let localStream;
let sessionId;
let currentGuestId = null; // target guest for directed signaling
let isSharing = false;

// Server URL - matches the deployed server
const SERVER_URL = 'https://superdesk-7m7f.onrender.com';

// ICE servers configuration
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

// Connect to signaling server
function connectToServer() {
  console.log('Connecting to server:', SERVER_URL);
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('✅ Agent connected to server');
    updateStatus('Connected to server');
    
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
    console.log('📨 Received answer from guest');
    await handleAnswer(data);
  });
  
  socket.on('ice-candidate', async (data) => {
    console.log('📨 Received ICE candidate');
    await handleIceCandidate(data);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    updateStatus('Disconnected from server');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    updateStatus('Error: ' + error);
  });
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
    
    // Get desktop sources using Electron's desktopCapturer
    const sources = await electron.desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
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
    
    console.log('✅ Screen capture started');
    console.log('Stream tracks:', stream.getTracks());
    const vt = stream.getVideoTracks()[0];
    if (vt) {
      console.log('Video track settings:', vt.getSettings ? vt.getSettings() : {});
      vt.onended = () => console.log('Host video track ended');
      vt.onmute = () => console.log('Host video track muted');
      vt.onunmute = () => console.log('Host video track unmuted');
    }
    updateStatus('Screen sharing active - Creating connection...');
    
    // Create peer connection and add stream
    createPeerConnection();
    
    // Add video track to peer connection
    let videoSender = null;
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind);
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
        const params = videoSender.getParameters();
        params.encodings = params.encodings || [{}];
        params.encodings[0].maxBitrate = 2_000_000; // 2 Mbps
        params.encodings[0].maxFramerate = 30;
        await videoSender.setParameters(params);
        console.log('Applied video sender parameters');
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
      socket.emit('ice-candidate', {
        sessionId: sessionId,
        targetId: currentGuestId || undefined,
        candidate: event.candidate
      });
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    updateStatus('Connection: ' + peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'connected') {
      updateStatus('✅ Connected! Guest is viewing your screen');
    }
  };
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
    
    if (peerConnection.iceConnectionState === 'connected') {
      updateStatus('✅ Streaming desktop to guest');
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
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    console.log('✅ Answer set successfully');
  } catch (error) {
    console.error('Error handling answer:', error);
    updateStatus('Error handling answer: ' + error.message);
  }
}

// Handle ICE candidate
async function handleIceCandidate(data) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    console.log('✅ ICE candidate added');
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

// Stop screen sharing
function stopScreenShare() {
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

// Start connection when script loads
console.log('Agent renderer script loaded');
connectToServer();

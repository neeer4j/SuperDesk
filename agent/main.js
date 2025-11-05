const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const io = require('socket.io-client');

let mainWindow;
let socket;
let sessionId = null;
let isSharing = false;

// Server URL - change this to your deployed server
const SERVER_URL = process.env.SERVER_URL || 'https://superdesk-7m7f.onrender.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'SuperDesk Agent - Host'
  });

  // Load the agent interface
  mainWindow.loadFile('agent.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    if (socket) {
      socket.disconnect();
    }
    mainWindow = null;
  });

  // Set up WebRTC in the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    initializeAgent();
  });
}

function initializeAgent() {
  // Inject WebRTC setup into the renderer process
  mainWindow.webContents.executeJavaScript(`
    const io = require('socket.io-client');
    
    let socket;
    let peerConnection;
    let localStream;
    let sessionId;
    
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
      socket = io('${SERVER_URL}', {
        transports: ['websocket', 'polling']
      });
      
      socket.on('connect', () => {
        console.log('✅ Agent connected to server');
        updateStatus('Connected to server');
        
        // Create a new session as HOST
        socket.emit('create-session');
      });
      
      socket.on('session-created', (data) => {
        sessionId = data.sessionId;
        console.log('📝 Session created:', sessionId);
        updateStatus('Session created: ' + sessionId);
        displaySessionId(sessionId);
      });
      
      socket.on('user-joined', async (data) => {
        console.log('👤 Guest joined session:', data.socketId);
        updateStatus('Guest connected! Starting screen share...');
        
        // Start screen sharing when guest joins
        await startScreenShare();
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
        
        // Get desktop sources using Electron's desktopCapturer
        const sources = await require('electron').desktopCapturer.getSources({
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
        const stream = await navigator.mediaDevices.getUserMedia({
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
        
        localStream = stream;
        isSharing = true;
        
        console.log('✅ Screen capture started');
        console.log('Stream tracks:', stream.getTracks());
        updateStatus('Screen sharing active');
        
        // Create peer connection and add stream
        createPeerConnection();
        
        // Add video track to peer connection
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          peerConnection.addTrack(track, stream);
        });
        
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        console.log('📤 Sending offer to guest');
        socket.emit('offer', {
          sessionId: sessionId,
          offer: offer
        });
        
      } catch (error) {
        console.error('❌ Screen share error:', error);
        updateStatus('Error: ' + error.message);
        isSharing = false;
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
            candidate: event.candidate
          });
        }
      };
      
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        updateStatus('Connection: ' + peerConnection.connectionState);
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        updateStatus('ICE: ' + peerConnection.iceConnectionState);
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
      }
    }
    
    // Handle answer from guest
    async function handleAnswer(data) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Answer set successfully');
      } catch (error) {
        console.error('Error handling answer:', error);
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
    
    // Start connection when script loads
    connectToServer();
    
    // Expose functions to window for button clicks
    window.startScreenShare = startScreenShare;
    window.stopScreenShare = stopScreenShare;
    
    console.log('Agent WebRTC initialized');
  `);
}

// IPC handlers (keep for future use if needed)
ipcMain.handle('get-connection-status', () => {
  return { connected: socket ? socket.connected : false };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (socket) {
    socket.disconnect();
  }
});
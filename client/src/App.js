import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import config from './config';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [fileTransfer, setFileTransfer] = useState({ progress: 0, active: false });
  const [connectionError, setConnectionError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareRequested, setScreenShareRequested] = useState(false);
  const [pendingScreenRequests, setPendingScreenRequests] = useState([]);
  const [remoteDesktopWindow, setRemoteDesktopWindow] = useState(null);
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const remoteScreenRef = useRef(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  useEffect(() => {
    // Initialize socket connection with fallback options to bypass ad blockers
    console.log('Connecting to server:', config.server);
    setLoading(true);
    
    const newSocket = io(config.server, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      // Additional options to bypass ad blockers
      upgrade: true,
      rememberUpgrade: false
    });
      // Screen sharing event handlers
      newSocket.on('screen-share-requested', (data) => {
        const { requesterId } = data;
        setPendingScreenRequests(prev => [...prev, requesterId]);
        alert('Someone wants to request screen sharing permission!');
      });

      newSocket.on('screen-share-approved', () => {
        alert('Screen share request approved! Host can start sharing.');
      });

      newSocket.on('screen-share-denied', () => {
        alert('Screen share request was denied.');
        setScreenShareRequested(false);
      });

      newSocket.on('screen-share-started', () => {
        alert('Host started screen sharing!');
      });

      newSocket.on('screen-share-stopped', () => {
        alert('Host stopped screen sharing.');
      });

      setSocket(newSocket);    newSocket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
      setLoading(false);
      console.log('Connected to signaling server via', newSocket.io.engine.transport.name);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from signaling server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
      setLoading(false);
      setConnectionError(`Failed to connect to server: ${config.server}. ${error.message || 'Unknown error'}`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setConnectionError(null);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      setConnectionError(`Reconnection failed: ${error.message || 'Unknown error'}`);
    });

    newSocket.io.on('error', (error) => {
      console.error('Socket.io error:', error);
      setConnectionError(`Socket error: ${error.message || 'Unknown error'}`);
    });

    newSocket.on('session-created', (id) => {
      setSessionId(id);
      setIsHost(true);
      console.log('✅ Session created:', id);
    });

    newSocket.on('session-joined', (id) => {
      console.log('✅ Successfully joined session:', id);
      alert(`Successfully joined session: ${id}`);
    });

    newSocket.on('session-error', (error) => {
      console.error('❌ Session error:', error);
      alert(`Session error: ${error}`);
    });

    newSocket.on('user-joined', (userId) => {
      console.log('👤 User joined session:', userId);
      alert('Another user joined the session!');
    });

    newSocket.on('user-left', (userId) => {
      console.log('👤 User left session:', userId);
      alert('User left the session');
      setConnectedUsers(prev => prev.filter(user => user !== userId));
    });

    newSocket.on('session-ended', () => {
      alert('Session has been ended by the host');
      // Clean up
      setSessionId('');
      setJoinSessionId('');
      setRemoteStream(null);
      setIsHost(false);
      setRemoteControlEnabled(false);
      setConnectedUsers([]);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    });

    newSocket.on('remote-control-enabled', () => {
      alert('Remote control has been enabled by the host');
    });

    newSocket.on('remote-control-disabled', () => {
      alert('Remote control has been disabled by the host');
      setRemoteControlEnabled(false);
    });

    newSocket.on('offer', async (offer) => {
      await handleOffer(offer);
    });

    newSocket.on('answer', async (answer) => {
      await handleAnswer(answer);
    });

    newSocket.on('ice-candidate', (candidate) => {
      handleIceCandidate(candidate);
    });

    return () => newSocket.close();
  }, []);

  // Update popup when remote stream changes
  useEffect(() => {
    if (remoteDesktopWindow && !remoteDesktopWindow.closed && remoteStream) {
      const popupVideo = remoteDesktopWindow.document.getElementById('remoteVideo');
      const loadingOverlay = remoteDesktopWindow.document.getElementById('loadingOverlay');
      
      if (popupVideo) {
        popupVideo.srcObject = remoteStream;
        popupVideo.onloadedmetadata = () => {
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        };
      }
    }
  }, [remoteStream, remoteDesktopWindow]);

  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection(servers);
    
    // Optimize for desktop streaming
    const senders = [];
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.ondatachannel = (event) => {
      console.log('Data channel received:', event.channel.label);
      const dataChannel = event.channel;
      
      dataChannel.onopen = () => {
        console.log('Data channel opened (guest side)');
        setDataChannel(dataChannel);
      };
      
      dataChannel.onclose = () => {
        console.log('Data channel closed (guest side)');
        setDataChannel(null);
      };
      
      dataChannel.onerror = (error) => {
        console.error('Data channel error (guest side):', error);
      };
      
      dataChannel.onmessage = handleDataChannelMessage;
    };

    // Set up optimized encoding parameters for screen sharing
    pc.addEventListener('negotiationneeded', async () => {
      try {
        const senders = pc.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === 'video') {
            const params = sender.getParameters();
            if (params.encodings) {
              params.encodings.forEach(encoding => {
                encoding.maxBitrate = 2000000; // 2 Mbps for good quality
                encoding.maxFramerate = 30;
              });
              await sender.setParameters(params);
            }
          }
        }
      } catch (error) {
        console.log('Error setting encoding parameters:', error);
      }
    });

    setPeerConnection(pc);
    return pc;
  };

  const startSession = async () => {
    try {
      // Get screen capture with system audio for true remote desktop experience
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          systemAudio: 'include' // Capture system audio
        }
      });
      setLocalStream(stream);
      setIsHost(true); // Mark as host
      setScreenSharing(true); // Mark as screen sharing from start

      const pc = initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create data channel for file transfer and control
      const dataChannel = pc.createDataChannel('control');
      dataChannel.onopen = () => {
        console.log('Data channel opened (host side)');
        setDataChannel(dataChannel);
      };
      dataChannel.onclose = () => {
        console.log('Data channel closed (host side)');
        setDataChannel(null);
      };
      dataChannel.onerror = (error) => {
        console.error('Data channel error (host side):', error);
      };
      dataChannel.onmessage = handleDataChannelMessage;

      // Handle when user stops sharing (browser stop button)
      stream.getVideoTracks()[0].onended = () => {
        alert('Screen sharing ended. Session will be terminated.');
        endSession();
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('create-session');
        socket.emit('offer', offer);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const joinSession = async (id) => {
    if (!id || !id.trim()) {
      alert('Please enter a valid Session ID');
      return;
    }
    
    console.log('Attempting to join session:', id);
    
    try {
      let stream = null;
      
      try {
        // Try to get microphone audio for guests (optional)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('Got audio stream for guest');
      } catch (audioError) {
        console.log('Audio not available, continuing without microphone:', audioError.message);
        // Create a dummy stream or continue without audio
        stream = new MediaStream();
      }
      
      setLocalStream(stream);

      const pc = initializePeerConnection();
      
      // Add tracks only if we have them
      if (stream && stream.getTracks().length > 0) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      if (socket) {
        console.log('Emitting join-session event for:', id);
        socket.emit('join-session', id.trim());
      } else {
        alert('Not connected to server. Please refresh and try again.');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Error joining session: ' + error.message);
    }
  };

  const handleJoinClick = () => {
    if (joinSessionId.trim()) {
      joinSession(joinSessionId.trim());
    } else {
      alert('Please enter a Session ID');
    }
  };

  // Remote Control Functions
  const enableRemoteControl = () => {
    setRemoteControlEnabled(true);
    if (socket) {
      socket.emit('enable-remote-control', { sessionId });
    }
    alert('Remote control enabled! Click on the screen to control the remote PC.');
  };

  const disableRemoteControl = () => {
    setRemoteControlEnabled(false);
    if (socket) {
      socket.emit('disable-remote-control', { sessionId });
    }
    alert('Remote control disabled.');
  };

  const handleMouseEvent = (event) => {
    if (!remoteControlEnabled || !socket) return;
    
    const rect = remoteScreenRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 1920; // Assume 1920x1080 remote screen
    const y = ((event.clientY - rect.top) / rect.height) * 1080;

    socket.emit('mouse-event', {
      sessionId,
      type: event.type,
      x: Math.round(x),
      y: Math.round(y),
      button: event.button
    });
  };

  const handleKeyboardEvent = (event) => {
    if (!remoteControlEnabled || !socket) return;
    
    event.preventDefault();
    socket.emit('keyboard-event', {
      sessionId,
      type: event.type,
      key: event.key,
      keyCode: event.keyCode,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey
    });
  };

  // Session Management
  const endSession = () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      if (socket) {
        socket.emit('end-session', sessionId);
      }
      
      // Clean up local resources
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }
      
      if (dataChannel) {
        dataChannel.close();
        setDataChannel(null);
      }
      
      setSessionId('');
      setJoinSessionId('');
      setRemoteStream(null);
      setIsHost(false);
      setRemoteControlEnabled(false);
      setConnectedUsers([]);
      setScreenSharing(false);
      setScreenShareRequested(false);
      setPendingScreenRequests([]);
      setFileTransfer({ progress: 0, active: false });
      
      alert('Session ended successfully!');
    }
  };

  // Screen Sharing Functions
  const requestScreenShare = () => {
    if (socket && sessionId) {
      socket.emit('request-screen-share', { 
        sessionId, 
        requesterId: socket.id 
      });
      setScreenShareRequested(true);
      alert('Screen share request sent to host!');
    }
  };

  const startScreenShare = async () => {
    try {
      // Get screen capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });

      // Replace video track in peer connection
      if (peerConnection && localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      setScreenSharing(true);
      
      // Notify other participants
      if (socket) {
        socket.emit('screen-share-started', sessionId);
      }

      // Handle when user stops sharing (browser stop button)
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      alert('Screen sharing started! Others can now see your screen.');
    } catch (error) {
      console.error('Error starting screen share:', error);
      alert('Could not start screen sharing: ' + error.message);
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });

      // Replace screen track with camera track
      if (peerConnection) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      setLocalStream(cameraStream);
      setScreenSharing(false);
      
      // Notify other participants
      if (socket) {
        socket.emit('screen-share-stopped', sessionId);
      }

      alert('Screen sharing stopped. Back to camera view.');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const approveScreenRequest = (requesterId) => {
    if (socket) {
      socket.emit('approve-screen-request', { 
        sessionId, 
        requesterId 
      });
    }
    setPendingScreenRequests(prev => prev.filter(id => id !== requesterId));
    alert('Screen share request approved!');
  };

  const denyScreenRequest = (requesterId) => {
    if (socket) {
      socket.emit('deny-screen-request', { 
        sessionId, 
        requesterId 
      });
    }
    setPendingScreenRequests(prev => prev.filter(id => id !== requesterId));
    alert('Screen share request denied.');
  };

  // Remote Desktop Popup
  const openRemoteDesktop = () => {
    if (!remoteStream) {
      alert('No remote stream available. Wait for host to share screen.');
      return;
    }

    // Close existing window if open
    if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
      remoteDesktopWindow.close();
    }

    // Create popup window
    const popup = window.open(
      '', 
      'RemoteDesktop', 
      'width=1200,height=800,resizable=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!popup) {
      alert('Popup blocked! Please allow popups for this site to use remote desktop viewer.');
      return;
    }

    setRemoteDesktopWindow(popup);

    // Create the popup content
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SuperDesk - Remote Desktop</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          
          .desktop-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .desktop-header {
            background: #2c3e50;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1000;
          }
          
          .desktop-title {
            font-size: 16px;
            font-weight: bold;
          }
          
          .desktop-controls {
            display: flex;
            gap: 10px;
          }
          
          .control-btn {
            padding: 5px 10px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .control-btn:hover {
            background: #2980b9;
          }
          
          .control-btn.active {
            background: #27ae60;
          }
          
          .control-btn.close {
            background: #e74c3c;
          }
          
          .control-btn.close:hover {
            background: #c0392b;
          }
          
          .video-container {
            flex: 1;
            position: relative;
            background: #000;
          }
          
          .remote-video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            cursor: crosshair;
          }
          
          .remote-video.controllable {
            cursor: crosshair;
          }
          
          .status-overlay {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 100;
          }
          
          .loading-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="desktop-container">
          <div class="desktop-header">
            <div class="desktop-title">🖥️ SuperDesk Remote Desktop</div>
            <div class="desktop-controls">
              <button class="control-btn" id="toggleControl" onclick="toggleRemoteControl()">
                Enable Control
              </button>
              <button class="control-btn close" onclick="window.close()">
                ✕ Close
              </button>
            </div>
          </div>
          
          <div class="video-container">
            <video 
              id="remoteVideo" 
              class="remote-video" 
              autoplay 
              playsinline
            ></video>
            
            <div class="status-overlay" id="statusOverlay">
              Connecting...
            </div>
            
            <div class="loading-overlay" id="loadingOverlay">
              <div>🔄 Loading Remote Desktop...</div>
              <div style="font-size: 14px; margin-top: 10px;">Waiting for video stream...</div>
            </div>
          </div>
        </div>
        
        <script>
          let remoteControlEnabled = false;
          let parentWindow = window.opener;
          
          function toggleRemoteControl() {
            remoteControlEnabled = !remoteControlEnabled;
            const btn = document.getElementById('toggleControl');
            const video = document.getElementById('remoteVideo');
            const status = document.getElementById('statusOverlay');
            
            if (remoteControlEnabled) {
              btn.textContent = 'Disable Control';
              btn.classList.add('active');
              video.style.cursor = 'crosshair';
              status.textContent = '🖱️ Remote Control Active';
              
              // Notify parent window
              if (parentWindow && !parentWindow.closed) {
                parentWindow.postMessage({ type: 'enableRemoteControl' }, '*');
              }
            } else {
              btn.textContent = 'Enable Control';
              btn.classList.remove('active');
              video.style.cursor = 'default';
              status.textContent = '👁️ View Only';
              
              // Notify parent window
              if (parentWindow && !parentWindow.closed) {
                parentWindow.postMessage({ type: 'disableRemoteControl' }, '*');
              }
            }
          }
          
          function handleMouseEvent(event) {
            if (!remoteControlEnabled || !parentWindow || parentWindow.closed) return;
            
            const rect = event.target.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 1920;
            const y = ((event.clientY - rect.top) / rect.height) * 1080;
            
            parentWindow.postMessage({
              type: 'mouseEvent',
              event: {
                type: event.type,
                x: Math.round(x),
                y: Math.round(y),
                button: event.button
              }
            }, '*');
          }
          
          function handleKeyboardEvent(event) {
            if (!remoteControlEnabled || !parentWindow || parentWindow.closed) return;
            
            event.preventDefault();
            parentWindow.postMessage({
              type: 'keyboardEvent',
              event: {
                type: event.type,
                key: event.key,
                code: event.code,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey
              }
            }, '*');
          }
          
          // Add event listeners
          const video = document.getElementById('remoteVideo');
          video.addEventListener('mousedown', handleMouseEvent);
          video.addEventListener('mouseup', handleMouseEvent);
          video.addEventListener('mousemove', handleMouseEvent);
          video.addEventListener('click', handleMouseEvent);
          video.addEventListener('dblclick', handleMouseEvent);
          
          document.addEventListener('keydown', handleKeyboardEvent);
          document.addEventListener('keyup', handleKeyboardEvent);
          
          // Handle window close
          window.addEventListener('beforeunload', () => {
            if (parentWindow && !parentWindow.closed) {
              parentWindow.postMessage({ type: 'popupClosed' }, '*');
            }
          });
          
          // Initialize
          document.getElementById('statusOverlay').textContent = '👁️ View Only';
        </script>
      </body>
      </html>
    `);

    popup.document.close();

    // Set up the video stream in the popup
    const popupVideo = popup.document.getElementById('remoteVideo');
    const loadingOverlay = popup.document.getElementById('loadingOverlay');
    
    if (popupVideo && remoteStream) {
      popupVideo.srcObject = remoteStream;
      popupVideo.onloadedmetadata = () => {
        loadingOverlay.style.display = 'none';
      };
    }

    // Handle popup messages
    const handlePopupMessage = (event) => {
      if (event.source !== popup) return;
      
      switch (event.data.type) {
        case 'enableRemoteControl':
          enableRemoteControl();
          break;
        case 'disableRemoteControl':
          disableRemoteControl();
          break;
        case 'mouseEvent':
          if (socket && sessionId) {
            socket.emit('mouse-event', {
              sessionId,
              ...event.data.event
            });
          }
          break;
        case 'keyboardEvent':
          if (socket && sessionId) {
            socket.emit('keyboard-event', {
              sessionId,
              ...event.data.event
            });
          }
          break;
        case 'popupClosed':
          setRemoteDesktopWindow(null);
          window.removeEventListener('message', handlePopupMessage);
          break;
      }
    };

    window.addEventListener('message', handlePopupMessage);
  };

  const handleOffer = async (offer) => {
    if (!peerConnection) return;
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    if (socket) {
      socket.emit('answer', answer);
    }
  };

  const handleAnswer = async (answer) => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(answer);
  };

  const handleIceCandidate = (candidate) => {
    if (peerConnection) {
      peerConnection.addIceCandidate(candidate);
    }
  };

  const handleDataChannelMessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'file-chunk':
        // Handle file transfer chunk
        handleFileChunk(data);
        break;
      case 'mouse-event':
        // Handle mouse control
        break;
      case 'keyboard-event':
        // Handle keyboard control
        break;
      default:
        console.log('Unknown data channel message:', data);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setFileTransfer({ progress: 0, active: true });
    
    // Send file via data channel in chunks
    const chunkSize = 16384; // 16KB chunks
    const reader = new FileReader();
    let offset = 0;

    const sendChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (dataChannel && dataChannel.readyState === 'open') {
        try {
          dataChannel.send(JSON.stringify({
            type: 'file-chunk',
            name: file.name,
            data: Array.from(new Uint8Array(e.target.result)),
            offset: offset,
            total: file.size
          }));

          offset += chunkSize;
          const progress = Math.min((offset / file.size) * 100, 100);
          setFileTransfer({ progress, active: offset < file.size });

          if (offset < file.size) {
            sendChunk();
          }
        } catch (error) {
          console.error('Error sending file chunk:', error);
          alert('Error sending file: ' + error.message);
          setFileTransfer({ progress: 0, active: false });
        }
      } else {
        console.error('Data channel not available for file transfer');
        alert('Connection not ready for file transfer. Please try again.');
        setFileTransfer({ progress: 0, active: false });
      }
    };

    sendChunk();
  };

  const handleFileChunk = (data) => {
    // Handle incoming file chunks
    console.log(`Received file chunk: ${data.offset}/${data.total} bytes`);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🖥️ SuperDesk Remote Desktop</h1>
        <p className="app-description">
          TeamViewer-like remote desktop access • Share your screen • Remote control • System audio
        </p>
        
        {loading && (
          <div className="loading-state">
            <h2>🔄 Connecting to SuperDesk Server...</h2>
            <p>Server: {config.server}</p>
            <div className="spinner"></div>
          </div>
        )}
        
        {connectionError && (
          <div className="error-state">
            <h2>❌ Connection Failed</h2>
            <p>{connectionError}</p>
            <div className="troubleshooting">
              <h3>🔧 Troubleshooting:</h3>
              <ul>
                <li>Check if server is deployed and running</li>
                <li>Verify server URL: {config.server}</li>
                <li>Disable ad blockers (they can block Socket.io)</li>
                <li>Try incognito/private browsing mode</li>
              </ul>
              <button onClick={() => window.location.reload()}>
                🔄 Retry Connection
              </button>
            </div>
          </div>
        )}
        
        <div className="connection-status">
          Status: {connected ? '✅ Connected' : '❌ Disconnected'}
          {!connected && !loading && !connectionError && (
            <div className="debug-info">
              <p>⚠️ Connection Issue Detected</p>
              <p>If you see "ERR_BLOCKED_BY_CLIENT" errors:</p>
              <ul>
                <li>Disable ad blocker for this site</li>
                <li>Try incognito/private browsing mode</li>
                <li>Check browser console for errors</li>
              </ul>
              <button onClick={() => window.location.reload()}>
                Retry Connection
              </button>
            </div>
          )}
        </div>
        
        {sessionId && (
          <div className="session-info">
            <p>Session ID: <strong>{sessionId}</strong></p>
            <p>Share this ID with others to join your session</p>
          </div>
        )}

        <div className="controls">
          <button onClick={startSession} disabled={!connected}>
            🖥️ Share My Desktop
          </button>
          
          <div className="join-session">
            <input 
              type="text" 
              placeholder="Enter Session ID" 
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinClick();
                }
              }}
              disabled={!connected}
            />
            <button 
              onClick={handleJoinClick}
              disabled={!connected || !joinSessionId.trim()}
            >
              Join Session
            </button>
          </div>

          {/* Session Management Controls */}
          {sessionId && (
            <div className="session-controls">
              <div className="session-info">
                <p><strong>Session ID:</strong> {sessionId}</p>
                <p><strong>Role:</strong> {isHost ? 'Host' : 'Guest'}</p>
                <p><strong>Connected Users:</strong> {connectedUsers.length + 1}</p>
              </div>
              
              <button onClick={endSession} className="end-session-btn">
                🚪 End Session
              </button>
              
              {/* Remote Desktop Status */}
              <div className="screen-sharing-section">
                <h3>�️ Remote Desktop</h3>
                
                {isHost ? (
                  <div className="host-screen-controls">
                    <div className="desktop-status">
                      ✅ Desktop sharing is active
                    </div>
                    <p className="desktop-info">
                      Your entire desktop is being shared with remote users. 
                      They can see everything on your screen and control your computer.
                    </p>
                  </div>
                ) : (
                  <div className="guest-screen-controls">
                    <div className="desktop-status">
                      � Viewing remote desktop
                    </div>
                    <p className="desktop-info">
                      You are viewing the host's desktop. Use the remote control 
                      features below to interact with their computer.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Remote Control (only for guests) */}
              {!isHost && (
                <div className="remote-control">
                  {!remoteControlEnabled ? (
                    <button onClick={enableRemoteControl} className="control-btn">
                      🖱️ Enable Remote Control
                    </button>
                  ) : (
                    <button onClick={disableRemoteControl} className="control-btn active">
                      🚫 Disable Remote Control
                    </button>
                  )}
                </div>
              )}
              
              {/* Host Controls */}
              {isHost && (
                <div className="host-controls">
                  <p>💡 Guests can request remote control access</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="media-controls">
          <div className="file-transfer">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()}>
              Send File (Max 10MB)
            </button>
            {fileTransfer.active && (
              <div className="file-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${fileTransfer.progress}%` }}
                  ></div>
                </div>
                <span>{Math.round(fileTransfer.progress)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Remote Desktop Access */}
        {sessionId && !isHost && (
          <div className="remote-desktop-section">
            <h3>�️ Remote Desktop Access</h3>
            <button 
              onClick={openRemoteDesktop}
              className="open-desktop-btn"
              disabled={!remoteStream}
            >
              {remoteStream ? '🖥️ Open Remote Desktop Viewer' : '⏳ Waiting for host screen...'}
            </button>
            {remoteControlEnabled && (
              <div className="remote-status">
                ✅ Remote control enabled - Click the button above to view and control the host's desktop
              </div>
            )}
          </div>
        )}

        {isHost && sessionId && (
          <div className="host-status-section">
            <h3>🖥️ Host Status</h3>
            <div className="host-info">
              ✅ Your desktop is being shared
              <br />
              Connected users can see your screen and control your computer
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
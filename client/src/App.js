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

        <div className="video-container">
          <div className="video-panel">
            <h3>Remote Screen</h3>
            {remoteControlEnabled && (
              <div className="control-indicator">
                🖱️ Remote Control Active - Click to control
              </div>
            )}
            <div 
              className={`remote-screen-wrapper ${remoteControlEnabled ? 'controllable' : ''}`}
              ref={remoteScreenRef}
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
              onClick={handleMouseEvent}
              onDoubleClick={handleMouseEvent}
              onKeyDown={handleKeyboardEvent}
              onKeyUp={handleKeyboardEvent}
              tabIndex={remoteControlEnabled ? 0 : -1}
              style={{
                outline: remoteControlEnabled ? '2px solid #4CAF50' : 'none',
                cursor: remoteControlEnabled ? 'crosshair' : 'default'
              }}
            >
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="remote-video"
                style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
              />
              {!remoteStream && (
                <div className="no-stream-placeholder">
                  <p>No remote screen connected</p>
                  <p>Waiting for host to share screen...</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="local-video-container">
            <h4>Local Camera</h4>
            <video 
              ref={audioRef}
              autoPlay 
              playsInline 
              muted
              className="local-video"
              srcObject={localStream}
            />
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import config from './config';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [fileTransfer, setFileTransfer] = useState({ progress: 0, active: false });
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // Initialize socket connection with fallback options to bypass ad blockers
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
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to signaling server via', newSocket.io.engine.transport.name);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from signaling server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    newSocket.io.on('error', (error) => {
      console.error('Socket.io error:', error);
    });

    newSocket.on('session-created', (id) => {
      setSessionId(id);
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
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannel.onmessage = handleDataChannelMessage;
    };

    setPeerConnection(pc);
    return pc;
  };

  const startSession = async () => {
    try {
      // Get user media for audio and camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);

      const pc = initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create data channel for file transfer and control
      const dataChannel = pc.createDataChannel('control');
      dataChannel.onopen = () => console.log('Data channel opened');
      dataChannel.onmessage = handleDataChannelMessage;

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);

      const pc = initializePeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      if (socket) {
        socket.emit('join-session', id);
      }
    } catch (error) {
      console.error('Error joining session:', error);
    }
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
      const dataChannel = peerConnection?.dataChannel;
      if (dataChannel && dataChannel.readyState === 'open') {
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
        <h1>SuperDesk Remote Desktop</h1>
        <div className="connection-status">
          Status: {connected ? 'Connected' : 'Disconnected'}
          {!connected && (
            <div className="debug-info">
              <p>⚠️ Connection Issue Detected</p>
              <p>If you see "ERR_BLOCKED_BY_CLIENT" errors:</p>
              <ul>
                <li>Disable ad blocker for localhost</li>
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
            Start New Session
          </button>
          
          <div className="join-session">
            <input 
              type="text" 
              placeholder="Enter Session ID" 
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  joinSession(e.target.value);
                }
              }}
            />
            <button onClick={() => {
              const input = document.querySelector('input[placeholder="Enter Session ID"]');
              if (input.value) joinSession(input.value);
            }}>
              Join Session
            </button>
          </div>
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
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              className="remote-video"
            />
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
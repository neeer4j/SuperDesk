import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import config from './config';
import './App.css';

// Material UI imports
import { 
  ThemeProvider, 
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Box,
  Grid,
  Paper,
  Alert,
  Chip,
  Badge,
  CircularProgress,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  IconButton
} from '@mui/material';

import {
  DesktopWindows,
  VideoCall,
  Share,
  Person,
  Group,
  CheckCircle,
  Cancel,
  Warning,
  CloudUpload,
  Download,
  Settings,
  PowerSettingsNew,
  Computer,
  TouchApp,
  ScreenShare,
  Brightness4,
  Brightness7
} from '@mui/icons-material';

// Create professional Material UI theme
const createAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: mode === 'light' ? '#f5f5f5' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light' 
            ? '0 2px 8px rgba(0,0,0,0.1)' 
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '0 4px 16px rgba(0,0,0,0.15)'
              : '0 4px 16px rgba(0,0,0,0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionIdState] = useState('');
  const [joinSessionId, setJoinSessionIdState] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [remoteSocketId, setRemoteSocketIdState] = useState(null);
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
  const [darkMode, setDarkMode] = useState(false);
  
  // Create theme based on current mode
  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  const setSessionId = (value) => {
    sessionIdRef.current = value;
    setSessionIdState(value);
  };

  const setJoinSessionId = (value) => {
    joinSessionIdRef.current = value;
    setJoinSessionIdState(value);
  };

  const setRemoteSocketId = (value) => {
    remoteSocketIdRef.current = value;
    setRemoteSocketIdState(value);
  };
  
  // Toggle dark/light mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  const videoRef = useRef(null);
  const sessionIdRef = useRef('');
  const joinSessionIdRef = useRef('');
  const remoteSocketIdRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const remoteScreenRef = useRef(null);

  const servers = {
    iceServers: [
      // Google's free STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Free public TURN servers for NAT traversal
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
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

      // Guest joined - host needs to send offer
      newSocket.on('guest-joined', async (data) => {
        const { guestId, sessionId: joinedSessionId } = data;
        console.log('=== GUEST JOINED SESSION ===');
        console.log('Guest ID:', guestId);
        console.log('Session ID:', joinedSessionId);
        console.log('peerConnectionRef.current:', peerConnectionRef.current);
        console.log('localStreamRef.current:', localStreamRef.current);
        
        setRemoteSocketId(guestId);
        
        const pc = peerConnectionRef.current;
        const stream = localStreamRef.current;
        
        if (pc && stream) {
          console.log('✅ Sending offer to new guest');
          
          // Create and send offer
          try {
            const offer = await pc.createOffer();
            console.log('Created offer for guest:', offer);
            await pc.setLocalDescription(offer);
            
            newSocket.emit('offer', {
              sessionId: sessionIdRef.current,
              targetId: guestId,
              offer
            });
            console.log('✅ Sent offer to guest:', guestId);
          } catch (error) {
            console.error('❌ Error creating offer for guest:', error);
          }
        } else {
          console.error('❌ Cannot send offer - missing:', {
            hasPeerConnection: !!pc,
            hasLocalStream: !!stream
          });
        }
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
      setRemoteSocketId(null);
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

    newSocket.on('offer', async (data) => {
      console.log('📨 RECEIVED OFFER from server');
      console.log('Offer data:', data);
      await handleOffer(data);
    });

    newSocket.on('answer', async (data) => {
      console.log('📨 RECEIVED ANSWER from server');
      console.log('Answer data:', data);
      await handleAnswer(data);
    });

    newSocket.on('ice-candidate', (data) => {
      console.log('📨 RECEIVED ICE CANDIDATE from server');
      console.log('Candidate:', data.candidate);
      handleIceCandidate(data);
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

  // Auto-open remote desktop when guest receives stream
  useEffect(() => {
    if (remoteStream && !isHost) {
      // Automatically open remote desktop viewer for guests
      setTimeout(() => {
        openRemoteDesktop();
        // Enable remote control by default
        setTimeout(() => {
          enableRemoteControl();
        }, 1000);
      }, 1000);
    }
  }, [remoteStream, isHost]);

  // Update popup window when remoteStream changes
  useEffect(() => {
    if (remoteDesktopWindow && !remoteDesktopWindow.closed && remoteStream) {
      const popupVideo = remoteDesktopWindow.document.getElementById('remoteVideo');
      const loadingOverlay = remoteDesktopWindow.document.getElementById('loadingOverlay');
      
      if (popupVideo && popupVideo.srcObject !== remoteStream) {
        console.log('Updating popup with new remote stream');
        popupVideo.srcObject = remoteStream;
        popupVideo.muted = true; // Required for autoplay
        
        // Try to play immediately
        popupVideo.play().then(() => {
          console.log('✅ Video playing immediately (useEffect)!');
          
          // Update progress to 100% and show success
          const popupDoc = remoteDesktopWindow.document;
          const progressBar = popupDoc.getElementById('progressBar');
          const progressText = popupDoc.getElementById('progressText');
          const statusText = popupDoc.getElementById('statusText');
          const loadingOverlay = popupDoc.getElementById('loadingOverlay');
          
          if (progressBar) progressBar.style.width = '100%';
          if (progressText) progressText.textContent = '100%';
          if (statusText) statusText.textContent = '✅ Connected! Stream ready!';
          
          // Hide overlay after a brief moment
          setTimeout(() => {
            if (loadingOverlay) {
              loadingOverlay.style.display = 'none';
            }
          }, 500);
        }).catch(err => {
          console.log('Immediate play failed (useEffect), waiting for metadata...', err.message);
        });
        
        // Also try on metadata event
        popupVideo.onloadedmetadata = () => {
          console.log('Video metadata loaded in popup (useEffect)');
          popupVideo.play().then(() => {
            console.log('✅ Video playing after metadata (useEffect)!');
            
            // Update progress to 100% and show success
            const popupDoc = remoteDesktopWindow.document;
            const progressBar = popupDoc.getElementById('progressBar');
            const progressText = popupDoc.getElementById('progressText');
            const statusText = popupDoc.getElementById('statusText');
            const loadingOverlay = popupDoc.getElementById('loadingOverlay');
            
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            if (statusText) statusText.textContent = '✅ Connected! Stream ready!';
            
            // Hide overlay after a brief moment
            setTimeout(() => {
              if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
              }
            }, 500);
          }).catch(err => {
            console.error('❌ Error playing video (useEffect):', err);
          });
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
        socket.emit('ice-candidate', {
          sessionId: sessionIdRef.current,
          targetId: remoteSocketIdRef.current,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('=== RECEIVED REMOTE STREAM ===');
      console.log('Stream:', event.streams[0]);
      console.log('Tracks:', event.streams[0].getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));
      console.log('Current isHost value:', isHost);
      console.log('Current sessionId value:', sessionId);
      console.log('Remote socket ID:', remoteSocketIdRef.current);
      
      const receivedStream = event.streams[0];
      setRemoteStream(receivedStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = receivedStream;
      }
      
      // Update popup if it's already open
      if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
        console.log('Popup already open, updating with new stream');
        const popupVideo = remoteDesktopWindow.document.getElementById('remoteVideo');
        const loadingOverlay = remoteDesktopWindow.document.getElementById('loadingOverlay');
        if (popupVideo) {
          popupVideo.srcObject = receivedStream;
          popupVideo.play().catch(err => console.error('Popup video play error:', err));
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        }
      }
      // Auto-open is now handled by useEffect watching remoteStream
    };

    pc.ondatachannel = (event) => {
      console.log('Data channel received:', event.channel.label);
      const dataChannel = event.channel;
      
      dataChannel.onopen = () => {
        console.log('Data channel opened (guest side)');
        setDataChannel(dataChannel);
        alert('Connected! File transfer and remote control available.');
      };
      
      dataChannel.onclose = () => {
        console.log('Data channel closed (guest side)');
        setDataChannel(null);
      };
      
      dataChannel.onerror = (error) => {
        console.error('Data channel error (guest side):', error);
        alert('Data channel error: ' + error.message);
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
    peerConnectionRef.current = pc; // Store in ref
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
      localStreamRef.current = stream; // Store in ref for event handlers
      setIsHost(true); // Mark as host
      setScreenSharing(true); // Mark as screen sharing from start

      const pc = initializePeerConnection();
      setPeerConnection(pc); // CRITICAL: Store peer connection in state
      peerConnectionRef.current = pc; // Store in ref for event handlers
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create data channel for file transfer and control
      const dataChannel = pc.createDataChannel('control');
      dataChannel.onopen = () => {
        console.log('Data channel opened (host side)');
        setDataChannel(dataChannel);
        alert('Data channel ready! File transfer and remote control available.');
      };
      dataChannel.onclose = () => {
        console.log('Data channel closed (host side)');
        setDataChannel(null);
      };
      dataChannel.onerror = (error) => {
        console.error('Data channel error (host side):', error);
        alert('Data channel error: ' + error.message);
      };
      dataChannel.onmessage = handleDataChannelMessage;

      // Handle when user stops sharing (browser stop button)
      stream.getVideoTracks()[0].onended = () => {
        alert('Screen sharing ended. Session will be terminated.');
        endSession();
      };

      if (socket) {
        socket.emit('create-session');
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
    
    console.log('=== JOINING SESSION ===');
    console.log('Session ID:', id.trim());
    
    const sessionIdToJoin = id.trim();
    setJoinSessionId(sessionIdToJoin);
    setSessionId(sessionIdToJoin);
    setIsHost(false);
    
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
        stream = new MediaStream();
      }
      
      setLocalStream(stream);
      localStreamRef.current = stream; // Store in ref

      // Create peer connection
      console.log('Creating peer connection for guest');
      const pc = initializePeerConnection();
      setPeerConnection(pc);
      peerConnectionRef.current = pc; // Store in ref
      console.log('Guest peer connection created');
      
      // Add tracks if we have them
      if (stream && stream.getTracks().length > 0) {
        stream.getTracks().forEach(track => {
          console.log('Guest adding track:', track.kind);
          pc.addTrack(track, stream);
        });
      }

      // Emit join-session to server
      if (socket) {
        console.log('Emitting join-session event for:', sessionIdToJoin);
        socket.emit('join-session', sessionIdToJoin);
        alert(`Joining session ${sessionIdToJoin}...\n\nWaiting for host to send their screen.\nThe popup will open automatically when ready.`);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Error joining session: ' + error.message);
    }
  };

  // Actually join session after host approval

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
      setRemoteSocketId(null);
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
    console.log('=== OPEN REMOTE DESKTOP CLICKED ===');
    console.log('Session ID (state):', sessionId);
    console.log('Session ID (ref):', sessionIdRef.current);
    console.log('Remote Stream:', remoteStream);
    console.log('Remote Stream tracks:', remoteStream?.getTracks());
    console.log('Peer Connection:', peerConnection);
    console.log('Peer Connection state:', peerConnection?.connectionState);
    console.log('Is Host:', isHost);
    
    // Use ref instead of state to avoid stale closure
    const currentSessionId = sessionIdRef.current;
    
    if (!currentSessionId) {
      console.error('No session ID - cannot open desktop');
      alert('No active session. Please join a session first.');
      return;
    }

    if (!remoteStream) {
      console.error('No remote stream available yet');
      alert('⏳ Waiting for host to share screen...\n\nThe host needs to start screen sharing. Please wait a moment and try again.');
      return;
    }

    console.log('All checks passed, creating popup window...');

    // Close existing window if open
    if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
      console.log('Closing existing popup window');
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

    console.log('Popup created successfully');
    // Don't set state yet - wait until we're done setting up

  // Create the popup content
  popup.document.open();
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
              muted
            ></video>
            
            <div class="status-overlay" id="statusOverlay">
              Connecting...
            </div>
            
            <div class="loading-overlay" id="loadingOverlay">
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">�️ Connecting to Host</div>
              <div style="width: 300px; background: rgba(255,255,255,0.2); border-radius: 10px; height: 30px; overflow: hidden;">
                <div id="progressBar" style="width: 10%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s ease;"></div>
              </div>
              <div id="progressText" style="font-size: 18px; margin-top: 15px; font-weight: bold;">Initializing... 10%</div>
              <div id="statusText" style="font-size: 14px; margin-top: 10px; color: rgba(255,255,255,0.8);">Setting up connection...</div>
            </div>
          </div>
        </div>
        
        <script>
          var remoteControlEnabled = window.remoteControlEnabled || false;
          var parentWindow = window.opener;
          window.remoteControlEnabled = remoteControlEnabled;
          
          // Progress simulation
          let progress = 10;
          const progressBar = document.getElementById('progressBar');
          const progressText = document.getElementById('progressText');
          const statusText = document.getElementById('statusText');
          
          const stages = [
            { progress: 10, text: 'Initializing...', status: 'Setting up connection...' },
            { progress: 30, text: 'Connecting...', status: 'Establishing peer connection...' },
            { progress: 50, text: 'Negotiating...', status: 'Exchanging connection details...' },
            { progress: 70, text: 'Receiving...', status: 'Waiting for video stream...' },
            { progress: 90, text: 'Almost ready...', status: 'Preparing video player...' }
          ];
          
          let stageIndex = 0;
          const progressInterval = setInterval(() => {
            if (stageIndex < stages.length) {
              const stage = stages[stageIndex];
              progress = stage.progress;
              progressBar.style.width = progress + '%';
              progressText.textContent = stage.text + ' ' + progress + '%';
              statusText.textContent = stage.status;
              stageIndex++;
            } else {
              clearInterval(progressInterval);
            }
          }, 800);
          
          function toggleRemoteControl() {
            remoteControlEnabled = !remoteControlEnabled;
            window.remoteControlEnabled = remoteControlEnabled;
            const btn = document.getElementById('toggleControl');
            const remoteVideoElement = document.getElementById('remoteVideo');
            const status = document.getElementById('statusOverlay');
            
            if (remoteControlEnabled) {
              btn.textContent = 'Disable Control';
              btn.classList.add('active');
              remoteVideoElement.style.cursor = 'crosshair';
              status.textContent = '🖱️ Remote Control Active';
              
              // Notify parent window
              if (parentWindow && !parentWindow.closed) {
                parentWindow.postMessage({ type: 'enableRemoteControl' }, '*');
              }
            } else {
              btn.textContent = 'Enable Control';
              btn.classList.remove('active');
              remoteVideoElement.style.cursor = 'default';
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
          var remoteVideoElement = document.getElementById('remoteVideo');
          remoteVideoElement.addEventListener('mousedown', handleMouseEvent);
          remoteVideoElement.addEventListener('mouseup', handleMouseEvent);
          remoteVideoElement.addEventListener('mousemove', handleMouseEvent);
          remoteVideoElement.addEventListener('click', handleMouseEvent);
          remoteVideoElement.addEventListener('dblclick', handleMouseEvent);
          
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
    
    if (popupVideo) {
      if (remoteStream) {
        console.log('Setting remote stream to popup video');
        popupVideo.srcObject = remoteStream;
        popupVideo.muted = true; // Required for autoplay
        
        // Try to play immediately
        popupVideo.play().then(() => {
          console.log('✅ Video playing immediately!');
          if (loadingOverlay) {
            // Show 100% before hiding
            const progressBar = popup.document.getElementById('progressBar');
            const progressText = popup.document.getElementById('progressText');
            const statusText = popup.document.getElementById('statusText');
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '✅ Connected! 100%';
            if (statusText) statusText.textContent = 'Stream ready!';
            setTimeout(() => {
              loadingOverlay.style.display = 'none';
            }, 500);
          }
        }).catch(err => {
          console.log('Immediate play failed, waiting for metadata...', err.message);
        });
        
        // Also try on metadata event
        popupVideo.onloadedmetadata = () => {
          console.log('Video metadata loaded in popup');
          popupVideo.play().then(() => {
            console.log('✅ Video playing after metadata!');
            if (loadingOverlay) {
              // Show 100% before hiding
              const progressBar = popup.document.getElementById('progressBar');
              const progressText = popup.document.getElementById('progressText');
              const statusText = popup.document.getElementById('statusText');
              if (progressBar) progressBar.style.width = '100%';
              if (progressText) progressText.textContent = '✅ Connected! 100%';
              if (statusText) statusText.textContent = 'Stream ready!';
              setTimeout(() => {
                loadingOverlay.style.display = 'none';
              }, 500);
            }
          }).catch(err => {
            console.error('❌ Error playing video:', err);
          });
        };
      } else {
        console.log('No remote stream available, showing waiting message');
        if (loadingOverlay) {
          loadingOverlay.innerHTML = `
            <div>⏳ Waiting for Remote Stream...</div>
            <div style="font-size: 14px; margin-top: 10px;">
              Host needs to start screen sharing<br/>
              Or request screen share from main window
            </div>
          `;
        }
      }
    }

    // Now that setup is complete, set the window in state
    // This prevents the useEffect from running before the video element exists
    setRemoteDesktopWindow(popup);

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
        case 'requestStream':
          // Send current stream to popup if available
          if (remoteStream && popup && !popup.closed) {
            const popupVideo = popup.document.getElementById('remoteVideo');
            const loadingOverlay = popup.document.getElementById('loadingOverlay');
            if (popupVideo) {
              popupVideo.srcObject = remoteStream;
              if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
              }
            }
          }
          break;
      }
    };

    window.addEventListener('message', handlePopupMessage);
  };

  const handleOffer = async (payload) => {
    console.log('=== RECEIVED OFFER ===');
    console.log('Payload:', payload);

    const { offer, from, sessionId: incomingSessionId } = payload || {};

    if (!offer) {
      console.error('Offer payload missing `offer` SDP');
      return;
    }

    if (from) {
      console.log('Setting remote socket id from offer:', from);
      setRemoteSocketId(from);
    }

    if (!sessionIdRef.current && incomingSessionId) {
      console.log('Updating session id from incoming offer:', incomingSessionId);
      setSessionId(incomingSessionId);
    }

    console.log('Current peer connection:', peerConnection);
    console.log('Current peerConnectionRef:', peerConnectionRef.current);
    console.log('Peer connection state:', peerConnection?.connectionState);
    console.log('Peer connection signaling state:', peerConnection?.signalingState);
    
    // Use existing peer connection or create new one
    let pc = peerConnectionRef.current || peerConnection;
    if (!pc) {
      console.log('❌ No peer connection found, creating new one');
      pc = initializePeerConnection();
      setPeerConnection(pc);
      peerConnectionRef.current = pc; // CRITICAL: Also set ref
    } else {
      console.log('✅ Using existing peer connection');
    }
    
    try {
      console.log('Setting remote description...');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set successfully');
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      console.log('Answer created:', answer);
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      if (socket) {
        console.log('Sending answer back to host');
        socket.emit('answer', {
          sessionId: sessionIdRef.current,
          targetId: remoteSocketIdRef.current,
          answer
        });
      }
      console.log('=== OFFER HANDLING COMPLETE ===');
    } catch (error) {
      console.error('Error handling offer:', error);
      alert('Error connecting to host: ' + error.message);
    }
  };

  const handleAnswer = async (payload) => {
    console.log('Received answer payload:', payload);

    const { answer, from, sessionId: incomingSessionId } = payload || {};

    if (from) {
      console.log('Setting remote socket id from answer:', from);
      setRemoteSocketId(from);
    }

    if (!sessionIdRef.current && incomingSessionId) {
      console.log('Updating session id from incoming answer:', incomingSessionId);
      setSessionId(incomingSessionId);
    }

    if (!answer) {
      console.error('Answer payload missing `answer` SDP');
      return;
    }

    if (!peerConnection) {
      console.error('No peer connection available to handle answer');
      return;
    }
    
    try {
      await peerConnection.setRemoteDescription(answer);
      console.log('Successfully set remote description from answer');
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = (payload) => {
    if (!payload) {
      console.warn('Received empty ICE candidate payload');
      return;
    }

    const { candidate, from } = payload;

    if (from && !remoteSocketIdRef.current) {
      console.log('Setting remote socket id from ICE candidate:', from);
      setRemoteSocketId(from);
    }

    if (!candidate) {
      console.warn('ICE candidate payload missing `candidate`');
      return;
    }

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

    console.log('File upload started:', file.name, file.size, 'bytes');
    console.log('Data channel status:', dataChannel ? 'Available' : 'Not Available');
    console.log('Data channel state:', dataChannel?.readyState);

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    if (!dataChannel || dataChannel.readyState !== 'open') {
      alert('Connection not ready for file transfer. Please ensure you are connected to a session.');
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
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <DesktopWindows sx={{ mr: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                SuperDesk Remote Desktop
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Seamless Remote Access • Crystal Clear Desktop Sharing • Full System Control
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                color="inherit"
                onClick={toggleTheme}
                startIcon={darkMode ? <Brightness7 /> : <Brightness4 />}
                sx={{ textTransform: 'none', color: 'white' }}
              >
                {darkMode ? 'Light' : 'Dark'}
              </Button>
              <Chip 
                icon={connected ? <CheckCircle /> : <Cancel />}
                label={connected ? 'Connected' : 'Disconnected'}
                color={connected ? 'success' : 'error'}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* Hero Section */}
          <Paper sx={{ 
            p: 4, 
            mb: 4, 
            background: darkMode 
              ? 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' 
              : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', 
            color: 'white', 
            textAlign: 'center' 
          }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Next-Generation Remote Desktop
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
              Experience ultra-responsive remote control with enterprise-grade security
            </Typography>
            <Box display="flex" justifyContent="center" gap={4} flexWrap="wrap">
              <Box display="flex" alignItems="center">
                <DesktopWindows sx={{ mr: 1 }} />
                <Typography variant="body2">Real-time Screen Sharing</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <TouchApp sx={{ mr: 1 }} />
                <Typography variant="body2">Instant Remote Control</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <CloudUpload sx={{ mr: 1 }} />
                <Typography variant="body2">Secure File Transfer</Typography>
              </Box>
            </Box>
          </Paper>

          {loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Connecting to SuperDesk Server...
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Server: {config.server}
              </Typography>
            </Paper>
          )}
          
          {connectionError && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => window.location.reload()}
                  startIcon={<PowerSettingsNew />}
                >
                  Retry
                </Button>
              }
            >
              <Typography variant="h6" gutterBottom>
                Connection Failed
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {connectionError}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>Check if server is deployed and running</li>
                <li>Verify server URL: {config.server}</li>
                <li>Disable ad blockers (they can block Socket.io)</li>
                <li>Try incognito/private browsing mode</li>
              </Box>
            </Alert>
          )}

          {!connected && !loading && !connectionError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Connection Issue Detected
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                If you see "ERR_BLOCKED_BY_CLIENT" errors:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>Disable ad blocker for this site</li>
                <li>Try incognito/private browsing mode</li>
                <li>Check browser console for errors</li>
              </Box>
              <Button 
                variant="contained" 
                onClick={() => window.location.reload()}
                startIcon={<PowerSettingsNew />}
                sx={{ mt: 2 }}
              >
                Retry Connection
              </Button>
            </Alert>
          )}

          {sessionId && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Session Active
              </Typography>
              <Typography variant="body1">
                Session ID: <Chip label={sessionId} color="primary" size="small" sx={{ mx: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share this ID with others to join your session
              </Typography>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Host Session Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ScreenShare sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Share My Desktop</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start a new session to share your desktop with others
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained"
                    startIcon={<DesktopWindows />}
                    onClick={startSession} 
                    disabled={!connected}
                    fullWidth
                    size="large"
                  >
                    Start Session
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Join Session Card */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TouchApp sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6">Join Remote Session</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enter a session ID to connect to someone's desktop
                  </Typography>
                  <TextField
                    fullWidth
                    label="Session ID"
                    variant="outlined"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleJoinClick();
                      }
                    }}
                    placeholder="Enter session ID"
                    size="medium"
                    sx={{ mb: 2 }}
                    disabled={!connected}
                  />
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained"
                    color="secondary"
                    startIcon={<Person />}
                    onClick={handleJoinClick}
                    disabled={!connected || !joinSessionId.trim()}
                    fullWidth
                    size="large"
                  >
                    Join Session
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>

          {/* Session Management Controls - Simplified */}
          {sessionId && (
            <Paper sx={{ mt: 3, p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                  <Chip 
                    icon={<Computer />} 
                    label={`${sessionId.substring(0, 8)}...`} 
                    size="small"
                    color="primary" 
                  />
                  <Chip 
                    icon={<Person />} 
                    label={isHost ? 'Host' : 'Guest'} 
                    size="small"
                    color={isHost ? 'success' : 'secondary'}
                  />
                  {!isHost && remoteControlEnabled && (
                    <Chip 
                      icon={<TouchApp />} 
                      label="Control ON" 
                      size="small"
                      color="success"
                    />
                  )}
                </Box>
                <Box display="flex" gap={1}>
                  {!isHost && (
                    <Button 
                      onClick={remoteControlEnabled ? disableRemoteControl : enableRemoteControl} 
                      variant={remoteControlEnabled ? "outlined" : "contained"}
                      startIcon={remoteControlEnabled ? <Cancel /> : <TouchApp />}
                      color={remoteControlEnabled ? "error" : "primary"}
                      size="small"
                    >
                      {remoteControlEnabled ? 'Disable' : 'Enable'} Control
                    </Button>
                  )}
                  <Button 
                    onClick={endSession} 
                    variant="outlined" 
                    color="error" 
                    startIcon={<PowerSettingsNew />}
                    size="small"
                  >
                    End
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Remote Desktop Access - Guest */}
          {sessionId && !isHost && (
            <Paper sx={{ mt: 3, p: 3, textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                {remoteStream ? '✅ Desktop Connected' : '🖥️ Remote Desktop'}
              </Typography>
              
              <Button 
                onClick={openRemoteDesktop}
                variant="contained"
                color={remoteStream ? 'success' : 'primary'}
                startIcon={<ScreenShare />}
                disabled={!sessionId}
                size="large"
                sx={{ 
                  mt: 2,
                  mb: 2,
                  py: 2, 
                  px: 4,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                {remoteStream ? 'Open Desktop Viewer' : 'Waiting for Host...'}
              </Button>

              <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
                <Chip 
                  label={remoteStream ? 'Stream: Ready' : 'Stream: Waiting'} 
                  color={remoteStream ? 'success' : 'default'}
                  size="small"
                />
                <Chip 
                  label={peerConnection ? 'WebRTC: Active' : 'WebRTC: None'} 
                  color={peerConnection ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              {!remoteStream && (
                <Button 
                  onClick={requestScreenShare}
                  variant="outlined"
                  startIcon={<VideoCall />}
                  disabled={screenShareRequested}
                  size="small"
                  sx={{ mt: 2 }}
                >
                  {screenShareRequested ? 'Request Sent' : 'Request Screen Share'}
                </Button>
              )}
            </Paper>
          )}

          {/* File Transfer - Simplified */}
          {sessionId && (
            <Paper sx={{ mt: 3, p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CloudUpload />
                  <Typography variant="body1" fontWeight="bold">File Transfer</Typography>
                  <Chip 
                    label={dataChannel && dataChannel.readyState === 'open' ? 'Ready' : 'Not Ready'} 
                    size="small"
                    color={dataChannel && dataChannel.readyState === 'open' ? 'success' : 'default'}
                  />
                </Box>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  aria-label="Select a file to transfer"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!dataChannel || dataChannel.readyState !== 'open'}
                  variant="contained"
                  startIcon={<CloudUpload />}
                  size="small"
                >
                  Send File (Max 10MB)
                </Button>
              </Box>
              {fileTransfer.active && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uploading: {Math.round(fileTransfer.progress)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={fileTransfer.progress} 
                  />
                </Box>
              )}
            </Paper>
          )}

          {/* Host Status - Simplified */}
          {isHost && sessionId && (
            <Paper sx={{ mt: 3, p: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Computer />
                <Typography variant="body1">
                  Sharing desktop - Session: <Chip label={sessionId.substring(0, 12) + '...'} size="small" color="primary" />
                </Typography>
              </Box>
            </Paper>
          )}
        {/* Vercel build fix */}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
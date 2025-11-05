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
        
        setRemoteSocketId(guestId);
        
        if (peerConnection && localStream) {
          console.log('Sending offer to new guest');
          
          // Create and send offer
          try {
            const offer = await peerConnection.createOffer();
            console.log('Created offer for guest:', offer);
            await peerConnection.setLocalDescription(offer);
            
            newSocket.emit('offer', {
              sessionId: sessionIdRef.current,
              targetId: guestId,
              offer
            });
            console.log('Sent offer to guest:', guestId);
          } catch (error) {
            console.error('Error creating offer for guest:', error);
          }
        } else {
          console.warn('Cannot send offer - no peer connection or local stream');
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
      
      if (popupVideo) {
        console.log('Updating popup with new remote stream');
        popupVideo.srcObject = remoteStream;
        popupVideo.onloadedmetadata = () => {
          console.log('Video metadata loaded in popup');
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
      } else {
        // Automatically open remote desktop popup for guests
        console.log('Auto-opening remote desktop viewer...');
        setTimeout(() => {
          console.log('Attempting to open desktop viewer popup');
          openRemoteDesktop();
        }, 1500);
      }
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
      setPeerConnection(pc); // CRITICAL: Store peer connection in state
      
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

      // Create peer connection
      console.log('Creating peer connection for guest');
      const pc = initializePeerConnection();
      setPeerConnection(pc);
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
        
        // Set timeout to warn if no stream received
        setTimeout(() => {
          if (!remoteStream) {
            console.warn('⚠️ No stream received after 10 seconds');
            alert('⚠️ No response from host.\n\nPossible issues:\n1. Host is not online or session ended\n2. Host hasn\'t started screen sharing\n3. Connection blocked by firewall/network\n\nPlease verify the session ID and try again.');
          }
        }, 10000);
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
    console.log('Session ID:', sessionId);
    console.log('Remote Stream:', remoteStream);
    console.log('Remote Stream tracks:', remoteStream?.getTracks());
    console.log('Peer Connection:', peerConnection);
    console.log('Peer Connection state:', peerConnection?.connectionState);
    console.log('Is Host:', isHost);
    
    if (!sessionId) {
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
    setRemoteDesktopWindow(popup);

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
          var remoteControlEnabled = window.remoteControlEnabled || false;
          var parentWindow = window.opener;
          window.remoteControlEnabled = remoteControlEnabled;
          
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
        popupVideo.onloadedmetadata = () => {
          console.log('Video metadata loaded in popup');
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
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
    console.log('Peer connection state:', peerConnection?.connectionState);
    console.log('Peer connection signaling state:', peerConnection?.signalingState);
    
    // Use existing peer connection or create new one
    let pc = peerConnection;
    if (!pc) {
      console.log('No peer connection found, creating new one');
      pc = initializePeerConnection();
      setPeerConnection(pc);
    } else {
      console.log('Using existing peer connection');
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

          {/* Session Management Controls */}
          {sessionId && (
            <Paper sx={{ mt: 3, p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Session Info
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" alignItems="center">
                          <Computer sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            ID: <Chip label={sessionId} size="small" color="primary" />
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <Person sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            Role: <Chip label={isHost ? 'Host' : 'Guest'} size="small" color={isHost ? 'success' : 'secondary'} />
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <Group sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            Connected: <Badge badgeContent={connectedUsers.length + 1} color="primary" showZero />
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        onClick={endSession} 
                        variant="outlined" 
                        color="error" 
                        startIcon={<PowerSettingsNew />}
                        fullWidth
                      >
                        End Session
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <DesktopWindows sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Remote Desktop
                      </Typography>
                      
                      {isHost ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Desktop sharing is active. Your entire desktop is being shared with remote users.
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            You are viewing the host's desktop. Use remote control features to interact.
                          </Typography>
                        </Alert>
                      )}

                      {/* Remote Control (only for guests) */}
                      {!isHost && (
                        <Box display="flex" gap={2}>
                          {!remoteControlEnabled ? (
                            <Button 
                              onClick={enableRemoteControl} 
                              variant="contained"
                              startIcon={<TouchApp />}
                              color="primary"
                            >
                              Enable Remote Control
                            </Button>
                          ) : (
                            <Button 
                              onClick={disableRemoteControl} 
                              variant="outlined"
                              startIcon={<Cancel />}
                              color="error"
                            >
                              Disable Remote Control
                            </Button>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* ⭐⭐⭐ REMOTE DESKTOP ACCESS - GUESTS ⭐⭐⭐ */}
          {sessionId && !isHost && (
            <Paper 
              elevation={remoteStream ? 20 : 3}
              sx={{ 
                mt: 3, 
                p: 4, 
                background: remoteStream 
                  ? 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' 
                  : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', 
                color: 'white',
                border: remoteStream ? '5px solid #00e676' : '3px solid #64b5f6',
                borderRadius: 3,
                animation: remoteStream ? 'section-pulse 2s infinite' : 'none',
                '@keyframes section-pulse': {
                  '0%': { boxShadow: '0 0 30px rgba(0,230,118,0.5)' },
                  '50%': { boxShadow: '0 0 60px rgba(0,230,118,0.9)' },
                  '100%': { boxShadow: '0 0 30px rgba(0,230,118,0.5)' },
                }
              }}
            >
              <Typography 
                variant="h3" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold', 
                  textAlign: 'center',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  mb: 3
                }}
              >
                {remoteStream ? '🎉 DESKTOP READY! 🎉' : '🖥️ Remote Desktop Access'}
              </Typography>
              
              {remoteStream && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 3, 
                    fontSize: '1.3rem', 
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '3px solid #00c853',
                    '& .MuiAlert-icon': { fontSize: '2.5rem' }
                  }}
                >
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    ✅ Connected to Host's Desktop!
                  </Typography>
                  <Typography variant="h6">
                    👇 Click the button below to view and control the screen 👇
                  </Typography>
                </Alert>
              )}
              
              <Button 
                onClick={openRemoteDesktop}
                variant="contained"
                color={remoteStream ? 'secondary' : 'primary'}
                startIcon={<ScreenShare />}
                disabled={!sessionId}
                fullWidth
                size="large"
                sx={{ 
                  mb: 3, 
                  py: 3, 
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: remoteStream ? '#ff4081' : '#64b5f6',
                  '&:hover': {
                    backgroundColor: remoteStream ? '#f50057' : '#42a5f5',
                  },
                  animation: remoteStream ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.08)' },
                    '100%': { transform: 'scale(1)' }
                  }
                }}
              >
                {remoteStream ? '🖥️ OPEN REMOTE DESKTOP NOW!' : 'Open Desktop Viewer'}
              </Button>
              
              {/* Status Info */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>Remote Stream:</Typography>
                    <Chip 
                      label={remoteStream ? 'Available ✅' : 'Not Available ❌'} 
                      color={remoteStream ? 'success' : 'default'}
                      sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>Session:</Typography>
                    <Chip 
                      label={sessionId ? 'Connected ✅' : 'Not Connected ❌'} 
                      color={sessionId ? 'success' : 'default'}
                      sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>WebRTC:</Typography>
                    <Chip 
                      label={peerConnection ? 'Active ✅' : 'None ❌'} 
                      color={peerConnection ? 'success' : 'default'}
                      sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                    />
                  </Grid>
                </Grid>
              </Box>
              
              {!remoteStream && (
                <Alert severity="warning" sx={{ mt: 3, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    ⏳ Waiting for host's screen...
                  </Typography>
                  <Typography variant="body1">
                    If you don't see the desktop after 10 seconds, try requesting screen share:
                  </Typography>
                  <Button 
                    onClick={requestScreenShare}
                    variant="contained"
                    startIcon={<VideoCall />}
                    disabled={screenShareRequested}
                    sx={{ mt: 2 }}
                  >
                    {screenShareRequested ? 'Request Sent...' : 'Request Screen Share'}
                  </Button>
                </Alert>
              )}
              
              {remoteControlEnabled && (
                <Alert severity="info" sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  <Typography variant="body1" fontWeight="bold">
                    🎮 Remote control is enabled - You can interact with the host's desktop
                  </Typography>
                </Alert>
              )}
            </Paper>
          )}

          {/* File Transfer Section */}
          <Paper sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
              File Transfer
            </Typography>
            
            {/* Data Channel Status */}
            <Alert severity={dataChannel && dataChannel.readyState === 'open' ? 'success' : 'warning'} sx={{ mb: 2 }}>
              <Typography variant="body2">
                Data Channel: {dataChannel ? 
                  (dataChannel.readyState === 'open' ? 'Ready' : dataChannel.readyState) : 
                  'Not Connected'}
              </Typography>
            </Alert>
            
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
              sx={{ mb: 2 }}
            >
              Send File (Max 10MB)
            </Button>
            {fileTransfer.active && (
              <Box sx={{ mb: 2 }}>
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

        {isHost && sessionId && (
          <Paper sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
              Host Status
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your desktop is being shared
                <br />
                Session ID: <Chip label={sessionId} color="primary" size="small" sx={{ mt: 1 }} />
              </Typography>
            </Alert>
          </Paper>
        )}
        {/* Vercel build fix */}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
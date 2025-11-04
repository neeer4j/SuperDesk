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
  const [pendingJoinRequests, setPendingJoinRequests] = useState([]);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'approved', 'rejected'
  const [darkMode, setDarkMode] = useState(false);
  
  // Create theme based on current mode
  const theme = createAppTheme(darkMode ? 'dark' : 'light');
  
  // Toggle dark/light mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  const videoRef = useRef(null);
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

      // Join request event handlers
      newSocket.on('join-request-received', (data) => {
        const { requesterId } = data;
        setPendingJoinRequests(prev => [...prev, requesterId]);
        alert('Someone wants to join your session!');
      });

      newSocket.on('join-request-approved', (data) => {
        console.log('=== JOIN REQUEST APPROVED ===', data);
        const approvedSessionId = data?.sessionId || joinSessionId;
        console.log('Using session ID for join:', approvedSessionId);
        if (!approvedSessionId) {
          console.error('No session ID received with approval. Cannot join session.');
          alert('Join was approved but session ID was missing. Please try again.');
          return;
        }

        setJoinSessionId(approvedSessionId);
        setSessionId(approvedSessionId);
        setJoinRequestStatus('approved');
        alert('Join request approved! Connecting to desktop...');
        performJoinSession(approvedSessionId);
      });

      newSocket.on('join-request-rejected', () => {
        setJoinRequestStatus('rejected');
        alert('Join request was rejected by the host.');
        setJoinSessionId('');
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

  // Auto-open remote desktop when guest joins successfully
  useEffect(() => {
    if (remoteStream && !isHost && joinRequestStatus === 'approved') {
      // Automatically open remote desktop viewer for approved guests
      setTimeout(() => {
        openRemoteDesktop();
        // Enable remote control by default
        setTimeout(() => {
          enableRemoteControl();
        }, 1000);
      }, 1000);
    }
  }, [remoteStream, isHost, joinRequestStatus]);

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
        socket.emit('ice-candidate', event.candidate);
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
      
      setRemoteStream(event.streams[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
      
      // Automatically open remote desktop popup for guests
      // Don't check isHost here since it might not be updated yet
      console.log('Auto-opening remote desktop viewer...');
      setTimeout(() => {
        console.log('Attempting to open desktop viewer popup');
        openRemoteDesktop();
      }, 1500); // Increased delay to ensure state is updated
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
    
    console.log('Sending join request for session:', id);
    
    // Initialize peer connection early to be ready for offers
    if (!peerConnection) {
      console.log('Pre-initializing peer connection for incoming offers');
      const pc = initializePeerConnection();
      setPeerConnection(pc);
    }
    
    if (socket) {
      // Send join request to host (not direct join)
      socket.emit('request-join-session', { 
        sessionId: id.trim(),
        requesterId: socket.id 
      });
      setJoinSessionId(id.trim());
      setJoinRequestStatus('pending');
      alert('Join request sent to host. Waiting for approval...');
    } else {
      alert('Not connected to server. Please refresh and try again.');
    }
  };

  // Actually join session after host approval
  const performJoinSession = async (sessionId) => {
    console.log('=== PERFORM JOIN SESSION ===');
    console.log('Received sessionId parameter:', sessionId);
    console.log('Performing actual join for session:', sessionId);
    
    // Set the session ID in state so guest knows they're in a session
    console.log('Setting sessionId state to:', sessionId);
    setSessionId(sessionId);
    setIsHost(false); // Mark as guest
    console.log('sessionId should now be set in state');
    
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
        console.log('Emitting actual join-session event for:', sessionId);
        socket.emit('join-session', sessionId);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Error joining session: ' + error.message);
    }
  };

  // Host functions for handling join requests
  const approveJoinRequest = async (requesterId) => {
    if (socket) {
      socket.emit('approve-join-request', { 
        sessionId, 
        requesterId 
      });
      
      // Ensure WebRTC connection is established with screen sharing
      if (peerConnection && localStream) {
        console.log('Re-adding tracks for approved guest');
        
        // Remove existing tracks and re-add them to ensure proper sharing
        const senders = peerConnection.getSenders();
        for (const sender of senders) {
          if (sender.track) {
            await peerConnection.removeTrack(sender);
          }
        }
        
        // Add all tracks from local stream (screen + audio)
        localStream.getTracks().forEach(track => {
          console.log('Adding track:', track.kind, track.label);
          peerConnection.addTrack(track, localStream);
        });
        
        // Create and send a new offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
        
        console.log('Sent offer with screen sharing tracks to approved guest');
      } else {
        console.warn('No peer connection or local stream available for screen sharing');
      }
    }
    setPendingJoinRequests(prev => prev.filter(id => id !== requesterId));
    alert('Join request approved! User can now access your desktop.');
  };

  const rejectJoinRequest = (requesterId) => {
    if (socket) {
      socket.emit('reject-join-request', { 
        sessionId, 
        requesterId 
      });
    }
    setPendingJoinRequests(prev => prev.filter(id => id !== requesterId));
    alert('Join request rejected.');
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
    console.log('=== OPEN REMOTE DESKTOP CLICKED ===');
    console.log('Session ID:', sessionId);
    console.log('Remote Stream:', remoteStream);
    console.log('Remote Stream tracks:', remoteStream?.getTracks());
    console.log('Peer Connection:', peerConnection);
    console.log('Peer Connection state:', peerConnection?.connectionState);
    console.log('Is Host:', isHost);
    console.log('Join Request Status:', joinRequestStatus);
    
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

  const handleOffer = async (offer) => {
    console.log('=== RECEIVED OFFER FROM HOST ===');
    console.log('Offer:', offer);
    console.log('Current peer connection:', peerConnection);
    
    // Initialize peer connection if it doesn't exist
    let pc = peerConnection;
    if (!pc) {
      console.log('No peer connection found, creating new one');
      pc = initializePeerConnection();
      setPeerConnection(pc);
    }
    
    try {
      console.log('Setting remote description...');
      await pc.setRemoteDescription(offer);
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      if (socket) {
        console.log('Sending answer back to host');
        socket.emit('answer', answer);
      }
      console.log('=== OFFER HANDLING COMPLETE ===');
    } catch (error) {
      console.error('Error handling offer:', error);
      alert('Error connecting to host: ' + error.message);
    }
  };

  const handleAnswer = async (answer) => {
    console.log('Received answer from guest:', answer);
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
              {/* 🎉 FLOATING DESKTOP BUTTON - Shows when approved! */}
              {joinRequestStatus === 'approved' && !isHost && (
                <>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={openRemoteDesktop}
                    startIcon={remoteStream ? <DesktopWindows /> : <CircularProgress size={20} sx={{ color: '#fff' }} />}
                    disabled={!remoteStream}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      py: 1.5,
                      px: 3,
                      backgroundColor: remoteStream ? '#00e676' : '#ffa726',
                      color: '#000',
                      '&:hover': {
                        backgroundColor: remoteStream ? '#00c853' : '#ff9800',
                      },
                      '&:disabled': {
                        backgroundColor: '#ffa726',
                        color: '#000',
                        opacity: 0.8,
                      },
                      animation: remoteStream ? 'super-pulse 1s infinite' : 'waiting-pulse 1.5s infinite',
                      '@keyframes super-pulse': {
                        '0%': { 
                          transform: 'scale(1)',
                          boxShadow: '0 0 10px rgba(0,230,118,0.7)'
                        },
                        '50%': { 
                          transform: 'scale(1.1)',
                          boxShadow: '0 0 30px rgba(0,230,118,1)'
                        },
                        '100%': { 
                          transform: 'scale(1)',
                          boxShadow: '0 0 10px rgba(0,230,118,0.7)'
                        }
                      },
                      '@keyframes waiting-pulse': {
                        '0%': { 
                          boxShadow: '0 0 10px rgba(255,167,38,0.5)'
                        },
                        '50%': { 
                          boxShadow: '0 0 20px rgba(255,167,38,0.8)'
                        },
                        '100%': { 
                          boxShadow: '0 0 10px rgba(255,167,38,0.5)'
                        }
                      }
                    }}
                  >
                    {remoteStream ? '🖥️ OPEN DESKTOP NOW!' : '⏳ Waiting for Stream...'}
                  </Button>
                  {remoteStream && (
                    <Chip 
                      label="Stream Ready ✅" 
                      color="success"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  )}
                </>
              )}
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
                  {joinRequestStatus === 'pending' && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Waiting for host approval...
                    </Alert>
                  )}
                  {joinRequestStatus === 'rejected' && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Join request was rejected by the host
                    </Alert>
                  )}
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained"
                    color="secondary"
                    startIcon={<Person />}
                    onClick={handleJoinClick}
                    disabled={!connected || !joinSessionId.trim() || joinRequestStatus === 'pending'}
                    fullWidth
                    size="large"
                  >
                    {joinRequestStatus === 'pending' ? 'Request Sent...' : 'Request to Join'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* HUGE Banner for Approved Guest */}
            {joinRequestStatus === 'approved' && !isHost && (
              <Grid item xs={12}>
                <Paper 
                  elevation={10} 
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #00c853 0%, #00e676 100%)',
                    border: '4px solid #1b5e20',
                    borderRadius: 3,
                    animation: 'banner-pulse 2s infinite',
                    '@keyframes banner-pulse': {
                      '0%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(0,200,83,0.5)' },
                      '50%': { transform: 'scale(1.02)', boxShadow: '0 0 40px rgba(0,200,83,0.8)' },
                      '100%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(0,200,83,0.5)' },
                    }
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'white', mb: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    ✅ CONNECTION APPROVED! ✅
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Your request was accepted! Scroll down to the "Remote Desktop Access" section below.
                  </Typography>
                  <Alert 
                    severity="success" 
                    sx={{ 
                      fontSize: '1.3rem', 
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      '& .MuiAlert-icon': { fontSize: '2rem' }
                    }}
                  >
                    👇 Scroll down and click the green "OPEN REMOTE DESKTOP" button! 👇
                  </Alert>
                </Paper>
              </Grid>
            )}
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
            
            {pendingJoinRequests.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Incoming Join Requests
                  </Typography>
                </Alert>
                <List>
                  {pendingJoinRequests.map(requesterId => (
                    <ListItem key={requesterId} divider>
                      <ListItemIcon>
                        <Person />
                      </ListItemIcon>
                      <ListItemText
                        primary={`User ${requesterId.substring(0, 8)} wants to join your session`}
                        secondary="Click to approve or reject this request"
                      />
                      <Box display="flex" gap={1}>
                        <Button 
                          onClick={() => approveJoinRequest(requesterId)}
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          size="small"
                        >
                          Accept
                        </Button>
                        <Button 
                          onClick={() => rejectJoinRequest(requesterId)}
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          size="small"
                        >
                          Reject
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        )}
        {/* Vercel build fix */}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
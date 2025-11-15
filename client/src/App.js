import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import config, { fetchIceServers } from './config';
import './App.css';
import LandingPage from './LandingPage';
import FeaturesPage from './FeaturesPage';

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
  CircularProgress,
  LinearProgress
} from '@mui/material';

import {
  DesktopWindows,
  VideoCall,
  Person,
  CheckCircle,
  Cancel,
  CloudUpload,
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
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'features', 'session'
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionIdState] = useState('');
  const [joinSessionId, setJoinSessionIdState] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [fileTransfer, setFileTransfer] = useState({ progress: 0, active: false });
  const [connectionError, setConnectionError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
  const [screenShareRequested, setScreenShareRequested] = useState(false);
  const [remoteDesktopWindow, setRemoteDesktopWindowState] = useState(null);
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
  };
  
  // Toggle dark/light mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  const videoRef = useRef(null);
  const remoteDesktopWindowRef = useRef(null);
  const isHostRef = useRef(false);
  const sessionIdRef = useRef('');
  const setRemoteDesktopWindow = useCallback((value) => {
    remoteDesktopWindowRef.current = value;
    setRemoteDesktopWindowState(value);
  }, []);
  const joinSessionIdRef = useRef('');
  const remoteSocketIdRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const outboundStatsIntervalRef = useRef(null);
  const recoverScreenShareRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]); // Buffer for ICE candidates that arrive before peer connection is ready
  const restartingCaptureRef = useRef(false);
  const lastRecoveryAttemptRef = useRef(0);

  const logLocalVideoDiagnostics = useCallback((label) => {
    const stream = localStreamRef.current;
    const track = stream?.getVideoTracks?.()[0] || null;
    if (!track) {
      console.log(`[diagnostics][local-track] ${label}: no video track`);
      return;
    }
    try {
      const settings = track.getSettings ? track.getSettings() : {};
      console.log(`[diagnostics][local-track] ${label}`, {
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
        label: track.label,
        settings
      });
    } catch (e) {
      console.log(`[diagnostics][local-track] ${label}: settings unavailable`, e);
    }
    }, []);

  const startOutboundStatsLogger = (pc) => {
    if (!pc) return;
    if (outboundStatsIntervalRef.current) return;
    outboundStatsIntervalRef.current = setInterval(async () => {
      try {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (!sender) {
          console.log('[diagnostics][outbound] video sender not ready');
          return;
        }
        const stats = await sender.getStats();
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            console.log('[diagnostics][outbound]', {
              bytesSent: report.bytesSent,
              framesEncoded: report.framesEncoded,
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              packetsSent: report.packetsSent,
              qualityLimitationReason: report.qualityLimitationReason
            });
          }
        });
      } catch (error) {
        console.log('[diagnostics][outbound] stats error', error);
      }
    }, 3000);
  };

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

  useEffect(() => {
    // Expose internals for debugging via DevTools console
    window.superdeskDebug = {
      getSessionId: () => sessionIdRef.current,
      getPeerConnection: () => peerConnectionRef.current,
      getLocalStream: () => localStreamRef.current,
      getRemoteStream: () => remoteStream,
      getVideoElement: () => videoRef.current
    };

    return () => {
      if (window.superdeskDebug) {
        delete window.superdeskDebug;
      }
    };
  }, [remoteStream]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => () => {
    if (outboundStatsIntervalRef.current) {
      clearInterval(outboundStatsIntervalRef.current);
      outboundStatsIntervalRef.current = null;
    }
  }, []);

  const [forceRelay, setForceRelay] = useState(false);
  // Track if we've already tried automatic relay fallback this session
  const relayAutoTriedRef = useRef(false);
  const [iceServers, setIceServers] = useState([]);

  // Fetch dynamic ICE servers on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const servers = await fetchIceServers();
      if (!cancelled) setIceServers(servers);
    })();
    return () => { cancelled = true; };
  }, []);

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
        alert(`Screen share requested by ${requesterId}`);
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

  socketRef.current = newSocket;

      newSocket.on('connect', () => {
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
      if (remoteDesktopWindowRef.current && !remoteDesktopWindowRef.current.closed) {
        remoteDesktopWindowRef.current.close();
      }
      setRemoteDesktopWindow(null);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      localStreamRef.current = null;
    });

      newSocket.on('remote-control-enabled', () => {
      setRemoteControlEnabled(true);
      if (isHostRef.current) {
        alert('Guest remote control enabled. You can disable it any time from the dashboard.');
      } else {
        alert('Remote control has been enabled by the host');
      }
    });

      newSocket.on('remote-control-disabled', () => {
      setRemoteControlEnabled(false);
      if (isHostRef.current) {
        alert('Guest remote control disabled.');
      } else {
        alert('Remote control has been disabled by the host');
      }
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

    return () => {
      socketRef.current = null;
      newSocket.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update popup window when remoteStream changes (ONLY for cases where stream arrives AFTER popup opens)
  useEffect(() => {
    console.log('🔄 useEffect triggered - remoteStream changed');
    console.log('remoteDesktopWindow exists:', !!remoteDesktopWindow);
    console.log('remoteStream exists:', !!remoteStream);
    
    if (remoteDesktopWindow && !remoteDesktopWindow.closed && remoteStream) {
      const popupVideo = remoteDesktopWindow.document.getElementById('remoteVideo');
      
      console.log('popupVideo exists:', !!popupVideo);
      console.log('popupVideo.srcObject:', popupVideo?.srcObject);
      console.log('remoteStream:', remoteStream);
      console.log('Are they equal?', popupVideo?.srcObject === remoteStream);
      
      if (popupVideo && popupVideo.srcObject !== remoteStream) {
        console.log('⚠️ useEffect setting stream - stream arrived after popup opened');
        
        // Just set the stream - the onplaying handler from openRemoteDesktop will handle the rest
        popupVideo.srcObject = remoteStream;
        
        // Autoplay should handle it, but add fallback
        setTimeout(() => {
          if (popupVideo.paused) {
            console.log('⚠️ useEffect: Autoplay didnt work, manually playing...');
            popupVideo.play().catch(err => {
              console.error('useEffect manual play failed:', err);
            });
          }
        }, 2000);
      }
    }
  }, [remoteStream, remoteDesktopWindow]); // Include both dependencies

  const initializePeerConnection = () => {
  const baseConfig = { iceServers, iceCandidatePoolSize: 10 };
  const configPc = forceRelay ? { ...baseConfig, iceTransportPolicy: 'relay' } : baseConfig;
  console.log('Creating RTCPeerConnection with config:', configPc);
  const pc = new RTCPeerConnection(configPc);

  // ICE diagnostics (guest)
  const candidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0, tcp: 0, udp: 0 };
  const parseCandidate = (candObj) => {
    try {
      const cand = candObj?.candidate || '';
      if (!cand.startsWith('candidate:')) return;
      const parts = cand.split(' ');
      const proto = (parts[2] || '').toLowerCase();
      const typIndex = parts.indexOf('typ');
      const typ = typIndex > -1 ? (parts[typIndex + 1] || '').toLowerCase() : '';
      if (typ && candidateStats[typ] !== undefined) candidateStats[typ]++;
      if (proto === 'tcp') candidateStats.tcp++;
      if (proto === 'udp') candidateStats.udp++;
    } catch (_) {}
  };
  // Optimize for desktop streaming

    // If we're the guest (no local stream), proactively indicate we want to receive
    try {
      if (!localStreamRef.current) {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
    } catch (e) {
      console.log('Optional transceiver setup failed (safe to ignore):', e);
    }
    
    pc.onicecandidate = (event) => {
      const activeSocket = socketRef.current;
      if (event.candidate && activeSocket) {
        console.log('📤 Sending ICE candidate to host');
        console.log('Candidate details:', event.candidate);
        parseCandidate(event.candidate);
        activeSocket.emit('ice-candidate', {
          sessionId: sessionIdRef.current,
          targetId: remoteSocketIdRef.current,
          candidate: event.candidate
        });
      } else if (event.candidate && !activeSocket) {
        console.warn('⚠️ ICE candidate generated but socket not ready yet, buffering implicitly handled by host');
        parseCandidate(event.candidate);
      } else if (!event.candidate) {
        console.log('✅ All ICE candidates have been sent (guest)');
        console.log('🔍 ICE candidate summary (guest):', candidateStats);
      }
    };

    pc.ontrack = (event) => {
      console.log('=== RECEIVED REMOTE STREAM ===');
      console.log('Stream:', event.streams[0]);
      console.log('Tracks:', event.streams[0].getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
      console.log('Current isHost value:', isHost);
      console.log('Current sessionId value:', sessionId);
      console.log('Remote socket ID:', remoteSocketIdRef.current);
      
      const receivedStream = event.streams[0];
      
      // Explicitly enable all tracks
      receivedStream.getTracks().forEach(track => {
        console.log(`Enabling track: ${track.kind}, current enabled: ${track.enabled}, muted: ${track.muted}`);
        track.enabled = true;
        track.onended = () => console.log(`[remote track ended] kind=${track.kind}`);
        track.onmute = () => {
          console.log(`[remote track muted] kind=${track.kind}`);
          console.log('Track details:', { enabled: track.enabled, readyState: track.readyState, muted: track.muted });
        };
        track.onunmute = () => {
          console.log(`[remote track unmuted] kind=${track.kind}`);
        };
      });
      
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

    // Connection diagnostics and UI status updates
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[pc.connectionState]', state);
      console.log('Full connection details:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
        const overlay = remoteDesktopWindow.document.getElementById('statusOverlay');
        if (overlay) overlay.textContent = `Connection: ${state}`;
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[pc.iceConnectionState]', state);
      console.log('ICE gathering state:', pc.iceGatheringState);
      
      // Log local and remote descriptions
      console.log('Local description:', pc.localDescription ? 'Set' : 'Not set');
      console.log('Remote description:', pc.remoteDescription ? 'Set' : 'Not set');
      
      if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
        const overlay = remoteDesktopWindow.document.getElementById('statusOverlay');
        if (overlay) overlay.textContent = `ICE: ${state}`;
      }
      
      // If ICE connection fails, log more details
      if (state === 'failed' || state === 'disconnected') {
        console.error('❌ ICE connection issue detected');
        console.log('Checking ICE candidates...');
        pc.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'candidate-pair' || report.type === 'local-candidate' || report.type === 'remote-candidate') {
              console.log('ICE report:', report);
            }
          });
          try {
            console.log('🔎 ICE diagnostics summary (guest):', candidateStats);
          } catch (_) {}
        });

        // Auto relay fallback: only attempt once, only if not already forcing relay, and not yet connected
        if (!relayAutoTriedRef.current && !forceRelay && state === 'failed') {
          relayAutoTriedRef.current = true;
          console.log('🛠️ Auto relay fallback triggered: enabling relay-only and requesting renegotiation');
          setForceRelay(true);
          const activeSocket = socketRef.current;
          // Ask host to renegotiate so we get a fresh offer while in relay-only mode
          activeSocket?.emit('renegotiate', { sessionId: sessionIdRef.current, targetId: remoteSocketIdRef.current });
          if (remoteDesktopWindow && !remoteDesktopWindow.closed) {
            try {
              const overlay = remoteDesktopWindow.document.getElementById('statusOverlay');
              if (overlay) overlay.textContent = 'Retrying with TURN relay...';
            } catch(_) {}
          }
        }
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
            // Cap outgoing video sender to 2 Mbps (re-apply after renegotiation)
            await capSenderToMbps(sender, 2);
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
      logLocalVideoDiagnostics('after getDisplayMedia');
  setIsHost(true); // Mark as host

      const pc = initializePeerConnection();
      setPeerConnection(pc); // CRITICAL: Store peer connection in state
      peerConnectionRef.current = pc; // Store in ref for event handlers
      
      // Add local stream to peer connection and cap video sender
      let videoSender = null;
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === 'video') videoSender = sender;
      });
      if (videoSender) {
        try { await capSenderToMbps(videoSender, 2); } catch (e) { console.warn('capSenderToMbps failed:', e); }
      }
      logLocalVideoDiagnostics('after addTrack');
      startOutboundStatsLogger(pc);

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
      const hostVideoTrack = stream.getVideoTracks()[0];
      if (hostVideoTrack) {
        hostVideoTrack.onmute = () => {
          console.log('[diagnostics][local-track] mute event fired');
          logLocalVideoDiagnostics('onmute');
          recoverScreenShareRef.current?.();
        };
        hostVideoTrack.onunmute = () => {
          console.log('[diagnostics][local-track] unmute event fired');
          logLocalVideoDiagnostics('onunmute');
        };
      }

      const activeSocket = socketRef.current;
      if (activeSocket) {
        activeSocket.emit('create-session');
      } else {
        console.error('❌ Socket not ready - cannot create session');
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
      const activeSocket = socketRef.current;
      if (activeSocket) {
        console.log('Emitting join-session event for:', sessionIdToJoin);
        activeSocket.emit('join-session', sessionIdToJoin);
        alert(`Joining session ${sessionIdToJoin}...\n\nWaiting for host to send their screen.\nThe popup will open automatically when ready.`);
      } else {
        console.error('❌ Socket not ready - cannot join session');
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
  const enableRemoteControl = useCallback(() => {
    setRemoteControlEnabled(true);
    const activeSocket = socketRef.current;
    if (activeSocket) {
      activeSocket.emit('enable-remote-control', { sessionId });
    } else {
      console.warn('⚠️ Cannot enable remote control - socket not ready');
    }
    alert('Remote control enabled! Click on the screen to control the remote PC.');
  }, [sessionId]);

  const disableRemoteControl = useCallback(() => {
    setRemoteControlEnabled(false);
    const activeSocket = socketRef.current;
    if (activeSocket) {
      activeSocket.emit('disable-remote-control', { sessionId });
    } else {
      console.warn('⚠️ Cannot disable remote control - socket not ready');
    }
    alert('Remote control disabled.');
  }, [sessionId]);

  // Session Management
  const endSession = useCallback(() => {
    if (!window.confirm('Are you sure you want to end this session?')) {
      return;
    }

    const activeSocket = socketRef.current;
    if (activeSocket) {
      activeSocket.emit('end-session', sessionId);
    } else {
      console.warn('⚠️ Cannot end session - socket not ready');
    }

    // Clean up local resources
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
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

    if (outboundStatsIntervalRef.current) {
      clearInterval(outboundStatsIntervalRef.current);
      outboundStatsIntervalRef.current = null;
    }

    setSessionId('');
    setJoinSessionId('');
    setRemoteStream(null);
    setIsHost(false);
    setRemoteSocketId(null);
    setRemoteControlEnabled(false);
    setScreenShareRequested(false);
    setFileTransfer({ progress: 0, active: false });
    restartingCaptureRef.current = false;

    alert('Session ended successfully!');
  }, [dataChannel, localStream, peerConnection, sessionId]);

  const recoverScreenShare = useCallback(async () => {
    if (!isHost) return;

    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log('[capture-recovery] Peer connection unavailable; skipping recovery');
      return;
    }

    const videoSender = pc.getSenders().find((sender) => sender.track && sender.track.kind === 'video');
    if (!videoSender) {
      console.log('[capture-recovery] Video sender not ready; skipping recovery');
      return;
    }

    if (restartingCaptureRef.current) {
      console.log('[capture-recovery] Recovery already in progress');
      return;
    }

    const now = Date.now();
    if (now - lastRecoveryAttemptRef.current < 5000) {
      console.log('[capture-recovery] Recent recovery attempt detected; throttling');
      return;
    }

    restartingCaptureRef.current = true;
    lastRecoveryAttemptRef.current = now;

    try {
      console.log('[capture-recovery] Attempting to re-acquire display capture');
      const newStream = await navigator.mediaDevices.getDisplayMedia({
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
          systemAudio: 'include'
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        console.error('[capture-recovery] Display capture returned no video track');
        newStream.getTracks().forEach((track) => track.stop());
        return;
      }

      await videoSender.replaceTrack(newVideoTrack);

      const audioSender = pc.getSenders().find((sender) => sender.track && sender.track.kind === 'audio');
      const newAudioTrack = newStream.getAudioTracks()[0] || null;

      if (newAudioTrack) {
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        } else {
          pc.addTrack(newAudioTrack, newStream);
        }
      }

      const previousStream = localStreamRef.current;
      const mergedStream = new MediaStream();
      mergedStream.addTrack(newVideoTrack);
      if (newAudioTrack) {
        mergedStream.addTrack(newAudioTrack);
      } else if (previousStream) {
        previousStream.getAudioTracks().forEach((track) => mergedStream.addTrack(track));
      }

      setLocalStream(mergedStream);
      localStreamRef.current = mergedStream;

      if (previousStream && previousStream !== mergedStream) {
        previousStream.getVideoTracks().forEach((track) => track.stop());
        if (newAudioTrack) {
          previousStream.getAudioTracks().forEach((track) => track.stop());
        }
      }

      logLocalVideoDiagnostics('after capture recovery');

      newVideoTrack.onmute = () => {
        console.log('[diagnostics][local-track] mute event fired (recovered)');
        logLocalVideoDiagnostics('onmute (recovered)');
        recoverScreenShareRef.current?.();
      };

      newVideoTrack.onunmute = () => {
        console.log('[diagnostics][local-track] unmute event fired (recovered)');
        logLocalVideoDiagnostics('onunmute (recovered)');
      };

      newVideoTrack.onended = () => {
        alert('Screen sharing ended. Session will be terminated.');
        endSession();
      };

      console.log('[capture-recovery] Screen capture restarted successfully');
    } catch (error) {
      console.error('[capture-recovery] Failed to recover screen capture', error);
      alert('Screen capture was interrupted and could not be restored automatically. Please start the session again.');
    } finally {
      restartingCaptureRef.current = false;
    }
  }, [endSession, isHost, logLocalVideoDiagnostics, setLocalStream]);

  useEffect(() => {
    recoverScreenShareRef.current = recoverScreenShare;
    return () => {
      if (recoverScreenShareRef.current === recoverScreenShare) {
        recoverScreenShareRef.current = null;
      }
    };
  }, [recoverScreenShare]);

  // Screen Sharing Functions
  const requestScreenShare = () => {
    const activeSocket = socketRef.current;
    if (activeSocket && sessionId) {
      activeSocket.emit('request-screen-share', { 
        sessionId, 
        requesterId: activeSocket.id 
      });
      setScreenShareRequested(true);
      alert('Screen share request sent to host!');
    } else {
      console.warn('⚠️ Cannot request screen share - socket not ready or no session');
    }
  };

  // Remote Desktop Popup
  const openRemoteDesktop = useCallback(() => {
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
    try {
      popup.remoteControlEnabled = remoteControlEnabled;
    } catch (error) {
      console.log('Unable to prime popup remote control state:', error);
    }
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
            /* Avoid browser media gestures interfering with control */
            user-select: none;
            -webkit-user-drag: none;
            -webkit-user-select: none;
            -ms-user-select: none;
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
              <div style="margin-top: 12px;">
                <button id="retryBtn" style="padding:6px 12px;border:none;border-radius:4px;background:#1976d2;color:#fff;cursor:pointer;">Retry Play</button>
              </div>
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
          window.progressInterval = setInterval(() => {
            if (stageIndex < stages.length) {
              const stage = stages[stageIndex];
              progress = stage.progress;
              progressBar.style.width = progress + '%';
              progressText.textContent = stage.text + ' ' + progress + '%';
              statusText.textContent = stage.status;
              stageIndex++;
            } else {
              clearInterval(window.progressInterval);
            }
          }, 800);
          
          function applyRemoteControlState(enabled) {
            remoteControlEnabled = !!enabled;
            window.remoteControlEnabled = remoteControlEnabled;
            const btn = document.getElementById('toggleControl');
            const remoteVideoElement = document.getElementById('remoteVideo');
            const status = document.getElementById('statusOverlay');

            if (!btn || !remoteVideoElement || !status) {
              return;
            }

            if (remoteControlEnabled) {
              btn.textContent = 'Disable Control';
              btn.classList.add('active');
              remoteVideoElement.style.cursor = 'crosshair';
              status.textContent = '🖱️ Remote Control Active';
            } else {
              btn.textContent = 'Enable Control';
              btn.classList.remove('active');
              remoteVideoElement.style.cursor = 'default';
              status.textContent = '👁️ View Only';
            }
          }

          function toggleRemoteControl() {
            applyRemoteControlState(!remoteControlEnabled);

            if (parentWindow && !parentWindow.closed) {
              parentWindow.postMessage({ type: remoteControlEnabled ? 'enableRemoteControl' : 'disableRemoteControl' }, '*');
            }
          }
          
          function handleMouseEvent(event) {
            if (!remoteControlEnabled || !parentWindow || parentWindow.closed) return;
            // Prevent default media behaviors (e.g., dblclick fullscreen/pause in some UIs)
            if (event.type === 'dblclick' || event.type === 'click') {
              event.preventDefault();
              event.stopPropagation();
            }
            
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
          
          window.addEventListener('message', function(event) {
            const message = event.data;
            if (!message || typeof message !== 'object') {
              return;
            }

            if (message.type === 'syncRemoteControlState') {
              applyRemoteControlState(message.enabled);
            }
          });

          // Add event listeners
          var remoteVideoElement = document.getElementById('remoteVideo');
          // Attempt to auto-resume if paused by browser default actions
          remoteVideoElement.addEventListener('pause', function() {
            try { this.play().catch(()=>{}); } catch(_){}
          });
          // Suppress context menu and double-click fullscreen/pause side-effects
          remoteVideoElement.addEventListener('contextmenu', function(e){ e.preventDefault(); });
          remoteVideoElement.addEventListener('dblclick', function(e){ e.preventDefault(); e.stopPropagation(); });
          remoteVideoElement.addEventListener('click', function(e){ if (remoteControlEnabled) { e.preventDefault(); e.stopPropagation(); } });
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
          applyRemoteControlState(remoteControlEnabled);
        </script>
      </body>
      </html>
    `);

  popup.document.close();

    // Set up the video stream in the popup
    const popupVideo = popup.document.getElementById('remoteVideo');
    
    // Set the popup window reference FIRST, before setting the stream
    setRemoteDesktopWindow(popup);
    
    // Now set the stream directly if it exists
    if (popupVideo && remoteStream) {
      console.log('📺 openRemoteDesktop: Setting initial remote stream to popup video');
      console.log('Stream object:', remoteStream);
      console.log('Stream tracks:', remoteStream.getTracks());
      console.log('Stream active:', remoteStream.active);
      console.log('Video tracks:', remoteStream.getVideoTracks());
      
      // Set muted first (required for autoplay)
      popupVideo.muted = true;
      
      // Set up a playing event to hide the loading overlay
      popupVideo.onplaying = () => {
        console.log('✅ Video is now playing!');
        
        // Clear the progress animation interval
        if (popup.progressInterval) {
          clearInterval(popup.progressInterval);
        }
        
        // Update progress to 100% and show success
        const progressBar = popup.document.getElementById('progressBar');
        const progressText = popup.document.getElementById('progressText');
        const statusText = popup.document.getElementById('statusText');
        const loadingOverlay = popup.document.getElementById('loadingOverlay');
        
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        if (statusText) statusText.textContent = '✅ Connected! Stream ready!';
        
        // Hide overlay after a brief moment
        setTimeout(() => {
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        }, 500);
      };
      
      // Add error handlers
      popupVideo.onerror = (e) => {
        console.error('❌ Video error:', e);
        console.error('Video error details:', popupVideo.error);
      };
      
      popupVideo.onloadedmetadata = () => {
        console.log('✅ Video metadata loaded');
        console.log('Video dimensions:', popupVideo.videoWidth, 'x', popupVideo.videoHeight);
      };
      
      popupVideo.onloadeddata = () => {
        console.log('✅ Video data loaded - ready to play');
      };
      
  // Set the srcObject - autoplay attribute will handle playing
  popupVideo.srcObject = remoteStream;
  // Expose controls temporarily to help user trigger playback if needed
  try { popupVideo.controls = true; } catch(_) {}
  console.log('Stream set, autoplay will handle playback');
      
      // Fallback: If autoplay doesn't work within 2 seconds, manually play
      setTimeout(() => {
        if (popupVideo.paused) {
          console.log('⚠️ Autoplay didnt work, manually playing...');
          popupVideo.play().catch(err => {
            console.error('Manual play also failed:', err);
          });
        }
      }, 2000);

      // Wire up Retry button to force play
      const retryBtn = popup.document.getElementById('retryBtn');
      if (retryBtn) {
        retryBtn.onclick = () => {
          console.log('🔁 Retry Play clicked');
          popupVideo.play().then(() => {
            console.log('Retry play succeeded');
          }).catch(err => {
            console.error('Retry play failed:', err);
          });
        };
      }

      // Playback watchdog: if ICE is connected but the video stays paused/no frames, reattempt play
      try {
        let attempts = 0;
        const maxAttempts = 5; // ~10s total
        const watchdog = setInterval(() => {
          attempts++;
          const ready = popupVideo.readyState; // 0-4
          const paused = popupVideo.paused;
          console.log(`[watchdog] attempt=${attempts} readyState=${ready} paused=${paused}`);
          if (!paused && ready >= 2) {
            clearInterval(watchdog);
            return;
          }
          popupVideo.play().catch(() => {});
          if (attempts >= maxAttempts) {
            clearInterval(watchdog);
            const statusText = popup.document.getElementById('statusText');
            if (statusText) statusText.textContent = 'If the video is still not visible, requesting reconnect...';
            // If ICE is connected but we still have no frames, request renegotiation
            try {
              const pc = peerConnectionRef.current;
              if (pc && (pc.iceConnectionState === 'connected' || pc.connectionState === 'connected')) {
                console.log('Requesting renegotiation from host');
                const activeSocket = socketRef.current;
                activeSocket?.emit('renegotiate', { sessionId: sessionIdRef.current, targetId: remoteSocketIdRef.current });
              }
            } catch(_) {}
          }
        }, 2000);
      } catch(e) { /* noop */ }
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
          const activeSocket = socketRef.current;
          if (activeSocket && sessionId) {
            activeSocket.emit('mouse-event', {
              sessionId,
              ...event.data.event
            });
          }
          break;
        case 'keyboardEvent':
          const activeSocket2 = socketRef.current;
          if (activeSocket2 && sessionId) {
            activeSocket2.emit('keyboard-event', {
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
        default:
          console.log('Unhandled popup message:', event.data);
          break;
      }
    };

    window.addEventListener('message', handlePopupMessage);
  }, [
    disableRemoteControl,
    enableRemoteControl,
    isHost,
    peerConnection,
    remoteDesktopWindow,
    remoteStream,
    sessionId,
    remoteControlEnabled,
    setRemoteDesktopWindow
  ]);

  // Popup window now requires manual user click - no auto-open

  useEffect(() => {
    const popup = remoteDesktopWindow;
    if (!popup || popup.closed) {
      return;
    }
    try {
      popup.postMessage({ type: 'syncRemoteControlState', enabled: remoteControlEnabled }, '*');
    } catch (error) {
      console.log('Failed to sync remote control state to popup:', error);
    }
  }, [remoteControlEnabled, remoteDesktopWindow]);

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
      
      // Process any buffered ICE candidates now that remote description is set
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`📦 Processing ${pendingIceCandidatesRef.current.length} buffered ICE candidates`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Buffered ICE candidate added');
          } catch (err) {
            console.error('❌ Error adding buffered ICE candidate:', err);
          }
        }
        pendingIceCandidatesRef.current = []; // Clear the buffer
      }
      
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      console.log('Answer created:', answer);
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      const activeSocket = socketRef.current;
      if (activeSocket) {
        console.log('Sending answer back to host');
        activeSocket.emit('answer', {
          sessionId: sessionIdRef.current,
          targetId: remoteSocketIdRef.current,
          answer
        });
      } else {
        console.error('❌ Socket not ready - cannot send answer back to host');
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

    const pc = peerConnectionRef.current || peerConnection;
    
    if (!pc) {
      console.error('No peer connection available to handle answer');
      return;
    }
    
    try {
      await pc.setRemoteDescription(answer);
      console.log('Successfully set remote description from answer');
      
      // Process any buffered ICE candidates now that remote description is set (HOST SIDE)
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`📦 Processing ${pendingIceCandidatesRef.current.length} buffered ICE candidates (host)`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Buffered ICE candidate added (host)');
          } catch (err) {
            console.error('❌ Error adding buffered ICE candidate (host):', err);
          }
        }
        pendingIceCandidatesRef.current = []; // Clear the buffer
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (payload) => {
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

    const pc = peerConnectionRef.current || peerConnection;
    
    if (!pc) {
      console.warn('⏸️ Peer connection not ready yet, buffering ICE candidate');
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    // Check if remote description is set before adding ICE candidate
    if (!pc.remoteDescription) {
      console.warn('⏸️ Remote description not set yet, buffering ICE candidate');
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added successfully');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
      // If it fails due to timing, buffer it
      if (error.message.includes('remote description')) {
        console.warn('⏸️ Buffering candidate due to timing issue');
        pendingIceCandidatesRef.current.push(candidate);
      }
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
      {currentPage === 'landing' ? (
        <LandingPage 
          onGetStarted={() => setCurrentPage('session')} 
          onViewFeatures={() => setCurrentPage('features')}
          darkMode={darkMode}
        />
      ) : currentPage === 'features' ? (
        <FeaturesPage
          onBack={() => setCurrentPage('landing')}
          onGetStarted={() => setCurrentPage('session')}
          darkMode={darkMode}
        />
      ) : (
      <Box sx={{ 
        flexGrow: 1, 
        minHeight: '100vh', 
        background: '#0a0a0a'
      }}>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
          }}
        >
          <Toolbar>
            <DesktopWindows sx={{ mr: 2, color: '#8b5cf6' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div" sx={{ color: '#fff' }}>
                SuperDesk Remote Desktop
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Secure • Fast • Reliable
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                color="inherit"
                onClick={() => setCurrentPage('landing')}
                sx={{ 
                  textTransform: 'none', 
                  color: 'white',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  '&:hover': {
                    background: 'rgba(139, 92, 246, 0.1)'
                  }
                }}
              >
                ← Home
              </Button>
              <Chip 
                icon={connected ? <CheckCircle /> : <Cancel />}
                label={connected ? 'Connected' : 'Disconnected'}
                sx={{ 
                  background: connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: connected ? '#22c55e' : '#ef4444',
                  border: `1px solid ${connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}
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

          {/* Popup Permission Warning Banner */}
          {!isHost && sessionId && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#3b82f6'
                }
              }}
            >
              <Typography variant="body2">
                <strong>📌 Important:</strong> Remote desktop will open in a new window. 
                Please <strong>allow popups</strong> for this site if prompted by your browser.
              </Typography>
            </Alert>
          )}

          {loading && (
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                background: 'rgba(20, 20, 20, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '16px'
              }}
            >
              <CircularProgress size={60} sx={{ mb: 2, color: '#8b5cf6' }} />
              <Typography variant="h5" gutterBottom sx={{ color: '#fff' }}>
                Connecting to SuperDesk Server...
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Server: {config.server}
              </Typography>
            </Paper>
          )}
          
          {connectionError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#ef4444'
                }
              }}
              action={
                <Button 
                  size="small" 
                  onClick={() => window.location.reload()}
                  startIcon={<PowerSettingsNew />}
                  sx={{
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    '&:hover': {
                      background: 'rgba(239, 68, 68, 0.1)'
                    }
                  }}
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
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#f59e0b'
                }
              }}
            >
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
                variant="outlined"
                onClick={() => window.location.reload()}
                startIcon={<PowerSettingsNew />}
                sx={{ 
                  mt: 2,
                  color: '#f59e0b',
                  borderColor: 'rgba(245, 158, 11, 0.5)',
                  '&:hover': {
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: '#f59e0b'
                  }
                }}
              >
                Retry Connection
              </Button>
            </Alert>
          )}

          {sessionId && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#22c55e'
                }
              }}
            >
              <Typography variant="h6" gutterBottom>
                Session Active
              </Typography>
              <Typography variant="body1">
                Session ID: <Chip 
                  label={sessionId} 
                  size="small" 
                  sx={{ 
                    mx: 1,
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#8b5cf6',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }} 
                />
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Share this ID with others to join your session
              </Typography>
            </Alert>
          )}

          {/* Render-style Session Cards */}
          <Box sx={{ maxWidth: '1000px', mx: 'auto', mt: 4 }}>
            {/* Host Session Card */}
            <Card sx={{
              background: 'rgba(15, 15, 15, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              mb: 3,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(139, 92, 246, 0.3)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={3}>
                  <Box flex={1} minWidth="280px">
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <ScreenShare sx={{ color: '#8b5cf6', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>
                        Share Your Desktop
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, mb: 2 }}>
                      Start hosting a session to share your screen with others. They'll be able to view and optionally control your desktop remotely.
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip 
                        size="small" 
                        label="Desktop Sharing" 
                        sx={{ 
                          background: 'rgba(139, 92, 246, 0.1)', 
                          color: '#8b5cf6',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          fontSize: '0.75rem'
                        }} 
                      />
                      <Chip 
                        size="small" 
                        label="Audio Support" 
                        sx={{ 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '0.75rem'
                        }} 
                      />
                      <Chip 
                        size="small" 
                        label="File Transfer" 
                        sx={{ 
                          background: 'rgba(34, 197, 94, 0.1)', 
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Button 
                      variant="contained"
                      startIcon={<DesktopWindows />}
                      onClick={startSession} 
                      disabled={!connected}
                      sx={{
                        px: 3,
                        py: 1.25,
                        borderRadius: '8px',
                        background: '#8b5cf6',
                        color: 'white',
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        boxShadow: 'none',
                        '&:hover': {
                          background: '#7c3aed',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                        },
                        '&:disabled': {
                          background: 'rgba(100, 100, 100, 0.2)',
                          color: 'rgba(255, 255, 255, 0.3)'
                        }
                      }}
                    >
                      Start Hosting
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Join Session Card */}
            <Card sx={{
              background: 'rgba(15, 15, 15, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(59, 130, 246, 0.3)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={3}>
                  <Box flex={1} minWidth="280px">
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <TouchApp sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>
                        Join Remote Desktop
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, mb: 3 }}>
                      Connect to someone else's desktop session by entering their session ID below.
                    </Typography>
                    <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap">
                      <TextField
                        label="Session ID"
                        variant="outlined"
                        value={joinSessionId}
                        onChange={(e) => setJoinSessionId(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleJoinClick();
                          }
                        }}
                        placeholder="e.g., abc-def-123"
                        disabled={!connected}
                        sx={{
                          flex: 1,
                          minWidth: '250px',
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            background: 'rgba(30, 30, 30, 0.6)',
                            borderRadius: '8px',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.1)'
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(59, 130, 246, 0.4)'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#3b82f6',
                              borderWidth: '2px'
                            }
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.9rem'
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#3b82f6'
                          }
                        }}
                      />
                      <Button 
                        variant="contained"
                        startIcon={<Person />}
                        onClick={handleJoinClick}
                        disabled={!connected || !joinSessionId.trim()}
                        sx={{
                          px: 3,
                          py: 1.5,
                          borderRadius: '8px',
                          background: '#3b82f6',
                          color: 'white',
                          textTransform: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          boxShadow: 'none',
                          '&:hover': {
                            background: '#2563eb',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                          },
                          '&:disabled': {
                            background: 'rgba(100, 100, 100, 0.2)',
                            color: 'rgba(255, 255, 255, 0.3)'
                          }
                        }}
                      >
                        Connect
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Session Management Controls - Simplified */}
          {sessionId && (
            <Paper sx={{ 
              mt: 3, 
              p: 2.5,
              background: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                  <Chip 
                    icon={<Computer />} 
                    label={`${sessionId.substring(0, 8)}...`} 
                    size="small"
                    sx={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#8b5cf6',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontFamily: 'monospace',
                      fontWeight: 600
                    }}
                  />
                  <Chip 
                    icon={<Person />} 
                    label={isHost ? 'Host' : 'Guest'} 
                    size="small"
                    sx={{
                      background: isHost ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: isHost ? '#22c55e' : '#3b82f6',
                      border: `1px solid ${isHost ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                    }}
                  />
                  {!isHost && remoteControlEnabled && (
                    <Chip 
                      icon={<TouchApp />} 
                      label="Control ON" 
                      size="small"
                      sx={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}
                    />
                  )}
                </Box>
                <Box display="flex" gap={1}>
                  {/* Force Relay Toggle (Guest) */}
                  {!isHost && (
                    <Button 
                      onClick={() => { setForceRelay(v => !v); }}
                      variant={forceRelay ? 'contained' : 'outlined'}
                      size="small"
                      title="Route media via TURN relay for restrictive networks"
                      sx={{
                        textTransform: 'none',
                        borderRadius: '8px',
                        ...(forceRelay ? {
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          '&:hover': {
                            background: 'rgba(245, 158, 11, 0.3)'
                          }
                        } : {
                          color: 'rgba(255, 255, 255, 0.7)',
                          borderColor: 'rgba(139, 92, 246, 0.3)',
                          '&:hover': {
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            background: 'rgba(139, 92, 246, 0.1)'
                          }
                        })
                      }}
                    >
                      {forceRelay ? 'Relay ON' : 'Relay OFF'}
                    </Button>
                  )}
                  {!isHost && (
                    <Button 
                      onClick={remoteControlEnabled ? disableRemoteControl : enableRemoteControl} 
                      variant="outlined"
                      startIcon={remoteControlEnabled ? <Cancel /> : <TouchApp />}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        borderRadius: '8px',
                        color: remoteControlEnabled ? '#ef4444' : 'white',
                        borderColor: remoteControlEnabled ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.5)',
                        background: remoteControlEnabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        '&:hover': {
                          borderColor: remoteControlEnabled ? '#ef4444' : '#8b5cf6',
                          background: remoteControlEnabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)'
                        }
                      }}
                    >
                      {remoteControlEnabled ? 'Disable' : 'Enable'} Control
                    </Button>
                  )}
                  <Button 
                    onClick={endSession} 
                    variant="outlined"
                    startIcon={<PowerSettingsNew />}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      borderRadius: '8px',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      '&:hover': {
                        borderColor: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.2)'
                      }
                    }}
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

              {remoteStream && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Inline Preview (muted)
                  </Typography>
                  <Box
                    component="video"
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    controls
                    sx={{
                      width: '100%',
                      maxWidth: 520,
                      borderRadius: 2,
                      border: '1px solid rgba(0,0,0,0.12)',
                      backgroundColor: 'black'
                    }}
                  />
                </Box>
              )}

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
            <Paper sx={{ 
              mt: 3, 
              p: 2.5,
              background: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CloudUpload sx={{ color: '#3b82f6' }} />
                  <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                    File Transfer
                  </Typography>
                  <Chip 
                    label={dataChannel && dataChannel.readyState === 'open' ? 'Ready' : 'Not Ready'} 
                    size="small"
                    sx={{
                      background: dataChannel && dataChannel.readyState === 'open' 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : 'rgba(100, 100, 100, 0.2)',
                      color: dataChannel && dataChannel.readyState === 'open' 
                        ? '#22c55e' 
                        : 'rgba(255, 255, 255, 0.5)',
                      border: `1px solid ${dataChannel && dataChannel.readyState === 'open' 
                        ? 'rgba(34, 197, 94, 0.3)' 
                        : 'rgba(100, 100, 100, 0.3)'}`
                    }}
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
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    color: (!dataChannel || dataChannel.readyState !== 'open') 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'white',
                    borderColor: (!dataChannel || dataChannel.readyState !== 'open') 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'rgba(59, 130, 246, 0.5)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.2)'
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.2)',
                      borderColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                >
                  Send File (Max 10MB)
                </Button>
              </Box>
              {fileTransfer.active && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Uploading: {Math.round(fileTransfer.progress)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={fileTransfer.progress}
                    sx={{
                      height: 8,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                        borderRadius: '4px'
                      }
                    }}
                  />
                </Box>
              )}
            </Paper>
          )}

          {/* Host Status - Simplified */}
          {isHost && sessionId && (
            <Paper sx={{ 
              mt: 3, 
              p: 2.5,
              background: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Computer sx={{ color: '#8b5cf6' }} />
                <Typography variant="body1" sx={{ color: 'white' }}>
                  Sharing desktop - Session: {' '}
                  <Chip 
                    label={sessionId.substring(0, 12) + '...'} 
                    size="small"
                    sx={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#8b5cf6',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontFamily: 'monospace',
                      fontWeight: 600
                    }}
                  />
                </Typography>
              </Box>
            </Paper>
          )}
        {/* Vercel build fix */}
        </Container>
      </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
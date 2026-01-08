// SuperDesk WebRTC Client for React Web App
import io from 'socket.io-client';

class SuperDeskClient {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.sessionId = null;
    this.isHost = false;
    this.remoteStream = null;
    this.localStream = null;
    this.remoteControlEnabled = false;
    this.serverUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://supderdesk-fgasbfdze6bwbbav.centralindia-01.azurewebsites.net';

    // Camera/mic state tracking
    this.remoteCameraTrackId = null;
    this.remoteMicTrackId = null;
    this.micStream = null;
    this.cameraStream = null;
    this.mainStream = null; // Track the main screen share stream

    this.callbacks = {
      onSessionCreated: null,
      onGuestJoined: null,
      onSessionJoined: null,
      onRemoteStream: null,
      onConnectionStateChange: null,
      onSessionEnded: null,
      onError: null,
      onHostInfo: null,
      onDataChannelOpen: null,
      // Camera/mic callbacks
      onRemoteCameraStream: null,
      onRemoteCameraOff: null,
      onRemoteMicStream: null,
      onRemoteMicOff: null
    };

    this.dataChannel = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'], // WebSocket first, polling fallback for Azure
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        upgrade: true, // Allow transport upgrades
        forceNew: false,
        path: '/socket.io/'
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to SuperDesk server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });

      this.setupSocketListeners();
    });
  }

  setupSocketListeners() {
    this.socket.on('session-created', (data) => {
      console.log('Session created:', data.sessionId);
      this.sessionId = data.sessionId;
      this.callbacks.onSessionCreated?.(data.sessionId);
    });

    this.socket.on('guest-joined', (data) => {
      console.log('🎉 Guest joined:', data.guestId);
      this.callbacks.onGuestJoined?.(data);
    });

    this.socket.on('session-joined', () => {
      console.log('✅ Successfully joined session');
      this.callbacks.onSessionJoined?.();
    });

    this.socket.on('session-error', (error) => {
      console.error('Session error:', error);
      this.callbacks.onError?.(error);
    });

    this.socket.on('offer', async (data) => {
      await this.handleOffer(data);
    });

    this.socket.on('answer', async (data) => {
      await this.handleAnswer(data);
    });

    this.socket.on('ice-candidate', async (data) => {
      if (data.candidate) {
        await this.handleIceCandidate(data);
      }
    });

    this.socket.on('session-ended', () => {
      console.log('Session ended');
      this.cleanup();
      this.callbacks.onSessionEnded?.();
    });

    // Listen for remote camera state from host
    this.socket.on('camera-state', (data) => {
      console.log('📹 WEBAPP: Received camera-state from host:', data);
      if (data.enabled && data.cameraTrackId) {
        this.remoteCameraTrackId = data.cameraTrackId;
        console.log('📹 WEBAPP: Expecting camera track with ID:', data.cameraTrackId);
      } else {
        this.remoteCameraTrackId = null;
        console.log('📹 WEBAPP: Remote camera turned OFF');
        this.callbacks.onRemoteCameraOff?.();
      }
    });

    // Listen for remote mic state from host
    this.socket.on('mic-state', (data) => {
      console.log('🎤 WEBAPP: Received mic-state from host:', data);
      if (data.enabled && data.micTrackId) {
        this.remoteMicTrackId = data.micTrackId;
        console.log('🎤 WEBAPP: Expecting mic track with ID:', data.micTrackId);
      } else {
        this.remoteMicTrackId = null;
        console.log('🎤 WEBAPP: Remote mic turned OFF');
        this.callbacks.onRemoteMicOff?.();
      }
    });
  }

  async createSession() {
    if (!this.socket || !this.socket.connected) {
      await this.initialize();
    }

    this.isHost = true;
    this.socket.emit('create-session', { type: 'web' });
    console.log('Creating session...');
  }

  async joinSession(sessionId) {
    // Normalize session ID to uppercase (server generates uppercase IDs)
    const normalizedSessionId = sessionId ? sessionId.toString().toUpperCase().trim() : '';

    if (!normalizedSessionId || normalizedSessionId.length !== 8) {
      throw new Error('Invalid session ID. Must be 8 characters.');
    }

    if (!this.socket || !this.socket.connected) {
      await this.initialize();
    }

    this.isHost = false;
    this.sessionId = normalizedSessionId;
    this.socket.emit('join-session', normalizedSessionId);

    // Setup peer connection for receiving
    await this.setupPeerConnection();
    console.log('Joining session:', normalizedSessionId);
  }

  async setupPeerConnection() {
    // Fetch ICE servers
    let iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    try {
      const response = await fetch(`${this.serverUrl}/api/webrtc-config`);
      const config = await response.json();
      if (config.iceServers) {
        iceServers = config.iceServers;
      }
    } catch (error) {
      console.warn('Using default ICE servers:', error);
    }

    this.peerConnection = new RTCPeerConnection({ iceServers });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          sessionId: this.sessionId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('📺 WEBAPP: ========== ONTRACK EVENT FIRED ==========');
      console.log('📺 WEBAPP: Track kind:', event.track.kind);
      console.log('📺 WEBAPP: Track id:', event.track.id);
      console.log('📺 WEBAPP: Track label:', event.track.label);
      console.log('📺 WEBAPP: Streams count:', event.streams.length);

      // Handle AUDIO tracks
      if (event.track.kind === 'audio') {
        console.log('🔊 WEBAPP: ===== AUDIO TRACK RECEIVED =====');

        // Check if this is microphone audio (vs system audio from screen capture)
        const isMicAudio = this.remoteMicTrackId === event.track.id;
        // Also check if this audio arrived via renegotiation (after video already exists)
        const arrivedViaRenegotiation = this.mainStream !== null && this.mainStream.getVideoTracks().length > 0;

        console.log('🔊 WEBAPP: Audio source:', isMicAudio ? 'MICROPHONE (ID match)' : arrivedViaRenegotiation ? 'MICROPHONE (renegotiation)' : 'SYSTEM AUDIO');

        if (isMicAudio || arrivedViaRenegotiation) {
          // MIC AUDIO - notify via callback so UI can play it separately
          if (!this.remoteMicTrackId) {
            this.remoteMicTrackId = event.track.id;
            console.log('🎤 WEBAPP: Set remoteMicTrackId from incoming track (race condition fix)');
          }

          const micStream = new MediaStream([event.track]);
          console.log('🎤 WEBAPP: Remote mic audio stream created');
          this.callbacks.onRemoteMicStream?.(micStream);

          // Handle track ended
          event.track.onended = () => {
            console.log('🎤 WEBAPP: Remote mic track ENDED');
            this.remoteMicTrackId = null;
            this.callbacks.onRemoteMicOff?.();
          };

          return; // Mic track handled separately
        }

        // SYSTEM AUDIO - add to mainStream so it plays through video element
        console.log('🔊 WEBAPP: System audio from remote peer');
        if (this.mainStream) {
          console.log('🔊 WEBAPP: Adding system audio track to existing stream');
          this.mainStream.addTrack(event.track);
          // Re-notify with updated stream
          this.callbacks.onRemoteStream?.(this.mainStream);
        }
        return;
      }

      // Handle VIDEO tracks
      if (event.track.kind === 'video') {
        // Check if this is a CAMERA track (different from screen share)
        const isKnownCameraTrack = this.remoteCameraTrackId === event.track.id;
        const hasExistingVideo = this.mainStream && this.mainStream.getVideoTracks().length > 0;
        const isLabeledAsCamera = event.track.label && (
          event.track.label.toLowerCase().includes('camera') ||
          event.track.label.toLowerCase().includes('webcam') ||
          event.track.label.toLowerCase().includes('facetime')
        );

        console.log('📹 WEBAPP: Camera detection check:', {
          trackId: event.track.id,
          remoteCameraTrackId: this.remoteCameraTrackId,
          isKnownCameraTrack,
          hasExistingVideo,
          isLabeledAsCamera,
          trackLabel: event.track.label
        });

        const isCameraTrack = isKnownCameraTrack || hasExistingVideo || isLabeledAsCamera;

        if (isCameraTrack) {
          console.log('📹 WEBAPP: ===== CAMERA TRACK RECEIVED =====');

          // Handle race condition where track arrives before camera-state signal
          if (!this.remoteCameraTrackId) {
            this.remoteCameraTrackId = event.track.id;
            console.log('📹 WEBAPP: Set remoteCameraTrackId from incoming track (race condition fix)');
          }

          // Get or create camera stream
          const cameraStream = event.streams.length > 0 ? event.streams[0] : new MediaStream([event.track]);
          console.log('📹 WEBAPP: Camera stream ready');

          // Notify via callback
          this.callbacks.onRemoteCameraStream?.(cameraStream);

          // Handle track ended
          event.track.onended = () => {
            console.log('📹 WEBAPP: Remote camera track ENDED');
            this.remoteCameraTrackId = null;
            this.callbacks.onRemoteCameraOff?.();
          };

          return; // Camera track handled separately
        }

        // SCREEN SHARE video - this is the main stream
        console.log('📺 WEBAPP: ===== SCREEN SHARE VIDEO RECEIVED =====');
      }

      // Get or create the stream for screen share
      let stream;
      if (event.streams.length > 0) {
        stream = event.streams[0];
        console.log('📺 WEBAPP: Using stream from event.streams[0]');
      } else {
        stream = new MediaStream([event.track]);
        console.log('📺 WEBAPP: Created new MediaStream from track');
      }

      // Store as main stream for adding audio tracks later
      this.mainStream = stream;
      this.remoteStream = stream;

      console.log('📺 WEBAPP: Main stream set, notifying UI');
      this.callbacks.onRemoteStream?.(stream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('Connection state:', state);
      this.callbacks.onConnectionStateChange?.(state);
    };

    // Handle data channel for receiving handshake and input
    this.peerConnection.ondatachannel = (event) => {
      console.log('📱 Data channel received:', event.channel.label);
      if (event.channel.label === 'input') {
        this.dataChannel = event.channel;
        this.dataChannel.onopen = () => {
          console.log('📱 Data channel opened');
          this.callbacks.onDataChannelOpen?.();
        };
        this.dataChannel.onmessage = (msgEvent) => {
          try {
            const msg = JSON.parse(msgEvent.data);
            if (msg.type === 'system' && msg.action === 'handshake') {
              console.log('📱 Received host info:', msg.data);
              this.callbacks.onHostInfo?.(msg.data);
            }
          } catch (e) {
            console.warn('Failed to parse data channel message:', e);
          }
        };
        this.dataChannel.onclose = () => {
          console.log('📱 Data channel closed');
        };
      }
    };
  }

  async handleOffer(data) {
    if (!this.peerConnection) {
      await this.setupPeerConnection();
    }

    console.log('📨 WEBAPP: Received offer, signaling state:', this.peerConnection.signalingState);

    // Handle glare condition - rollback if we have a local offer pending
    if (this.peerConnection.signalingState === 'have-local-offer') {
      console.log('⚠️ WEBAPP: Glare detected, rolling back local offer');
      try {
        await this.peerConnection.setLocalDescription({ type: 'rollback' });
      } catch (e) {
        console.warn('⚠️ WEBAPP: Rollback failed:', e.message);
      }
    }

    // Accept offer if we're in stable state
    if (this.peerConnection.signalingState === 'stable' || this.peerConnection.signalingState === 'have-remote-offer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        sessionId: this.sessionId,
        targetId: data.from,
        answer
      });
      console.log('📤 WEBAPP: Answer sent');
    } else {
      console.warn('⚠️ WEBAPP: Ignoring offer - wrong state:', this.peerConnection.signalingState);
    }
  }

  async handleAnswer(data) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  }

  async handleIceCandidate(data) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  enableRemoteControl() {
    this.remoteControlEnabled = true;
    this.socket.emit('enable-remote-control', { sessionId: this.sessionId });
  }

  disableRemoteControl() {
    this.remoteControlEnabled = false;
    this.socket.emit('disable-remote-control', { sessionId: this.sessionId });
  }

  sendMouseEvent(type, x, y, button = 0) {
    if (!this.remoteControlEnabled) return;

    this.socket.emit('mouse-event', {
      sessionId: this.sessionId,
      type,
      x,
      y,
      button
    });
  }

  sendKeyboardEvent(type, key, code, modifiers = {}) {
    if (!this.remoteControlEnabled) return;

    this.socket.emit('keyboard-event', {
      sessionId: this.sessionId,
      type,
      key,
      code,
      modifiers
    });
  }

  endSession() {
    if (this.socket) {
      this.socket.emit('end-session', this.sessionId);
    }
    this.cleanup();
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.mainStream = null;
    this.remoteCameraTrackId = null;
    this.remoteMicTrackId = null;
    this.remoteControlEnabled = false;
  }

  on(event, callback) {
    const callbackName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(callbackName)) {
      this.callbacks[callbackName] = callback;
    }
  }
}

export default SuperDeskClient;

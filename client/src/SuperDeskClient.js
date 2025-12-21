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
      : 'https://superdesk-7m7f.onrender.com';

    this.callbacks = {
      onSessionCreated: null,
      onGuestJoined: null,
      onSessionJoined: null,
      onRemoteStream: null,
      onConnectionStateChange: null,
      onSessionEnded: null,
      onError: null,
      onHostInfo: null,
      onDataChannelOpen: null
    };

    this.dataChannel = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
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
    if (!sessionId || sessionId.length !== 8) {
      throw new Error('Invalid session ID. Must be 8 characters.');
    }

    if (!this.socket || !this.socket.connected) {
      await this.initialize();
    }

    this.isHost = false;
    this.sessionId = sessionId;
    this.socket.emit('join-session', sessionId);

    // Setup peer connection for receiving
    await this.setupPeerConnection();
    console.log('Joining session:', sessionId);
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
      console.log('📺 Received remote stream');
      this.remoteStream = event.streams[0];
      this.callbacks.onRemoteStream?.(event.streams[0]);
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

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('answer', {
      sessionId: this.sessionId,
      targetId: data.from,
      answer
    });
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

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
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

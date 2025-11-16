/**
 * Socket Manager Module
 * Handles all Socket.io communication with the signaling server
 */

class SocketManager {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.sessionId = null;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onSessionCreated: null,
      onOffer: null,
      onAnswer: null,
      onIceCandidate: null,
      onRemoteDisconnect: null
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          console.log('[Socket] Connected to signaling server');
          if (this.callbacks.onConnect) this.callbacks.onConnect();
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('[Socket] Disconnected from signaling server');
          if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Socket] Connection error:', error);
          reject(error);
        });

        this.socket.on('session-created', (data) => {
          this.sessionId = data.sessionId;
          console.log('[Socket] Session created:', this.sessionId);
          if (this.callbacks.onSessionCreated) this.callbacks.onSessionCreated(this.sessionId);
        });

        this.socket.on('offer', (data) => {
          console.log('[Socket] Received offer');
          if (this.callbacks.onOffer) this.callbacks.onOffer(data);
        });

        this.socket.on('answer', (data) => {
          console.log('[Socket] Received answer');
          if (this.callbacks.onAnswer) this.callbacks.onAnswer(data);
        });

        this.socket.on('ice-candidate', (data) => {
          console.log('[Socket] Received ICE candidate');
          if (this.callbacks.onIceCandidate) this.callbacks.onIceCandidate(data);
        });

        this.socket.on('remote-disconnect', () => {
          console.log('[Socket] Remote peer disconnected');
          if (this.callbacks.onRemoteDisconnect) this.callbacks.onRemoteDisconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  createSession(type = 'agent') {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('create-session', { type });
  }

  sendOffer(sessionId, offer) {
    if (!this.socket) return;
    this.socket.emit('offer', { sessionId, offer });
  }

  sendAnswer(sessionId, answer) {
    if (!this.socket) return;
    this.socket.emit('answer', { sessionId, answer });
  }

  sendIceCandidate(sessionId, candidate) {
    if (!this.socket) return;
    this.socket.emit('ice-candidate', { sessionId, candidate });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
      this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SocketManager;
}

/**
 * WebRTC Manager Module
 * Handles peer connections, screen sharing, and remote control
 */

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.iceServers = [];
    this.callbacks = {
      onIceCandidate: null,
      onConnectionStateChange: null,
      onTrack: null
    };
  }

  async loadIceServers() {
    try {
      const response = await fetch('https://supderdesk.azurewebsites.net/api/webrtc-config');
      const data = await response.json();
      this.iceServers = data.iceServers || [];
      console.log('[WebRTC] Loaded ICE servers:', this.iceServers.length);
    } catch (error) {
      console.warn('[WebRTC] Failed to load ICE servers, using defaults:', error);
      this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }

  createPeerConnection() {
    if (this.peerConnection) {
      this.closePeerConnection();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers.length > 0 ? this.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        this.callbacks.onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('[WebRTC] Connection state:', state);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(state);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track');
      if (this.callbacks.onTrack) {
        this.callbacks.onTrack(event.streams[0]);
      }
    };

    return this.peerConnection;
  }

  async startScreenShare(shareType = 'screen') {
    try {
      // Get available sources based on share type
      const sourceTypes = shareType === 'window' ? ['window'] : ['screen'];

      const sources = await window.electron.desktopCapturer.getSources({
        types: sourceTypes,
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      // For screen type, use primary screen (usually index 0)
      // For window type, let user select or use first window
      let selectedSource = sources[0];

      // If multiple sources and window type, could show selection UI here
      // For now, using first available source

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 60
          }
        }
      });

      this.localStream = stream;

      // Add tracks to peer connection
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, stream);
        });
      }

      console.log(`[WebRTC] Screen sharing started (type: ${shareType})`);
      return stream;

    } catch (error) {
      console.error('[WebRTC] Screen share error:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('[WebRTC] Screen sharing stopped');
    }
  }

  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer) {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      console.warn('[WebRTC] Cannot add ICE candidate: no peer connection');
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.stopScreenShare();
  }

  on(event, callback) {
    const eventName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
    if (this.callbacks.hasOwnProperty(eventName)) {
      this.callbacks[eventName] = callback;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebRTCManager;
}

// SuperDesk Shared Utilities and Constants

// File transfer constants
const FILE_TRANSFER = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  CHUNK_SIZE: 16 * 1024, // 16KB chunks
  SUPPORTED_TYPES: [
    'image/*',
    'text/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
};

// WebRTC configuration
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Socket events
const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Session management
  CREATE_SESSION: 'create-session',
  JOIN_SESSION: 'join-session',
  SESSION_CREATED: 'session-created',
  SESSION_JOINED: 'session-joined',
  SESSION_ERROR: 'session-error',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  HOST_DISCONNECTED: 'host-disconnected',
  
  // WebRTC signaling
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  
  // Screen sharing
  START_SCREEN_SHARE: 'start-screen-share',
  STOP_SCREEN_SHARE: 'stop-screen-share',
  SCREEN_SHARE_STARTED: 'screen-share-started',
  SCREEN_SHARE_STOPPED: 'screen-share-stopped',
  SCREEN_FRAME: 'screen-frame',
  
  // Remote control
  MOUSE_EVENT: 'mouse-event',
  KEYBOARD_EVENT: 'keyboard-event',
  
  // Audio
  AUDIO_STATE: 'audio-state',
  
  // File transfer
  FILE_TRANSFER_START: 'file-transfer-start',
  FILE_CHUNK: 'file-chunk',
  FILE_TRANSFER_COMPLETE: 'file-transfer-complete'
};

// Data channel types
const DATA_CHANNEL_TYPES = {
  FILE_CHUNK: 'file-chunk',
  MOUSE_EVENT: 'mouse-event',
  KEYBOARD_EVENT: 'keyboard-event',
  CONTROL_COMMAND: 'control-command',
  CHAT_MESSAGE: 'chat-message'
};

// Utility functions
const utils = {
  // Generate unique session ID
  generateSessionId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  },

  // Validate file for transfer
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    if (file.size > FILE_TRANSFER.MAX_SIZE) {
      return { 
        valid: false, 
        error: `File size exceeds ${FILE_TRANSFER.MAX_SIZE / (1024 * 1024)}MB limit` 
      };
    }
    
    return { valid: true };
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Calculate transfer progress
  calculateProgress(transferred, total) {
    return Math.min((transferred / total) * 100, 100);
  },

  // Create data channel message
  createDataChannelMessage(type, data) {
    return JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });
  },

  // Parse data channel message
  parseDataChannelMessage(message) {
    try {
      return JSON.parse(message);
    } catch (error) {
      console.error('Error parsing data channel message:', error);
      return null;
    }
  },

  // Debounce function for frequent events
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for high-frequency events
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Screen capture settings
const SCREEN_CAPTURE = {
  DEFAULT_FPS: 10,
  MAX_FPS: 30,
  DEFAULT_QUALITY: 0.8,
  COMPRESSION_FORMAT: 'image/jpeg'
};

// Audio settings
const AUDIO_CONFIG = {
  SAMPLE_RATE: 44100,
  CHANNELS: 2,
  BIT_DEPTH: 16,
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true
};

// Error codes
const ERROR_CODES = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_FULL: 'SESSION_FULL',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  SCREEN_CAPTURE_FAILED: 'SCREEN_CAPTURE_FAILED',
  AUDIO_INIT_FAILED: 'AUDIO_INIT_FAILED',
  WEBRTC_FAILED: 'WEBRTC_FAILED'
};

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FILE_TRANSFER,
    WEBRTC_CONFIG,
    SOCKET_EVENTS,
    DATA_CHANNEL_TYPES,
    SCREEN_CAPTURE,
    AUDIO_CONFIG,
    ERROR_CODES,
    utils
  };
} else if (typeof window !== 'undefined') {
  window.SuperDeskShared = {
    FILE_TRANSFER,
    WEBRTC_CONFIG,
    SOCKET_EVENTS,
    DATA_CHANNEL_TYPES,
    SCREEN_CAPTURE,
    AUDIO_CONFIG,
    ERROR_CODES,
    utils
  };
}
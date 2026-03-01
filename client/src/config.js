// Dynamic ICE server retrieval for improved cross-network reliability
export async function fetchIceServers() {
  const base = process.env.REACT_APP_SERVER_URL || 'https://superdesk-7m7f.onrender.com';
  try {
    const resp = await fetch(base + '/api/webrtc-config');
    if (!resp.ok) throw new Error('Non-OK response ' + resp.status);
    const data = await resp.json();
    if (Array.isArray(data.iceServers) && data.iceServers.length) {
      console.log('Fetched ICE servers from backend:', data.iceServers);
      return data.iceServers;
    }
  } catch (e) {
    console.warn('Failed to fetch ICE servers, falling back:', e.message);
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ];
}

// Environment configuration for different deployment scenarios
const config = {
  development: {
    server: process.env.REACT_APP_SERVER_URL || 'https://superdesk-7m7f.onrender.com',
    client: 'http://localhost:3000',
  },
  production: {
    server: process.env.REACT_APP_SERVER_URL || 'https://superdesk-7m7f.onrender.com',
    client: process.env.REACT_APP_CLIENT_URL || window.location.origin,
  }
};

const ENV = process.env.NODE_ENV || 'development';

// Log configuration for debugging
console.log('SuperDesk Config:', {
  environment: ENV,
  server: config[ENV].server,
  client: config[ENV].client,
  envVars: {
    REACT_APP_SERVER_URL: process.env.REACT_APP_SERVER_URL,
    NODE_ENV: process.env.NODE_ENV
  }
});

export default config[ENV];
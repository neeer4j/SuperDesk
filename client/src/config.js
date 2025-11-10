// Environment configuration for different deployment scenarios
const config = {
  development: {
    // Use local signaling server for development
    server: process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
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
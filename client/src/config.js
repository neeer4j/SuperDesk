// Environment configuration for different deployment scenarios
const config = {
  development: {
    server: 'http://localhost:3001',
    client: 'http://localhost:3000',
  },
  production: {
    server: process.env.REACT_APP_SERVER_URL || 'https://superdesk-server-production.up.railway.app',
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
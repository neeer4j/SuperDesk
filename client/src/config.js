// Environment configuration for different deployment scenarios
const config = {
  development: {
    server: 'http://localhost:3001',
    client: 'http://localhost:3000',
  },
  production: {
    server: process.env.REACT_APP_SERVER_URL || 'https://your-server.railway.app',
    client: process.env.REACT_APP_CLIENT_URL || 'https://your-app.vercel.app',
  }
};

const ENV = process.env.NODE_ENV || 'development';

export default config[ENV];
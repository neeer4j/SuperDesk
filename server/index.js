const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load local .env in development if present (safe - won't crash if dotenv isn't installed)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed or .env not present - that's fine for production where env vars are set externally
}

// Optional TURN provider integration (e.g., Cloudflare). If you add `server/turn-provider.js`
// that module should export async function getTurnServers(ttlSeconds) returning an array of
// { urls, username, credential } objects or null.
let turnProvider = null;
const turnDiagnostics = {
  providerLoaded: false,
  lastProviderAttempt: null,
  lastProviderSuccess: null,
  lastProviderError: null,
  lastResponseSource: 'unknown',
};

try {
  turnProvider = require('./turn-provider');
  turnDiagnostics.providerLoaded = true;
  console.log('[TURN] turn-provider module loaded');
} catch (e) {
  console.log('[TURN] turn-provider module not found, using env/fallback');
}
function getFetchImplementation() {
  if (typeof global.fetch === 'function') {
    return global.fetch;
  }
  try {
    return require('node-fetch');
  } catch (err) {
    console.warn('[TURN helper] node-fetch not installed and global fetch is unavailable');
    return null;
  }
}

const cloudflareFetch = getFetchImplementation();

async function fetchCloudflareTurnServers(ttlSeconds = 3600) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY;

  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN missing');
  }

  if (!cloudflareFetch) {
    throw new Error('Fetch implementation unavailable; install node-fetch or use Node 18+');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/turn-credentials`;

  const resp = await cloudflareFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ttl: ttlSeconds })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudflare TURN request failed: ${resp.status} ${resp.statusText} - ${text}`);
  }

  const data = await resp.json();
  const result = data.result || data;
  const urls = result.urls || result.turn_urls || result.ice_servers || [];
  const username = result.username || result.user || result.auth?.username;
  const credential = result.password || result.credential || result.auth?.password;

  if (!Array.isArray(urls) || !urls.length || !username || !credential) {
    throw new Error(`Incomplete Cloudflare TURN response: ${JSON.stringify({ urls, username, credential })}`);
  }

  return urls.map(u => ({ urls: u, username, credential }));
}

const app = express();
const server = http.createServer(app);

// Configure allowed origins for different environments
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://super-desk-client.vercel.app",
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
];

// In production, be more permissive to allow cross-device connections
const corsOptions = process.env.NODE_ENV === 'production' ? {
  origin: true, // Allow all origins in production for cross-device access
  credentials: true,
  optionsSuccessStatus: 200
} : {
  origin: allowedOrigins.filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

// Configure CORS - more permissive to avoid ad blocker issues
app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : allowedOrigins.filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: false
});

app.use(express.json());
app.use(express.static('public'));

// File upload configuration with 10MB limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Store active sessions
const sessions = new Map();

// WebRTC signaling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-session', () => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      id: sessionId,
      host: socket.id,
      clients: [],
      created: new Date()
    });
    
    socket.join(sessionId);
    socket.emit('session-created', sessionId);
    console.log(`Session created: ${sessionId}`);
  });

  socket.on('join-session', (sessionId) => {
    console.log(`Attempting to join session: ${sessionId} from socket: ${socket.id}`);
    const session = sessions.get(sessionId);
    
    if (session) {
      session.clients.push(socket.id);
      socket.join(sessionId);
      
      // Notify host about new joiner so they can send offer
      socket.to(session.host).emit('guest-joined', { 
        guestId: socket.id,
        sessionId 
      });
      
      socket.emit('session-joined', sessionId);
      
      console.log(`✅ Client ${socket.id} successfully joined session ${sessionId}`);
      console.log(`Session now has: Host: ${session.host}, Clients: [${session.clients.join(', ')}]`);
    } else {
      console.log(`❌ Session ${sessionId} not found. Available sessions:`, Array.from(sessions.keys()));
      socket.emit('session-error', 'Session not found');
    }
  });

  // WebRTC signaling messages
  socket.on('offer', (payload) => {
    const { sessionId, targetId, offer } = payload;
    const message = { offer, from: socket.id, sessionId };

    if (targetId) {
      socket.to(targetId).emit('offer', message);
    } else if (sessionId) {
      socket.to(sessionId).emit('offer', message);
    } else {
      socket.broadcast.emit('offer', message);
    }
  });

  socket.on('answer', (payload) => {
    const { sessionId, targetId, answer } = payload;
    const message = { answer, from: socket.id, sessionId };

    if (targetId) {
      socket.to(targetId).emit('answer', message);
    } else if (sessionId) {
      socket.to(sessionId).emit('answer', message);
    } else {
      socket.broadcast.emit('answer', message);
    }
  });

  socket.on('ice-candidate', (payload) => {
    const { sessionId, targetId, candidate } = payload;
    const message = { candidate, from: socket.id, sessionId };

    if (targetId) {
      socket.to(targetId).emit('ice-candidate', message);
    } else if (sessionId) {
      socket.to(sessionId).emit('ice-candidate', message);
    } else {
      socket.broadcast.emit('ice-candidate', message);
    }
  });

  // Optional renegotiation forwarding (helps recover stuck playback)
  socket.on('renegotiate', (payload) => {
    const { sessionId, targetId } = payload || {};
    const message = { type: 'renegotiate', from: socket.id, sessionId };
    if (targetId) {
      socket.to(targetId).emit('renegotiate', message);
    } else if (sessionId) {
      socket.to(sessionId).emit('renegotiate', message);
    }
  });

  // Screen sharing events
  socket.on('start-screen-share', (sessionId) => {
    socket.to(sessionId).emit('screen-share-started');
  });

  socket.on('stop-screen-share', (sessionId) => {
    socket.to(sessionId).emit('screen-share-stopped');
  });

  // Remote control events
  socket.on('mouse-event', (data) => {
    console.log('Mouse event:', data);
    socket.to(data.sessionId).emit('mouse-event', data);
  });

  socket.on('keyboard-event', (data) => {
    console.log('Keyboard event:', data);
    socket.to(data.sessionId).emit('keyboard-event', data);
  });

  socket.on('enable-remote-control', (data) => {
    console.log('Remote control enabled for session:', data.sessionId);
    socket.to(data.sessionId).emit('remote-control-enabled');
  });

  socket.on('disable-remote-control', (data) => {
    console.log('Remote control disabled for session:', data.sessionId);
    socket.to(data.sessionId).emit('remote-control-disabled');
  });

  // Screen sharing events
  socket.on('request-screen-share', (data) => {
    console.log('Screen share requested:', data);
    const { sessionId, requesterId } = data;
    // Notify the host about the request
    socket.to(sessionId).emit('screen-share-requested', { requesterId });
  });

  socket.on('approve-screen-request', (data) => {
    console.log('Screen share approved:', data);
    const { sessionId, requesterId } = data;
    // Notify the requester that it's approved
    socket.to(requesterId).emit('screen-share-approved');
  });

  socket.on('deny-screen-request', (data) => {
    console.log('Screen share denied:', data);
    const { sessionId, requesterId } = data;
    // Notify the requester that it's denied
    socket.to(requesterId).emit('screen-share-denied');
  });

  socket.on('screen-share-started', (sessionId) => {
    console.log('Screen sharing started for session:', sessionId);
    socket.to(sessionId).emit('screen-share-started');
  });

  socket.on('screen-share-stopped', (sessionId) => {
    console.log('Screen sharing stopped for session:', sessionId);
    socket.to(sessionId).emit('screen-share-stopped');
  });

  socket.on('end-session', (sessionId) => {
    console.log('Ending session:', sessionId);
    const session = sessions.get(sessionId);
    if (session) {
      // Notify all participants
      socket.to(sessionId).emit('session-ended');
      // Remove session
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} ended and removed`);
    }
  });

  // Audio events
  socket.on('audio-state', (data) => {
    socket.broadcast.emit('audio-state', data);
  });

  // File transfer events
  socket.on('file-transfer-start', (data) => {
    socket.broadcast.emit('file-transfer-start', data);
  });

  socket.on('file-chunk', (data) => {
    socket.broadcast.emit('file-chunk', data);
  });

  socket.on('file-transfer-complete', (data) => {
    socket.broadcast.emit('file-transfer-complete', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up sessions
    for (const [sessionId, session] of sessions.entries()) {
      if (session.host === socket.id) {
        // Host disconnected, notify clients and remove session
        socket.to(sessionId).emit('host-disconnected');
        sessions.delete(sessionId);
        console.log(`Session ${sessionId} closed - host disconnected`);
      } else {
        // Remove client from session
        const clientIndex = session.clients.indexOf(socket.id);
        if (clientIndex > -1) {
          session.clients.splice(clientIndex, 1);
          socket.to(sessionId).emit('user-left', socket.id);
        }
      }
    }
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size exceeds 10MB limit' });
  }

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// File download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size
  });
});

// API info endpoint for deployment checking
app.get('/api/info', (req, res) => {
  res.json({
    name: 'SuperDesk Server',
    version: '1.0.0',
    status: 'running',
    features: {
      webrtc: true,
      fileTransfer: true,
      maxFileSize: '10MB',
      socketIO: true
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

// WebRTC ICE servers configuration endpoint
// Configure via env:
//   TURN_URLS: comma-separated list of TURN urls, e.g. "turn:turn1.example.com:3478,turns:turn1.example.com:5349"
//   TURN_USERNAME, TURN_CREDENTIAL: credentials for the TURN server(s)
app.get('/api/webrtc-config', (req, res) => {
  const defaultStun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const requestLabel = `[TURN cfg ${new Date().toISOString()}]`;

  (async () => {
    try {
      turnDiagnostics.lastProviderAttempt = new Date().toISOString();
      let providerServers = null;
      let providerError = null;

      if (turnProvider && typeof turnProvider.getTurnServers === 'function') {
        console.log(`${requestLabel} requesting credentials from TURN provider module`);
        try {
          const provided = await turnProvider.getTurnServers();
          if (provided && provided.length) {
            providerServers = provided;
          } else {
            providerError = new Error('Provider module returned no servers');
            console.warn(`${requestLabel} provider module returned no servers`);
          }
        } catch (err) {
          providerError = err;
          console.error(`${requestLabel} TURN provider module error:`, err);
        }
      } else {
        console.log(`${requestLabel} turn-provider module unavailable or lacking getTurnServers()`);
      }

      if (!providerServers) {
        try {
          console.log(`${requestLabel} attempting inline Cloudflare TURN fetch`);
          const inlineServers = await fetchCloudflareTurnServers();
          if (inlineServers && inlineServers.length) {
            providerServers = inlineServers;
            providerError = null;
          }
        } catch (err) {
          providerError = err;
          console.error(`${requestLabel} inline Cloudflare TURN error:`, err);
        }
      }

      if (providerServers && providerServers.length) {
        const iceServers = [...defaultStun, ...providerServers];
        turnDiagnostics.lastProviderSuccess = {
          at: new Date().toISOString(),
          count: providerServers.length,
        };
        turnDiagnostics.lastResponseSource = 'provider';
        turnDiagnostics.lastProviderError = providerError ? {
          at: new Date().toISOString(),
          message: providerError.message,
        } : null;
        console.log(`${requestLabel} provider returned ${providerServers.length} servers`);
        res.json({ iceServers });
        return;
      }

      if (providerError) {
        turnDiagnostics.lastProviderError = {
          at: new Date().toISOString(),
          message: providerError.message,
        };
        console.warn(`${requestLabel} provider attempt failed:`, providerError.message);
      }

      // Static env-based TURN configuration (legacy / simple setup)
      const turnUrls = (process.env.TURN_URLS || '')
        .split(',')
        .map(u => u.trim())
        .filter(Boolean);

      let iceServers = [...defaultStun];

      if (turnUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers = [
          ...iceServers,
          ...turnUrls.map(url => ({
            urls: url,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL,
          }))
        ];
        turnDiagnostics.lastResponseSource = 'static-env';
        console.log(`${requestLabel} using static TURN env configuration (${turnUrls.length} urls)`);
      } else {
        // Fallback to public TURN (limited reliability)
        iceServers = [
          ...iceServers,
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ];
        turnDiagnostics.lastResponseSource = 'public-fallback';
        console.warn(`${requestLabel} falling back to public OpenRelay TURN`);
      }

      res.json({ iceServers });
    } catch (err) {
      console.error('Error in /api/webrtc-config handler:', err);
      // Best-effort fallback
      turnDiagnostics.lastResponseSource = 'error';
      res.json({ iceServers: defaultStun });
    }
  })();
});

app.get('/api/webrtc-diagnostics', (req, res) => {
  res.json({
    providerLoaded: turnDiagnostics.providerLoaded,
    lastProviderAttempt: turnDiagnostics.lastProviderAttempt,
    lastProviderSuccess: turnDiagnostics.lastProviderSuccess,
    lastProviderError: turnDiagnostics.lastProviderError,
    lastResponseSource: turnDiagnostics.lastResponseSource,
    env: {
      CLOUDFLARE_ACCOUNT_ID: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID),
      CLOUDFLARE_API_TOKEN: Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY),
      TURN_URLS: Boolean((process.env.TURN_URLS || '').trim()),
      TURN_USERNAME: Boolean(process.env.TURN_USERNAME),
      TURN_CREDENTIAL: Boolean(process.env.TURN_CREDENTIAL),
    }
  });
});

// Socket.io test endpoint to check if socket.io is accessible
app.get('/socket-test', (req, res) => {
  res.json({
    status: 'Socket.io server is running',
    endpoint: '/socket.io/',
    transports: ['websocket', 'polling'],
    timestamp: new Date().toISOString()
  });
});

// Get active sessions (for debugging)
app.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    clientCount: session.clients.length,
    created: session.created
  }));
  
  res.json({ sessions: sessionList });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`SuperDesk server running on port ${PORT}`);
  console.log(`WebRTC signaling server ready`);
  console.log(`File transfer endpoint: http://localhost:${PORT}/upload`);
});
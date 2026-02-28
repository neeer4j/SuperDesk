// SuperDesk Signaling Server - Deployed to Azure App Service
// Trigger: SCM_DO_BUILD_DURING_DEPLOYMENT=true
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { useAzureSocketIO } = require('@azure/web-pubsub-socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
// Shared constants
// Shared constants - handle both local and Azure paths
let shared;
try {
  shared = require('../shared');
} catch (e) {
  try {
    shared = require('./shared');
  } catch (err) {
    console.error('CRITICAL: Could not find shared constants folder');
    shared = { FILE_TRANSFER: { MAX_SIZE: 20 * 1024 * 1024 * 1024 }, utils: { formatFileSize: (s) => s } };
  }
}
const { FILE_TRANSFER, utils } = shared;

// Load local .env in development if present (safe - won't crash if dotenv isn't installed)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed or .env not present - that's fine for production where env vars are set externally
}

/*
  Environment variables (placeholders):

  # Static TURN config (optional):
  TURN_URLS=turn:turn1.example.com:3478,turn:turn2.example.com:3478
  TURN_USERNAME=static_turn_username
  TURN_CREDENTIAL=static_turn_password

  # Cloudflare TURN (recommended):
  # Option A (TURN Key API):
  CLOUDFLARE_TURN_KEY_ID=your_turn_key_id_here
  CLOUDFLARE_TURN_KEY_API_TOKEN=your_turn_key_api_token_here

  # Option B (legacy account-level Realtime):
  CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
  CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

  # Alternative / aliases recognized by server:
  TURN_KEY_ID, TURN_KEY_API_TOKEN, PROVIDER_API_KEY

  Copy `server/.env.example` -> `server/.env` and fill these values for local testing.
*/

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
  // Adding environment variables for Cloudflare diagnostics
  turnDiagnostics.env = {};

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
  if (!cloudflareFetch) {
    throw new Error('Fetch implementation unavailable; install node-fetch or use Node 18+');
  }

  const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID || process.env.TURN_KEY_ID;
  const turnKeyToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN || process.env.CLOUDFLARE_TURN_KEY_TOKEN || process.env.TURN_KEY_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY;

  const hasTurnKey = Boolean(turnKeyId && turnKeyToken);
  const hasLegacyRealtime = Boolean(accountId && apiToken);

  if (!hasTurnKey && !hasLegacyRealtime) {
    throw new Error('Cloudflare TURN env vars missing (set TURN key or account-level credentials)');
  }

  const url = hasTurnKey
    ? `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate`
    : `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/turn-credentials`;

  const resp = await cloudflareFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hasTurnKey ? turnKeyToken : apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ttl: ttlSeconds })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudflare TURN request failed: ${resp.status} ${resp.statusText} - ${text}`);
  }

  const data = await resp.json();

  // Handle different response structures:
  // 1. TURN key API: { "iceServers": { "urls": [...], "username": "...", "credential": "..." } }
  // 2. Legacy Realtime: { "result": { "credentials": { ... } } }
  const result = data.result || data;
  const payload = result.credentials || result.iceServers || result;

  const urls = payload.uris || payload.urls || payload.turn_urls || payload.ice_servers || [];
  const username = payload.username || payload.user || payload.auth?.username;
  const credential = payload.password || payload.credential || payload.auth?.password;

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
  "https://superdesk.co.in",
  "https://www.superdesk.co.in",
  "https://super-desk-client.vercel.app",
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
];

// Custom origin validator for CORS - handles Electron apps and various deployment scenarios
const corsOriginValidator = (origin, callback) => {
  // Allow requests with no origin (Electron apps, mobile apps, curl, Postman, same-origin)
  if (!origin || origin === 'null' || origin === 'file://') {
    return callback(null, true);
  }
  // Allow all origins in production for cross-device access
  if (process.env.NODE_ENV === 'production') {
    return callback(null, true);
  }
  // In development, check against allowed origins
  if (allowedOrigins.filter(Boolean).includes(origin)) {
    return callback(null, true);
  }
  // Allow localhost variants
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }
  return callback(null, true); // Be permissive to avoid connection issues
};

// CORS configuration
const corsOptions = {
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit handling for preflight OPTIONS requests (important for Azure App Service)
app.options('*', cors(corsOptions));

// Additional CORS headers middleware to ensure they're always set (Azure sometimes strips them)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Set CORS headers explicitly for all requests
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // Handle preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Initialize Socket.IO with Azure Web PubSub
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  upgrade: true,
  allowUpgrades: true,
  // Azure-specific settings for improved compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
  maxHttpBufferSize: 1e6, // 1MB for signaling messages
  perMessageDeflate: false // Disable compression for Azure proxy compatibility
});

// Azure Web PubSub for Socket.IO - DISABLED
// The Web PubSub service causes 403 errors when not properly configured.
// For single-instance Azure App Service, standard Socket.IO works fine.
// To re-enable, uncomment below and ensure AZURE_WEBPUBSUB_CONNECTION_STRING is valid.
/*
if (process.env.AZURE_WEBPUBSUB_CONNECTION_STRING) {
  try {
    useAzureSocketIO(io, {
      hub: "superdesk_hub",
      connectionString: process.env.AZURE_WEBPUBSUB_CONNECTION_STRING
    });
    console.log('[Socket.IO] Azure Web PubSub integration enabled');
  } catch (e) {
    console.warn('[Socket.IO] Azure Web PubSub failed, using standard Socket.IO:', e.message);
  }
} else {
  console.log('[Socket.IO] Running without Azure Web PubSub (standard mode)');
}
*/
console.log('[Socket.IO] Running in standard mode (Azure Web PubSub disabled)');

app.use(express.json());
app.use(express.static('public'));

// File upload configuration with configurable limit (default 20GB)
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
  limits: { fileSize: FILE_TRANSFER.MAX_SIZE } // configurable limit via shared constants
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Store active sessions
const sessions = new Map();

// Helper function to generate short session IDs
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// WebRTC signaling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-session', (payload) => {
    // Rate limiting check
    const clientIp = socket.handshake.address;
    const now = Date.now();
    const attempts = sessionCreationAttempts.get(clientIp) || [];
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
    
    if (recentAttempts.length >= MAX_SESSIONS_PER_MINUTE) {
      console.warn(`Rate limit exceeded for ${clientIp}`);
      socket.emit('session-error', 'Too many session creation attempts. Please wait a moment.');
      return;
    }
    
    // Update rate limit tracking
    recentAttempts.push(now);
    sessionCreationAttempts.set(clientIp, recentAttempts);
    
    // Generate a short, readable session ID
    let sessionId;
    do {
      sessionId = generateSessionId();
    } while (sessions.has(sessionId)); // Ensure uniqueness

    sessions.set(sessionId, {
      id: sessionId,
      host: socket.id,
      clients: [],
      created: new Date(),
      type: payload?.type || 'unknown'
    });
    
    // Track activity for timeout
    sessionLastActivity.set(sessionId, now);

    socket.join(sessionId);
    socket.emit('session-created', { sessionId });
    console.log(`Session created: ${sessionId} (Type: ${payload?.type || 'unknown'})`);
  });

  socket.on('join-session', (payload) => {
    // Handle both string and object formats: 'ABC123' or { sessionId: 'ABC123' }
    const sessionId = typeof payload === 'string' ? payload : (payload?.sessionId || '');

    // Normalize session ID to uppercase (session IDs are generated as uppercase)
    const normalizedSessionId = sessionId ? sessionId.toString().toUpperCase().trim() : '';
    console.log(`Attempting to join session: ${normalizedSessionId} (original: ${sessionId}) from socket: ${socket.id}`);
    const session = sessions.get(normalizedSessionId);

    if (session) {
      session.clients.push(socket.id);
      socket.join(normalizedSessionId);

      // Notify host about new joiner so they can send offer
      socket.to(session.host).emit('guest-joined', {
        guestId: socket.id,
        sessionId: normalizedSessionId
      });

      socket.emit('session-joined', normalizedSessionId);

      console.log(`✅ Client ${socket.id} successfully joined session ${normalizedSessionId}`);
      console.log(`Session now has: Host: ${session.host}, Clients: [${session.clients.join(', ')}]`);
    } else {
      console.log(`❌ Session ${normalizedSessionId} not found. Available sessions:`, Array.from(sessions.keys()));
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
    
    // Update session activity
    if (sessionId && sessionLastActivity.has(sessionId)) {
      sessionLastActivity.set(sessionId, Date.now());
    }

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

  // ==================== FILE TRANSFER SIGNALING ====================
  // These handlers relay WebRTC signaling for the file-only peer connection

  socket.on('file-offer', (payload) => {
    const { sessionId, offer } = payload;
    console.log('📁 File offer received, relaying to session:', sessionId);
    socket.to(sessionId).emit('file-offer', { offer, from: socket.id });
  });

  socket.on('file-answer', (payload) => {
    const { sessionId, answer } = payload;
    console.log('📁 File answer received, relaying to session:', sessionId);
    socket.to(sessionId).emit('file-answer', { answer, from: socket.id });
  });

  socket.on('file-ice-candidate', (payload) => {
    const { sessionId, candidate } = payload;
    socket.to(sessionId).emit('file-ice-candidate', { candidate, from: socket.id });
  });

  // Screen sharing events
  socket.on('start-screen-share', (sessionId) => {
    socket.to(sessionId).emit('screen-share-started');
  });

  socket.on('stop-screen-share', (sessionId) => {
    socket.to(sessionId).emit('screen-share-stopped');
  });

  // Camera and microphone state events - relay to other peers in session
  socket.on('camera-state', (data) => {
    console.log('📹 Camera state:', data.enabled ? 'ON' : 'OFF', 'session:', data.sessionId);
    socket.to(data.sessionId).emit('camera-state', data);
  });

  socket.on('mic-state', (data) => {
    console.log('🎤 Mic state:', data.enabled ? 'ON' : 'OFF', 'session:', data.sessionId);
    socket.to(data.sessionId).emit('mic-state', data);
  });

  // Renegotiation request - relay from guest to host
  socket.on('request-renegotiation', (data) => {
    console.log('🔄 Renegotiation requested:', data.reason, 'session:', data.sessionId);
    socket.to(data.sessionId).emit('request-renegotiation', data);
  });

  // Remote control events
  socket.on('mouse-event', (data) => {
    // Update session activity on interaction
    if (data.sessionId && sessionLastActivity.has(data.sessionId)) {
      sessionLastActivity.set(data.sessionId, Date.now());
    }
    socket.to(data.sessionId).emit('mouse-event', data);
  });

  socket.on('keyboard-event', (data) => {
    // Update session activity on interaction
    if (data.sessionId && sessionLastActivity.has(data.sessionId)) {
      sessionLastActivity.set(data.sessionId, Date.now());
    }
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

  // Host stopped sharing - notify guests to stop sending events
  socket.on('stop-sharing', (data) => {
    console.log('🛑 Host stopped sharing for session:', data.sessionId);
    socket.to(data.sessionId).emit('host-stopped-sharing');
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
        sessionLastActivity.delete(sessionId);
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

// ==================== SESSION TIMEOUT CLEANUP ====================
// Clean up inactive sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, lastActivity] of sessionLastActivity.entries()) {
    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      const session = sessions.get(sessionId);
      if (session) {
        console.log(`Cleaning up inactive session: ${sessionId} (inactive for ${Math.round((now - lastActivity) / 60000)} minutes)`);
        io.to(sessionId).emit('session-timeout');
        sessions.delete(sessionId);
        sessionLastActivity.delete(sessionId);
        cleanedCount++;
      }
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} inactive sessions`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Clean up old rate limit data every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of sessionCreationAttempts.entries()) {
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
    if (recentAttempts.length === 0) {
      sessionCreationAttempts.delete(ip);
    } else {
      sessionCreationAttempts.set(ip, recentAttempts);
    }
  }
}, 60 * 1000);

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (req.file.size > FILE_TRANSFER.MAX_SIZE) {
    return res.status(400).json({ error: `File size exceeds ${utils.formatFileSize(FILE_TRANSFER.MAX_SIZE)} limit` });
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
      maxFileSize: utils.formatFileSize(FILE_TRANSFER.MAX_SIZE),
      socketIO: true
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

// WebRTC ICE servers configuration endpoint
// === LATENCY OPTIMIZATION: STUN FIRST, TURN AS FALLBACK ===
// STUN enables direct peer-to-peer (lowest latency)
// TURN is relay fallback (higher latency, but works through strict NAT/firewalls)
//
// Configure via env:
//   TURN_URLS: comma-separated list of TURN urls, e.g. "turn:turn1.example.com:3478,turns:turn1.example.com:5349"
//   TURN_USERNAME, TURN_CREDENTIAL: credentials for the TURN server(s)
app.get('/api/webrtc-config', (req, res) => {
  // === STUN SERVERS FIRST (direct P2P, lowest latency) ===
  const defaultStun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
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
    env: turnDiagnostics.env
  });
});

// Populate the Cloudflare environment variables for diagnostics
turnDiagnostics.env.CLOUDFLARE_ACCOUNT_ID = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID || process.env.ACCOUNT_ID);
turnDiagnostics.env.CLOUDFLARE_API_TOKEN = Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY);
turnDiagnostics.env.CLOUDFLARE_TURN_KEY_ID = Boolean(process.env.CLOUDFLARE_TURN_KEY_ID || process.env.TURN_KEY_ID);
turnDiagnostics.env.CLOUDFLARE_TURN_KEY_API_TOKEN = Boolean(process.env.CLOUDFLARE_TURN_KEY_API_TOKEN || process.env.CLOUDFLARE_TURN_KEY_TOKEN || process.env.TURN_KEY_API_TOKEN);
turnDiagnostics.env.TURN_URLS = Boolean(process.env.TURN_URLS);
turnDiagnostics.env.TURN_USERNAME = Boolean(process.env.TURN_USERNAME);
turnDiagnostics.env.TURN_CREDENTIAL = Boolean(process.env.TURN_CREDENTIAL);
// Socket.io test endpoint to check if socket.io is accessible
app.get('/socket-test', (req, res) => {
  res.json({
    status: 'Socket.io server is running',
    endpoint: '/socket.io/',
    transports: ['websocket', 'polling'],
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint - helps debug CORS issues
app.get('/cors-test', (req, res) => {
  res.json({
    status: 'CORS is working',
    origin: req.headers.origin || 'no origin header',
    method: req.method,
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
    },
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
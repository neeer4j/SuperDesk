const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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
      
      // Notify other participants
      socket.to(sessionId).emit('user-joined', socket.id);
      socket.emit('session-joined', sessionId);
      
      console.log(`✅ Client ${socket.id} successfully joined session ${sessionId}`);
      console.log(`Session now has: Host: ${session.host}, Clients: [${session.clients.join(', ')}]`);
    } else {
      console.log(`❌ Session ${sessionId} not found. Available sessions:`, Array.from(sessions.keys()));
      socket.emit('session-error', 'Session not found');
    }
  });

  // WebRTC signaling messages
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
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
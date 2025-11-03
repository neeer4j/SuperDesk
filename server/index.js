const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
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
    const session = sessions.get(sessionId);
    if (session) {
      session.clients.push(socket.id);
      socket.join(sessionId);
      
      // Notify other participants
      socket.to(sessionId).emit('user-joined', socket.id);
      socket.emit('session-joined', sessionId);
      
      console.log(`Client ${socket.id} joined session ${sessionId}`);
    } else {
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
    socket.broadcast.emit('mouse-event', data);
  });

  socket.on('keyboard-event', (data) => {
    socket.broadcast.emit('keyboard-event', data);
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
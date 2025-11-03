# SuperDesk - Remote Desktop Access Software

SuperDesk is a comprehensive remote desktop access web application designed for personal use on Windows platforms. It provides secure, real-time screen sharing, bidirectional audio communication, camera access, and file transfer capabilities.

## 🚀 Features

- **Web-based Client Interface** - Access from any modern browser
- **Windows Desktop Agent** - Lightweight Electron-based screen capture agent
- **Real-time Screen Sharing** - High-quality screen streaming via WebRTC
- **Bidirectional Audio** - Two-way audio communication with echo cancellation
- **Camera Video Access** - Optional camera sharing from client
- **File Transfer** - Secure file sharing with 10MB size limit
- **Secure Connections** - WebRTC peer-to-peer with WebSocket signaling
- **Session Management** - Easy session creation and joining with unique IDs

## 🏗 Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    WebRTC      ┌─────────────────┐
│                 │    Signaling     │                 │   P2P Data      │                 │
│   Web Client    │◄────────────────►│  Node.js Server │◄───────────────►│ Desktop Agent   │
│   (React App)   │                  │  (Express+IO)   │                 │  (Electron)     │
└─────────────────┘                  └─────────────────┘                 └─────────────────┘
        │                                      │                                   │
        │                                      │                                   │
    Browser                              WebSocket Server                   Windows Desktop
   - WebRTC                             - Session Management                 - Screen Capture
   - File Upload                        - Signaling Relay                   - Input Simulation
   - Audio/Video                        - File Transfer Hub                 - Audio Capture
```

## 📁 Project Structure

```
SuperDesk/
├── client/                 # React web application
│   ├── src/
│   │   ├── App.js         # Main application component
│   │   ├── App.css        # Application styles
│   │   └── index.js       # Entry point
│   ├── public/
│   │   └── index.html     # HTML template
│   └── package.json       # Client dependencies
├── server/                 # Node.js signaling server
│   ├── index.js           # Express server with Socket.io
│   ├── uploads/           # File transfer storage
│   └── package.json       # Server dependencies
├── agent/                  # Electron desktop agent
│   ├── main.js           # Electron main process
│   ├── agent.html        # Agent UI interface
│   ├── assets/           # App icons and resources
│   └── package.json      # Agent dependencies
├── shared/                 # Common utilities and constants
│   └── index.js          # Shared constants and utilities
├── .vscode/
│   └── tasks.json        # VS Code development tasks
└── package.json          # Root workspace configuration
```

## 🛠 Technology Stack

### Frontend (Web Client)
- **React 18** - User interface framework
- **WebRTC** - Real-time peer-to-peer communication
- **Socket.io Client** - WebSocket communication
- **HTML5 Canvas** - Media rendering and display

### Backend (Signaling Server)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time WebSocket communication
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Desktop Agent
- **Electron** - Cross-platform desktop framework
- **Native Windows APIs** - Screen capture and input simulation
- **Socket.io Client** - Server communication

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and npm
- **Windows 10/11** (for desktop agent)
- **Modern browser** with WebRTC support (Chrome, Firefox, Edge)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd SuperDesk
npm run install:all
```

2. **Start development environment:**
```bash
# Option 1: Start all services (recommended)
npm run dev

# Option 2: Start services individually
npm run dev:server    # Start signaling server (port 3001)
npm run dev:client     # Start web client (port 3000)
npm run dev:agent      # Start desktop agent
```

### VS Code Development

For VS Code users, several tasks are pre-configured:

- **Ctrl+Shift+P** → `Tasks: Run Task`
  - `Start SuperDesk Development` - Launches server and client
  - `Start Server Only` - Run signaling server only
  - `Start Client Only` - Run web client only
  - `Start Agent Only` - Run desktop agent only

## 📖 Usage Guide

### Setting Up a Remote Session

1. **Start the Desktop Agent** on the Windows machine you want to access
2. **Run the Signaling Server** (automatically starts on port 3001)
3. **Open the Web Client** in a browser (http://localhost:3000)

### Creating a Session

1. In the **Desktop Agent**, click "Start New Session"
2. Note the **Session ID** generated
3. The agent will begin capturing screen data

### Joining a Session

1. Open the **Web Client** in a browser
2. Enter the **Session ID** and click "Join Session"
3. Allow camera/microphone permissions when prompted
4. You should see the remote screen and hear audio

### File Transfer

1. In the web client, click "Send File (Max 10MB)"
2. Select a file under 10MB
3. File will be transferred via WebRTC data channels
4. Progress indicator shows transfer status

## 🔧 Configuration

### Server Configuration
The server runs on port 3001 by default. Configure in `server/index.js`:

```javascript
const PORT = process.env.PORT || 3001;
```

### WebRTC Configuration
STUN servers are configured in `shared/index.js`:

```javascript
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

### File Transfer Limits
Modify file size limits in `shared/index.js`:

```javascript
const FILE_TRANSFER = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  CHUNK_SIZE: 16 * 1024       // 16KB chunks
};
```

## 🔐 Security Features

- **WebRTC Encryption** - All media streams are encrypted end-to-end
- **Session IDs** - Unique session identifiers for access control
- **File Size Validation** - Prevents oversized file transfers
- **CORS Protection** - Controlled cross-origin access
- **Input Validation** - Server-side validation for all inputs

## 🧪 Development & Testing

### Running Tests
```bash
# Client tests
cd client && npm test

# Server tests (when implemented)
cd server && npm test
```

### Building for Production
```bash
# Build client for production
npm run build:client

# Build agent for distribution
npm run build:agent
```

### Debugging

1. **Client**: Open browser DevTools (F12)
2. **Server**: Add breakpoints in VS Code
3. **Agent**: Electron DevTools available in development mode

## 📝 API Endpoints

### REST Endpoints
- `GET /health` - Server health check
- `GET /sessions` - List active sessions (debug)
- `POST /upload` - File upload endpoint
- `GET /download/:filename` - File download endpoint

### WebSocket Events
- `create-session` - Create new session
- `join-session` - Join existing session
- `offer/answer` - WebRTC signaling
- `ice-candidate` - ICE candidate exchange
- `file-transfer-*` - File transfer events

## ⚠️ Known Limitations

- **Windows Only** - Desktop agent currently Windows-specific
- **10MB File Limit** - File transfers limited to 10MB
- **Local Network** - Optimized for LAN use (STUN servers for internet)
- **Browser Compatibility** - Requires WebRTC-enabled browsers

## 🛣 Roadmap

### Upcoming Features
- [ ] Multi-monitor support
- [ ] Enhanced security (authentication)
- [ ] macOS/Linux agent support
- [ ] Mobile client app
- [ ] Screen annotation tools
- [ ] Chat functionality
- [ ] Session recording

### Performance Improvements
- [ ] Adaptive video quality
- [ ] Better compression algorithms
- [ ] Bandwidth optimization
- [ ] Connection stability improvements

## 🐛 Troubleshooting

### Common Issues

**Connection Failed:**
- Check if server is running on port 3001
- Verify firewall settings
- Ensure WebRTC is supported in browser

**Screen Capture Issues:**
- Run agent as administrator if needed
- Check Windows permissions for screen recording
- Verify Electron security settings

**Audio Problems:**
- Check microphone/speaker permissions
- Verify audio device availability
- Test browser audio capabilities

**File Transfer Fails:**
- Verify file size under 10MB
- Check network connectivity
- Ensure WebRTC data channels are working

## 📞 Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review the GitHub issues
3. Create a new issue with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**⚡ SuperDesk** - Built for seamless remote desktop access with modern web technologies.
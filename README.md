# 🛠️ Built With

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,nodejs,electron,js,html,css,express,windows,vercel,github,vscode" alt="Tech stack" />
</p>
# SuperDesk - Remote Desktop Access Software


SuperDesk is a modern remote desktop access platform for Windows, featuring:
- Secure, real-time screen sharing (WebRTC with TURN/STUN support)
- Bidirectional audio and camera streaming
- File transfer (max 10MB per file)
- Windows desktop agent for full control
- End-to-end encrypted peer-to-peer connections
- Cloud signaling and TURN relay (Cloudflare or OpenRelay)

**TURN/STUN Support:**
SuperDesk uses dynamic TURN/STUN server configuration for maximum connectivity, including:
- Cloudflare Realtime TURN (if configured via environment variables)
- OpenRelay public TURN servers as fallback
- Google STUN servers
TURN credentials are fetched securely by the backend and provided to both web and desktop clients.

**Security:**
- All signaling and media connections use HTTPS/WSS and DTLS-SRTP
- File transfers are validated and limited to 10MB
- WebRTC peer connections are secured and ephemeral
- Authentication and access control are recommended for production

**Deployment:**
- Web client: React (Create React App), deployable to Vercel or any static host
- Backend: Node.js (Express + Socket.io), deployable to Render, Railway, or any Node host
- Desktop agent: Electron app for Windows, packaged with electron-builder

**License & Usage:**
SuperDesk is currently free to use for personal/non-commercial purposes. If you wish to use, modify, or redistribute SuperDesk for commercial purposes, please contact the authors for licensing options. (See LICENSE for details.)

---

## 🚀 Quick Start

Run `start-dev.bat` to launch both server and client automatically! The server will start on port 3001 and the client on port 3000.


## 🚀 Features
- **Web-based Client Interface** – Access from any modern browser
- **Windows Desktop Agent** – Electron-based screen capture and control
- **Real-time Screen Sharing** – WebRTC with TURN/STUN relay
- **Bidirectional Audio** – Two-way audio with echo cancellation
- **Camera Video Access** – Optional camera sharing
- **File Transfer** – Secure, 10MB per file limit
- **Secure Connections** – Encrypted peer-to-peer (DTLS-SRTP)
- **Session Management** – Easy session creation/joining with unique IDs


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
   - WebRTC (TURN/STUN)                 - Session Management                 - Screen Capture
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
├── shared/                 # Common utilities and types
│   └── index.js          # Shared constants and utilities
├── .vscode/
│   └── tasks.json        # VS Code development tasks

---

## 🌐 Environment & TURN Configuration

- **TURN/STUN servers** are configured dynamically by the backend (`server/turn-provider.js`).
- By default, the backend will use public OpenRelay and Google STUN servers.
- For production, you can set up Cloudflare Realtime TURN by providing the following environment variables:
  - `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_KEY_API_TOKEN` (preferred)
  - or `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (legacy)
- The backend exposes `/api/webrtc-config` for clients to fetch the current ICE server list.

## 🔒 License

This project is licensed under the MIT License (see LICENSE). For commercial use, please contact the authors for permission. SuperDesk is a personal project and not affiliated with any company.
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

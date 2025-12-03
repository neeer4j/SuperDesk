# SuperDesk

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,nodejs,electron,js,html,css,express,windows,vercel,github,vscode" alt="Tech stack" />
</p>

A modern remote desktop access platform for Windows with real-time screen sharing, remote control, and peer-to-peer file transfer.

## ✨ Features

- **Real-time Screen Sharing** – WebRTC-powered streaming with TURN/STUN support
- **Remote Control** – Full mouse and keyboard control over the remote desktop
- **P2P File Transfer** – Direct file transfer between Electron agents via WebRTC DataChannel (5–20GB recommended)
- **Friends & Messaging** – Add friends and chat with real-time messaging (Supabase-powered)
- **Session Management** – Easy 8-character session IDs for quick connections
- **Authentication** – Secure email OTP login via Supabase
- **Customizable UI** – Light/dark themes, video quality settings, and more
- **Secure Connections** – End-to-end encrypted peer-to-peer (DTLS-SRTP)

## 🏗 Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    WebRTC       ┌─────────────────┐
│   Web Client    │◄────────────────►│  Node.js Server │◄───────────────►│ Desktop Agent   │
│   (React)       │    Signaling     │  (Express+IO)   │   P2P Stream    │  (Electron)     │
└─────────────────┘                  └─────────────────┘                 └─────────────────┘
```

- **Web Client**: React app for joining sessions from any browser
- **Server**: Node.js signaling server (Express + Socket.io)
- **Desktop Agent**: Electron app for Windows (host or guest)

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Windows 10/11 (for desktop agent)
- Modern browser with WebRTC support

### Development Setup

```bash
# Install all dependencies
npm run install:all

# Start development (server + client)
npm run dev

# Or use the batch file on Windows
start-dev.bat
```

The server runs on port 3001, the client on port 3000.

### Running the Agent

```bash
cd agent
npm install
npm start
```

## 📖 Usage

### Host a Session (Desktop Agent)
1. Open the Desktop Agent and sign in
2. Click **Share** and select a screen/window
3. Share the 8-character **Session ID** with others

### Join a Session
- **From Desktop Agent**: Enter the Session ID and click Join
- **From Web Client**: Navigate to the web app and enter the Session ID

### File Transfer (Electron-to-Electron)
1. Host starts screen sharing – a **File Transfer** card appears
2. Drag and drop files or click to select
3. Guest receives a file offer modal (Accept/Reject)
4. Transfer happens directly P2P with progress indicators

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
PORT=3001
NODE_ENV=development

# Optional: Cloudflare TURN for better NAT traversal
CLOUDFLARE_TURN_KEY_ID=your_key_id
CLOUDFLARE_TURN_KEY_API_TOKEN=your_api_token
```

### File Transfer Settings
Modify limits in `shared/index.js`:
```javascript
const FILE_TRANSFER = {
  MAX_SIZE: 20 * 1024 * 1024 * 1024, // 20GB
  CHUNK_SIZE: 16 * 1024              // 16KB chunks
};
```

## 📁 Project Structure

```
SuperDesk/
├── client/          # React web application
├── server/          # Node.js signaling server
├── agent/           # Electron desktop agent
│   └── modules/     # Agent modules (file-transfer, etc.)
└── shared/          # Shared constants and utilities
```

## 🔐 Security

- WebRTC streams encrypted with DTLS-SRTP
- Signaling over WSS (WebSocket Secure)
- Session IDs are ephemeral and random
- P2P file transfers don't pass through the server

## ⚠️ Limitations

- Desktop agent is Windows-only
- File transfer works only between Electron agents (not web-to-agent)
- Optimized for LAN; internet connections use STUN/TURN relay

## 🐛 Troubleshooting

**Connection Issues:**
- Verify server is running on port 3001
- Check firewall allows WebRTC traffic
- Ensure both parties have stable network

**File Transfer Issues:**
- Check DevTools console for `📁` prefixed logs
- Verify file size is under the limit
- Both agents must have the DataChannel established

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See the [LICENSE](LICENSE) file for details. If you redistribute or modify this project, you must keep it under GPL-3.0.

---

**⚡ SuperDesk** – Modern remote desktop access built with web technologies.

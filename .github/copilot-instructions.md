<!-- SuperDesk Remote Desktop Access Software Instructions -->

## Project Overview
SuperDesk is a remote desktop access web application designed for personal use on Windows platforms. 

## Key Features
- Web-based client interface for easy access
- Windows desktop agent for screen capture and control
- Bidirectional audio support
- Camera video access option
- File transfer with 10MB size limit
- WebRTC for real-time communication
- Secure peer-to-peer connections

## Architecture
- **Frontend**: React-based web client
- **Backend**: Node.js with Express and Socket.io
- **Desktop Agent**: Electron-based Windows application
- **Communication**: WebRTC + WebSocket signaling

## Development Guidelines
- Focus on Windows compatibility
- Prioritize performance for real-time communication
- Implement proper security measures for remote access
- Keep file transfer limited to 10MB
- Ensure audio quality for bidirectional communication
- Test camera integration thoroughly

## File Structure
- `client/` - React web application
- `server/` - Node.js backend server
- `agent/` - Electron desktop agent
- `shared/` - Common utilities and types

## Security Considerations
- Implement proper authentication
- Use encrypted connections (HTTPS/WSS)
- Validate file transfers and size limits
- Secure WebRTC peer connections
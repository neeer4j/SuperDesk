# SuperDesk Agent - Developer Guide

## Architecture Overview

The SuperDesk Agent is built on Electron with a modular architecture to support easy feature additions and maintenance.

### Core Technologies
- **Electron**: Desktop application framework
- **WebRTC**: Peer-to-peer screen sharing and remote control
- **Socket.io**: Real-time signaling with the server
- **robotjs**: Native Windows mouse/keyboard control

### Project Structure

```
agent/
├── main.js              # Electron main process (window management, IPC handlers)
├── renderer.js          # Main renderer logic (integrates all modules)
├── preload.js           # Secure bridge between renderer and main process
├── agent.html           # UI markup and styles
├── modules/             # Modular feature components
│   ├── ui-controller.js       # UI state management
│   ├── socket-manager.js      # Socket.io communication
│   └── webrtc-manager.js      # WebRTC peer connections
└── assets/              # Images, icons
```

## Design Principles

### 1. Fullscreen-First
The agent runs in fullscreen mode (`#0a006f` background) optimized for dedicated remote desktop use.

### 2. Modular Architecture
Features are separated into independent modules:
- **UIController**: Manages screen transitions, status updates, notifications
- **SocketManager**: Handles all signaling server communication
- **WebRTCManager**: Manages peer connections and media streams

### 3. Consistent Color Scheme
- **Primary Background**: `#0a006f` (deep blue)
- **Text**: White (`#ffffff`)
- **Buttons**: `#0a006f` background with white borders and text
- **Cards**: Semi-transparent white overlays with blur effects

### 4. Scalable for Features
The modular design makes it easy to add new features:

## Adding New Features

### Example: Add a "Settings" Screen

1. **Add UI in `agent.html`**:
```html
<div id="settings-screen" class="screen">
  <!-- Your settings UI -->
</div>
```

2. **Extend UIController** (`modules/ui-controller.js`):
```javascript
showSettingsScreen() {
  // Hide other screens
  // Show settings screen
}
```

3. **Wire up in `renderer.js`**:
```javascript
document.getElementById('settings-button').addEventListener('click', () => {
  uiController.showSettingsScreen();
});
```

### Example: Add File Transfer Module

1. **Create `modules/file-transfer.js`**:
```javascript
class FileTransferManager {
  constructor(peerConnection) {
    this.dataChannel = peerConnection.createDataChannel('fileTransfer');
    // Implementation
  }
  
  sendFile(file) { /* ... */ }
  onFileReceived(callback) { /* ... */ }
}
```

2. **Integrate in `renderer.js`**:
```javascript
const fileTransferManager = new FileTransferManager(peerConnection);
fileTransferManager.onFileReceived((file) => {
  uiController.showNotification(`Received: ${file.name}`);
});
```

### Example: Add Custom IPC Handler

1. **In `main.js`**, add handler:
```javascript
ipcMain.on('custom-feature', (event, data) => {
  // Handle your feature
  event.reply('custom-feature-response', result);
});
```

2. **In renderer/module**, call it:
```javascript
ipcRenderer.send('custom-feature', { param: 'value' });
ipcRenderer.on('custom-feature-response', (event, result) => {
  // Handle response
});
```

## Development Workflow

### Running in Dev Mode
```powershell
cd agent
npm run dev
```

### Building for Production
```powershell
cd agent
npm run rebuild-native  # Rebuild robotjs for Electron
npm run build           # Build installer
```

### CI Build (Windows)
The GitHub Actions workflow `.github/workflows/windows-build.yml` automatically builds on push.

## Key Configuration

### Window Settings (`main.js`)
```javascript
fullscreen: true,           // Start in fullscreen
frame: false,               // Frameless for custom titlebar
backgroundColor: '#0a006f'  // Brand color background
```

### WebRTC Settings (`modules/webrtc-manager.js`)
- Configurable ICE servers
- Screen capture optimized for 1080p @ 60fps
- Bitrate control for quality/performance balance

### UI Theming (`agent.html`)
All colors centralized in CSS variables for easy theming:
```css
body {
  background: #0a006f;
  color: white;
}
```

## Best Practices

1. **Keep modules independent**: Each module should be self-contained
2. **Use callbacks/events**: Modules communicate via callbacks, not direct references
3. **Error handling**: Always wrap risky operations in try-catch
4. **Logging**: Use consistent prefixes: `[ModuleName] message`
5. **UI feedback**: Use `uiController.showNotification()` for user feedback

## Testing Locally

1. Start dev agent: `npm run dev`
2. Verify UI: Check colors, layout, fullscreen mode
3. Test features: Session creation, screen share, remote control
4. Check console: Look for errors or warnings

## Troubleshooting

### Native Module Issues
If robotjs fails to load:
```powershell
npm run rebuild-native
```

### Packaging Issues
Use CI build to avoid local environment conflicts:
- Push to `build/prepare-robotjs` branch
- Download artifacts from GitHub Actions

### UI Not Updating
- Clear Electron cache: Delete `%AppData%/SuperDesk Agent`
- Restart dev server

## Next Steps

- Add more modules as needed (audio, file transfer, chat, etc.)
- Implement settings persistence (use `electron-store`)
- Add authentication/security features
- Enhance UI with animations and transitions
- Add multi-monitor support

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [robotjs](https://robotjs.io/docs/)

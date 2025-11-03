const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const io = require('socket.io-client');
const screenshot = require('screenshot-desktop');

let mainWindow;
let socket;
let isCapturing = false;
let captureInterval;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'SuperDesk Agent'
  });

  // Load the agent interface
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadFile('agent.html');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('agent.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeSocket() {
  socket = io('http://localhost:3001');
  
  socket.on('connect', () => {
    console.log('Agent connected to server');
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: true });
    }
  });

  socket.on('disconnect', () => {
    console.log('Agent disconnected from server');
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: false });
    }
  });

  socket.on('mouse-event', (data) => {
    handleMouseEvent(data);
  });

  socket.on('keyboard-event', (data) => {
    handleKeyboardEvent(data);
  });

  socket.on('start-screen-capture', () => {
    startScreenCapture();
  });

  socket.on('stop-screen-capture', () => {
    stopScreenCapture();
  });
}

async function startScreenCapture() {
  if (isCapturing) return;
  
  isCapturing = true;
  console.log('Starting screen capture...');

  // Capture screen every 100ms (10 FPS)
  captureInterval = setInterval(async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length > 0) {
        const screenData = sources[0].thumbnail.toDataURL();
        
        // Send screen data via socket
        if (socket && socket.connected) {
          socket.emit('screen-frame', {
            data: screenData,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Screen capture error:', error);
    }
  }, 100);

  if (mainWindow) {
    mainWindow.webContents.send('capture-status', { capturing: true });
  }
}

function stopScreenCapture() {
  if (!isCapturing) return;
  
  isCapturing = false;
  clearInterval(captureInterval);
  console.log('Screen capture stopped');

  if (mainWindow) {
    mainWindow.webContents.send('capture-status', { capturing: false });
  }
}

function handleMouseEvent(data) {
  // Simulate mouse events on Windows
  const { exec } = require('child_process');
  
  switch (data.type) {
    case 'click':
      // Use Windows API or third-party library to simulate mouse click
      exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${data.x}, ${data.y}); [System.Windows.Forms.Application]::DoEvents()"`);
      break;
    case 'move':
      exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${data.x}, ${data.y})"`);
      break;
  }
}

function handleKeyboardEvent(data) {
  // Simulate keyboard events on Windows
  const { exec } = require('child_process');
  
  if (data.type === 'keypress') {
    // Use Windows SendKeys or similar
    exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${data.key}')"`);
  }
}

// IPC handlers
ipcMain.handle('start-session', async () => {
  if (socket) {
    socket.emit('create-session');
    return { success: true };
  }
  return { success: false, error: 'Not connected to server' };
});

ipcMain.handle('stop-session', async () => {
  stopScreenCapture();
  return { success: true };
});

ipcMain.handle('get-connection-status', () => {
  return { connected: socket ? socket.connected : false };
});

app.whenReady().then(() => {
  createWindow();
  initializeSocket();

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (isCapturing) {
      stopScreenCapture();
    } else {
      startScreenCapture();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Clean up socket connection
  if (socket) {
    socket.disconnect();
  }
});
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const robot = require('robotjs');

let mainWindow;

// robotjs is not context-aware; keep legacy behavior so native module loads
app.allowRendererProcessReuse = false;

const REMOTE_REFERENCE_WIDTH = 1920;
const REMOTE_REFERENCE_HEIGHT = 1080;
let remoteControlEnabled = false;
let screenSize = robot.getScreenSize();
const activeKeys = new Set();

function refreshScreenSize() {
  try {
    screenSize = robot.getScreenSize();
  } catch (error) {
    console.error('Failed to get screen size:', error);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function translateCoordinates(x, y) {
  const clampedX = clamp(x ?? 0, 0, REMOTE_REFERENCE_WIDTH);
  const clampedY = clamp(y ?? 0, 0, REMOTE_REFERENCE_HEIGHT);
  return {
    x: Math.round((clampedX / REMOTE_REFERENCE_WIDTH) * screenSize.width),
    y: Math.round((clampedY / REMOTE_REFERENCE_HEIGHT) * screenSize.height)
  };
}

function mapMouseButton(buttonIndex = 0) {
  if (buttonIndex === 2) return 'right';
  if (buttonIndex === 1) return 'middle';
  return 'left';
}

const KEY_CODE_MAP = {
  Backquote: 'grave',
  Minus: 'minus',
  Equal: 'equals',
  BracketLeft: 'leftbracket',
  BracketRight: 'rightbracket',
  Backslash: 'backslash',
  Semicolon: 'semicolon',
  Quote: 'quote',
  Comma: 'comma',
  Period: 'period',
  Slash: 'slash',
  Space: 'space',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Tab: 'tab',
  Backspace: 'backspace',
  Delete: 'delete',
  Escape: 'escape',
  CapsLock: 'capslock',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  Insert: 'insert',
  ControlLeft: 'control',
  ControlRight: 'control',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  AltLeft: 'alt',
  AltRight: 'alt',
  MetaLeft: 'command',
  MetaRight: 'command',
  Pause: 'pause',
  ScrollLock: 'scrolllock',
  PrintScreen: 'printscreen'
};

function toRobotKey(code, key) {
  if (code && code.startsWith('Key')) {
    return code.slice(3).toLowerCase();
  }
  if (code && code.startsWith('Digit')) {
    return code.slice(5);
  }
  if (code && code.startsWith('Numpad')) {
    const suffix = code.slice(6);
    if (/^[0-9]$/.test(suffix)) {
      return `numpad_${suffix}`;
    }
    switch (suffix.toLowerCase()) {
      case 'add':
        return 'numpad_add';
      case 'subtract':
        return 'numpad_subtract';
      case 'multiply':
        return 'numpad_multiply';
      case 'divide':
        return 'numpad_divide';
      case 'decimal':
        return 'numpad_decimal';
      case 'enter':
        return 'enter';
      default:
        break;
    }
  }
  if (code && /^F[1-9][0-2]?$/.test(code)) {
    return code.toLowerCase();
  }
  if (code && KEY_CODE_MAP[code]) {
    return KEY_CODE_MAP[code];
  }
  if (key && KEY_CODE_MAP[key]) {
    return KEY_CODE_MAP[key];
  }
  if (key && key.length === 1) {
    return key.toLowerCase();
  }
  return null;
}

function releaseActiveKeys() {
  activeKeys.forEach((robotKey) => {
    try {
      robot.keyToggle(robotKey, 'up');
    } catch (error) {
      console.error('Failed to release key:', robotKey, error);
    }
  });
  activeKeys.clear();
}

ipcMain.on('robot-refresh-screen-size', () => {
  console.log('[robot] refresh-screen-size requested');
  refreshScreenSize();
  console.log('[robot] screenSize now:', screenSize);
});

ipcMain.on('robot-set-enabled', (_event, enabled) => {
  remoteControlEnabled = !!enabled;
  console.log('[robot] set-enabled:', remoteControlEnabled);
  if (!remoteControlEnabled) {
    releaseActiveKeys();
  }
});

ipcMain.on('robot-release-keys', () => {
  releaseActiveKeys();
});

ipcMain.on('robot-mouse-event', (_event, data = {}) => {
  if (!remoteControlEnabled) return;
  const { type, x, y, button } = data;
  const coords = translateCoordinates(x, y);

  try {
    // Debug: log a small sample of events
    if (Math.random() < 0.02) {
      console.log('[robot] mouse', { type, x, y, mapped: coords, button });
    }
    switch (type) {
      case 'mousemove':
        robot.moveMouse(coords.x, coords.y);
        break;
      case 'mousedown':
        robot.moveMouse(coords.x, coords.y);
        robot.mouseToggle('down', mapMouseButton(button));
        break;
      case 'mouseup':
        robot.moveMouse(coords.x, coords.y);
        robot.mouseToggle('up', mapMouseButton(button));
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Mouse control error:', error);
  }
});

ipcMain.on('robot-keyboard-event', (_event, data = {}) => {
  if (!remoteControlEnabled) return;
  const { type, key, code } = data;
  const robotKey = toRobotKey(code, key);

  if (!robotKey) {
    console.log('Unmapped keyboard event:', data);
    return;
  }

  try {
    if (Math.random() < 0.05) {
      console.log('[robot] key', { type, key, code, robotKey });
    }
    if (type === 'keydown') {
      if (activeKeys.has(robotKey)) return;
      robot.keyToggle(robotKey, 'down');
      activeKeys.add(robotKey);
    } else if (type === 'keyup') {
      robot.keyToggle(robotKey, 'up');
      activeKeys.delete(robotKey);
    }
  } catch (error) {
    console.error('Keyboard control error:', error);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 750,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'SuperDesk Agent - Host'
  });

  // Load the agent interface
  mainWindow.loadFile('agent.html');

  // Open DevTools only in development mode (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Handle 'get-sources' request from the renderer process
  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    return sources;
  });

  createWindow();

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
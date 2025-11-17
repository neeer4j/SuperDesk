const { app, BrowserWindow, ipcMain, desktopCapturer, screen: electronScreen } = require('electron');
const path = require('path');
const { mouse, keyboard, screen, Button, Key } = require('@nut-tree-fork/nut-js');

// Enable @electron/remote
require('@electron/remote/main').initialize();

let mainWindow;

const REMOTE_REFERENCE_WIDTH = 1920;
const REMOTE_REFERENCE_HEIGHT = 1080;
let remoteControlEnabled = false;
let screenSize = { width: 1920, height: 1080 };
const activeKeys = new Set();


function refreshScreenSize() {
  try {
    // Use Electron's screen API to get the primary display size
    const primaryDisplay = electronScreen.getPrimaryDisplay();
    screenSize = primaryDisplay.size;
  } catch (error) {
    console.error('Failed to get screen size:', error);
  }
}

// Initialize screen size
app.whenReady().then(refreshScreenSize);


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

function mapNutButton(buttonIndex = 0) {
  if (buttonIndex === 2) return Button.RIGHT;
  if (buttonIndex === 1) return Button.MIDDLE;
  return Button.LEFT;
}

const KEY_CODE_MAP = {
  Backquote: Key.Grave,
  Minus: Key.Minus,
  Equal: Key.Equal,
  BracketLeft: Key.LeftBracket,
  BracketRight: Key.RightBracket,
  Backslash: Key.Backslash,
  Semicolon: Key.Semicolon,
  Quote: Key.Quote,
  Comma: Key.Comma,
  Period: Key.Period,
  Slash: Key.Slash,
  Space: Key.Space,
  Enter: Key.Enter,
  NumpadEnter: Key.Enter,
  Tab: Key.Tab,
  Backspace: Key.Backspace,
  Delete: Key.Delete,
  Escape: Key.Escape,
  CapsLock: Key.CapsLock,
  ArrowUp: Key.Up,
  ArrowDown: Key.Down,
  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  Home: Key.Home,
  End: Key.End,
  PageUp: Key.PageUp,
  PageDown: Key.PageDown,
  Insert: Key.Insert,
  ControlLeft: Key.LeftControl,
  ControlRight: Key.RightControl,
  ShiftLeft: Key.LeftShift,
  ShiftRight: Key.RightShift,
  AltLeft: Key.LeftAlt,
  AltRight: Key.RightAlt,
  MetaLeft: Key.LeftCmd,
  MetaRight: Key.RightCmd,
  Pause: Key.Pause,
  ScrollLock: Key.ScrollLock,
  PrintScreen: Key.Print
};

function toNutKey(code, key) {
  if (code && code.startsWith('Key')) {
    const letter = code.slice(3);
    return Key[letter];
  }
  if (code && code.startsWith('Digit')) {
    const num = code.slice(5);
    return Key[`Num${num}`];
  }
  if (code && code.startsWith('Numpad')) {
    const suffix = code.slice(6);
    if (/^[0-9]$/.test(suffix)) {
      return Key[`NumPad${suffix}`];
    }
    switch (suffix.toLowerCase()) {
      case 'add':
        return Key.Add;
      case 'subtract':
        return Key.Subtract;
      case 'multiply':
        return Key.Multiply;
      case 'divide':
        return Key.Divide;
      case 'decimal':
        return Key.Decimal;
      case 'enter':
        return Key.Enter;
      default:
        break;
    }
  }
  if (code && /^F([1-9]|1[0-2])$/.test(code)) {
    return Key[code];
  }
  if (code && KEY_CODE_MAP[code]) {
    return KEY_CODE_MAP[code];
  }
  if (key && KEY_CODE_MAP[key]) {
    return KEY_CODE_MAP[key];
  }
  if (key && key.length === 1) {
    const upper = key.toUpperCase();
    return Key[upper] || null;
  }
  return null;
}

async function releaseActiveKeys() {
  for (const nutKey of activeKeys) {
    try {
      await keyboard.releaseKey(nutKey);
    } catch (error) {
      console.error('Failed to release key:', nutKey, error);
    }
  }
  activeKeys.clear();
}

ipcMain.on('robot-refresh-screen-size', () => {
  console.log('[robot] refresh-screen-size requested');
  refreshScreenSize();
  console.log('[robot] screenSize now:', screenSize);
});

// Window control fallbacks (support preload or renderer IPC)
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    try { mainWindow.minimize(); } catch (e) { console.warn('Minimize failed:', e); }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    try { mainWindow.close(); } catch (e) { console.warn('Close failed:', e); }
  }
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

ipcMain.on('robot-mouse-event', async (_event, data = {}) => {
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
        await mouse.setPosition({ x: coords.x, y: coords.y });
        break;
      case 'mousedown':
        await mouse.setPosition({ x: coords.x, y: coords.y });
        await mouse.pressButton(mapNutButton(button));
        break;
      case 'mouseup':
        await mouse.setPosition({ x: coords.x, y: coords.y });
        await mouse.releaseButton(mapNutButton(button));
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Mouse control error:', error);
  }
});

ipcMain.on('robot-keyboard-event', async (_event, data = {}) => {
  if (!remoteControlEnabled) return;
  const { type, key, code } = data;
  const nutKey = toNutKey(code, key);

  if (!nutKey) {
    console.log('Unmapped keyboard event:', data);
    return;
  }

  try {
    if (Math.random() < 0.05) {
      console.log('[robot] key', { type, key, code, nutKey });
    }
    if (type === 'keydown') {
      if (activeKeys.has(nutKey)) return;
      await keyboard.pressKey(nutKey);
      activeKeys.add(nutKey);
    } else if (type === 'keyup') {
      await keyboard.releaseKey(nutKey);
      activeKeys.delete(nutKey);
    }
  } catch (error) {
    console.error('Keyboard control error:', error);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: false,
  backgroundColor: '#613da9',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // Preload provides a safe bridge for packaged apps where
      // require()/remote may not be available. It exposes `window.appControls`.
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'SuperDesk Agent'
  });

  // Enable @electron/remote for this window
  require('@electron/remote/main').enable(mainWindow.webContents);

  // Load the agent interface
  mainWindow.loadFile('agent.html');

  // Open DevTools only in development mode (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Force quit the app when the main window is closed
    app.quit();
    // As a last resort, forcefully exit the process
    process.exit(0);
  });
}

app.whenReady().then(() => {
  // Handle 'get-sources' request from the renderer process
  // Now supports optional sourceTypes parameter (default: ['screen'])
  ipcMain.handle('get-sources', async (event, sourceTypes = ['screen']) => {
    const sources = await desktopCapturer.getSources({
      types: Array.isArray(sourceTypes) ? sourceTypes : ['screen'],
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
    process.exit(0);
  }
});
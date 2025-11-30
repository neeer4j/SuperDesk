const { app, BrowserWindow, ipcMain, desktopCapturer, screen: electronScreen } = require('electron');
const path = require('path');
const { mouse, keyboard, screen, Button, Key } = require('@nut-tree-fork/nut-js');

// Configure nut-js for instant mouse movement (no animation)
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 10000; // Very fast movement

console.log('✅ nut-js modules loaded successfully');
console.log('   - mouse:', typeof mouse);
console.log('   - keyboard:', typeof keyboard);
console.log('   - screen:', typeof screen);
console.log('   - mouse speed configured:', mouse.config.mouseSpeed);

let mainWindow;

const REMOTE_REFERENCE_WIDTH = 1920;
const REMOTE_REFERENCE_HEIGHT = 1080;
let remoteControlEnabled = false;
let screenSize = { width: 1920, height: 1080 };
const activeKeys = new Set();


async function refreshScreenSize() {
  try {
    // Use nut-js's native screen API to get the ACTUAL screen resolution
    // that nut-js will use for mouse positioning.
    // This accounts for DPI scaling correctly!
    const nutWidth = await screen.width();
    const nutHeight = await screen.height();
    
    screenSize = { width: nutWidth, height: nutHeight };
    
    // Also log Electron's values for comparison
    const primaryDisplay = electronScreen.getPrimaryDisplay();
    console.log('[robot] Screen refresh - nut-js native size:', screenSize);
    console.log('[robot] Screen refresh - Electron logical size:', primaryDisplay.size);
    console.log('[robot] Screen refresh - Electron scaleFactor:', primaryDisplay.scaleFactor);
    console.log('[robot] Screen refresh - Electron bounds:', primaryDisplay.bounds);
  } catch (error) {
    console.error('Failed to get screen size:', error);
    // Fallback to Electron's size if nut-js fails
    const primaryDisplay = electronScreen.getPrimaryDisplay();
    screenSize = primaryDisplay.size;
  }
}

// Initialize screen size
app.whenReady().then(refreshScreenSize);


function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function translateCoordinates(x, y) {
  // Guest sends normalized coords (0..1), map directly to host's actual screen size
  // This makes it dynamic and works with any monitor size/resolution
  let normX = x ?? 0;
  let normY = y ?? 0;

  // Ensure coordinates are in normalized range (0-1)
  normX = clamp(normX, 0, 1);
  normY = clamp(normY, 0, 1);

  // Map normalized coordinates to screen pixels
  // 0.0 maps to 0, 1.0 maps to (screenSize - 1) to reach edges
  // Using Math.floor instead of round for more predictable edge behavior
  return {
    x: Math.floor(normX * (screenSize.width - 1)),
    y: Math.floor(normY * (screenSize.height - 1))
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

ipcMain.on('robot-refresh-screen-size', async () => {
  console.log('[robot] refresh-screen-size requested');
  await refreshScreenSize();
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

ipcMain.on('robot-set-enabled', async (_event, enabled) => {
  remoteControlEnabled = !!enabled;
  
  // Refresh screen size when enabling to ensure we have current dimensions
  if (remoteControlEnabled) {
    await refreshScreenSize();
  }
  
  console.log('[robot] 🎮 set-enabled:', remoteControlEnabled);
  console.log('[robot] Screen size:', screenSize);
  console.log('[robot] Reference resolution:', REMOTE_REFERENCE_WIDTH, 'x', REMOTE_REFERENCE_HEIGHT);
  
  if (!remoteControlEnabled) {
    releaseActiveKeys();
  }
});

ipcMain.on('robot-release-keys', () => {
  releaseActiveKeys();
});

ipcMain.on('robot-mouse-event', async (_event, data = {}) => {
  if (!remoteControlEnabled) {
    console.log('[robot] mouse event ignored - remote control not enabled');
    return;
  }
  const { type, x, y, button } = data;
  const coords = translateCoordinates(x, y);

  try {
    // Log every 50th event to avoid spam but still see what's happening
    if (Math.random() < 0.02 || x > 0.9 || y > 0.9) {
      console.log('[robot] mouse', { 
        type, 
        inputX: x,
        inputY: y,
        outputX: coords.x, 
        outputY: coords.y,
        screenW: screenSize.width,
        screenH: screenSize.height,
        pctX: ((coords.x / screenSize.width) * 100).toFixed(1) + '%',
        pctY: ((coords.y / screenSize.height) * 100).toFixed(1) + '%'
      });
    }
    switch (type) {
      case 'move':
      case 'mousemove':
        // Fire-and-forget for instant movement (no await = no latency)
        mouse.setPosition({ x: coords.x, y: coords.y }).catch(err => console.error('[robot] move error:', err));
        break;
      case 'down':
      case 'mousedown':
        mouse.setPosition({ x: coords.x, y: coords.y }).then(() => 
          mouse.pressButton(mapNutButton(button))
        ).catch(err => console.error('[robot] down error:', err));
        break;
      case 'up':
      case 'mouseup':
        mouse.setPosition({ x: coords.x, y: coords.y }).then(() => 
          mouse.releaseButton(mapNutButton(button))
        ).catch(err => console.error('[robot] up error:', err));
        break;
      case 'click':
        mouse.setPosition({ x: coords.x, y: coords.y }).then(() => 
          mouse.click(mapNutButton(button))
        ).catch(err => console.error('[robot] click error:', err));
        break;
      case 'scroll':
      case 'wheel':
        // Handle scroll/wheel events
        const { deltaX, deltaY } = data;
        // Move mouse to position first, then scroll
        // nut-js scroll: positive = scroll down, negative = scroll up
        // Browser wheel deltaY: positive = scroll down, negative = scroll up
        // So we can use deltaY directly (divided to get reasonable scroll amount)
        const scrollAmount = Math.round(deltaY / 30); // Normalize to reasonable scroll steps
        if (scrollAmount !== 0) {
          mouse.setPosition({ x: coords.x, y: coords.y }).then(() => 
            mouse.scrollDown(scrollAmount)
          ).catch(err => console.error('[robot] scroll error:', err));
        }
        // Handle horizontal scroll if needed
        if (deltaX && Math.abs(deltaX) > 10) {
          const hScrollAmount = Math.round(deltaX / 30);
          // Note: nut-js doesn't have native horizontal scroll, 
          // but we can try using scrollRight/scrollLeft if available
          console.log('[robot] Horizontal scroll requested:', hScrollAmount);
        }
        break;
      default:
        console.log('[robot] Unknown mouse event type:', type);
        break;
    }
  } catch (error) {
    console.error('Mouse control error:', error);
  }
});

ipcMain.on('robot-keyboard-event', async (_event, data = {}) => {
  if (!remoteControlEnabled) {
    console.log('[robot] keyboard event ignored - remote control not enabled');
    return;
  }
  const { type, key, code } = data;
  const nutKey = toNutKey(code, key);

  if (!nutKey) {
    console.log('[robot] ❌ Unmapped keyboard event:', data);
    return;
  }

  try {
    // Log more keyboard events to verify they're working
    if (Math.random() < 0.1) {
      console.log('[robot] ⌨️ key', { type, key, code, nutKey, activeKeysCount: activeKeys.size });
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

  // Grant permission for media access (required for getUserMedia with desktop sources)
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Allow media access
    } else {
      callback(false);
    }
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
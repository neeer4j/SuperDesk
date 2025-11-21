// Preload script: expose a safe appControls API to the renderer
// This avoids relying on require() or @electron/remote in packaged contexts.
const { ipcRenderer, desktopCapturer, screen } = require('electron');

try {
  // Expose a minimal global API that renderer can call as window.appControls
  // Using a direct assignment so it works even when contextIsolation is false.
  globalThis.appControls = {
    minimize: () => {
      try { ipcRenderer.send('window-minimize'); } catch (e) { console.warn('ipc send failed (minimize)', e); }
    },
    close: () => {
      try { ipcRenderer.send('window-close'); } catch (e) { console.warn('ipc send failed (close)', e); }
    },
    // Expose desktopCapturer for screen sharing
    // Try direct access first, fallback to IPC if in packaged app
    getDesktopSources: async (options) => {
      try {
        // Try direct access first (works in dev mode)
        if (desktopCapturer && typeof desktopCapturer.getSources === 'function') {
          return await desktopCapturer.getSources(options);
        }
      } catch (err) {
        console.warn('Direct desktopCapturer failed, trying IPC:', err);
      }
      
      // Fallback to IPC handler in main.js (works in packaged app)
      try {
        return await ipcRenderer.invoke('get-sources', options.types || ['screen']);
      } catch (err) {
        console.error('IPC getSources also failed:', err);
        throw new Error('Desktop capture not available: ' + err.message);
      }
    },
    // Expose screen for getting display info
    getScreen: () => {
      return screen;
    },
    // Expose IPC methods for remote control
    ipcSend: (channel, ...args) => {
      ipcRenderer.send(channel, ...args);
    },
    ipcInvoke: async (channel, ...args) => {
      return await ipcRenderer.invoke(channel, ...args);
    }
  };
} catch (e) {
  // If preload fails for any reason, leave appControls undefined and
  // renderer will gracefully fall back to no-op.
  console.warn('preload: failed to expose appControls', e);
}

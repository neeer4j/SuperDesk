// Preload script: expose a safe appControls API to the renderer
// This avoids relying on require() or @electron/remote in packaged contexts.
const { ipcRenderer } = require('electron');

try {
  // Expose a minimal global API that renderer can call as window.appControls
  // Using a direct assignment so it works even when contextIsolation is false.
  globalThis.appControls = {
    minimize: () => {
      try { ipcRenderer.send('window-minimize'); } catch (e) { console.warn('ipc send failed (minimize)', e); }
    },
    close: () => {
      try { ipcRenderer.send('window-close'); } catch (e) { console.warn('ipc send failed (close)', e); }
    }
  };
} catch (e) {
  // If preload fails for any reason, leave appControls undefined and
  // renderer will gracefully fall back to no-op.
  console.warn('preload: failed to expose appControls', e);
}

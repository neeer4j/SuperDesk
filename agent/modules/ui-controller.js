/**
 * UI Controller Module
 * Handles all UI state management and transitions
 */

class UIController {
  constructor() {
    this.welcomeScreen = null;
    this.mainScreen = null;
    this.sessionIdElement = null;
    this.statusElements = {};
  }

  init() {
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.mainScreen = document.getElementById('main-screen');
    this.sessionIdElement = document.getElementById('session-id');
    
    this.statusElements = {
      connection: document.getElementById('status-connection'),
      peer: document.getElementById('status-peer'),
      streaming: document.getElementById('status-streaming')
    };

    // Welcome screen button
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.showMainScreen());
    }
  }

  showMainScreen() {
    if (this.welcomeScreen) this.welcomeScreen.classList.add('hidden');
    if (this.mainScreen) this.mainScreen.classList.add('active');
  }

  showWelcomeScreen() {
    if (this.mainScreen) this.mainScreen.classList.remove('active');
    if (this.welcomeScreen) this.welcomeScreen.classList.remove('hidden');
  }

  setSessionId(sessionId) {
    if (this.sessionIdElement) {
      this.sessionIdElement.textContent = sessionId || 'Not Connected';
    }
  }

  updateStatus(type, value) {
    const element = this.statusElements[type];
    if (!element) return;

    if (typeof value === 'boolean') {
      const indicator = element.querySelector('.status-indicator');
      const textSpan = element.querySelector('.status-value');
      
      if (indicator) {
        indicator.className = value ? 'status-indicator connected' : 'status-indicator disconnected';
      }
      if (textSpan) {
        textSpan.textContent = value ? 'Connected' : 'Disconnected';
      }
    } else {
      const textSpan = element.querySelector('.status-value');
      if (textSpan) {
        textSpan.textContent = value;
      }
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification system - can be expanded
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Add toast/notification UI
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIController;
}

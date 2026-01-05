// Notification utility to replace blocking alert() calls
// Provides non-blocking, dismissible notifications

let notificationContainer = null;

const createNotificationContainer = () => {
  if (notificationContainer) return notificationContainer;
  
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  notificationContainer = container;
  return container;
};

const showNotification = (message, type = 'info', duration = 5000) => {
  const container = createNotificationContainer();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const colors = {
    success: { bg: '#2e7d32', border: '#4caf50' },
    error: { bg: '#c62828', border: '#ef5350' },
    warning: { bg: '#f57c00', border: '#ff9800' },
    info: { bg: '#1976d2', border: '#42a5f5' }
  };
  
  const color = colors[type] || colors.info;
  
  notification.style.cssText = `
    background: ${color.bg};
    color: white;
    padding: 16px 20px;
    margin-bottom: 10px;
    border-radius: 8px;
    border-left: 4px solid ${color.border};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    font-family: 'Roboto', 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.flex = '1';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
  closeBtn.onclick = () => removeNotification(notification);
  
  notification.appendChild(messageSpan);
  notification.appendChild(closeBtn);
  container.appendChild(notification);
  
  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => removeNotification(notification), duration);
  }
  
  return notification;
};

const removeNotification = (notification) => {
  if (!notification || !notification.parentNode) return;
  
  notification.style.animation = 'slideOut 0.3s ease-in';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
};

// Add animation styles
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

export const notify = {
  success: (message, duration) => showNotification(message, 'success', duration),
  error: (message, duration) => showNotification(message, 'error', duration),
  warning: (message, duration) => showNotification(message, 'warning', duration),
  info: (message, duration) => showNotification(message, 'info', duration)
};

export default notify;

import React, { useEffect, useRef, useState } from 'react';

// Themed button styles matching LandingPage
const buttonStyles = {
  primary: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
  },
  secondary: {
    padding: '10px 18px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  danger: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
  },
  success: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
  }
};

function RemoteDesktopView({ client, sessionId, hostPlatform, onClose }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [stream, setStream] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'info' | 'success' | 'error' }

  const isAndroid = hostPlatform === 'android';

  // Show toast notification
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    // Setup callbacks
    client.on('remoteStream', (remoteStream) => {
      console.log('Received remote stream');
      setStream(remoteStream);
      if (videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
      showToast('Stream connected successfully!', 'success');
    });

    client.on('connectionStateChange', (state) => {
      console.log('Connection state:', state);
      setConnectionState(state);
      if (state === 'connected') {
        showToast(isAndroid ? 'Connected to Android device' : 'Connected to remote desktop', 'success');
      } else if (state === 'disconnected' || state === 'failed') {
        showToast('Connection lost', 'error');
      }
    });

    client.on('sessionEnded', () => {
      console.log('Session ended by host');
      onClose();
    });

    // Cleanup
    return () => {
      if (remoteControlEnabled) {
        client.disableRemoteControl();
      }
    };
  }, [client, onClose, remoteControlEnabled, isAndroid]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    const videoContainer = document.getElementById('video-container');
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleRemoteControl = () => {
    if (!remoteControlEnabled) {
      client.enableRemoteControl();
      setRemoteControlEnabled(true);
      showToast('Remote control enabled', 'success');
    } else {
      client.disableRemoteControl();
      setRemoteControlEnabled(false);
      showToast('Remote control disabled', 'info');
    }
  };

  const handleMouseMove = (e) => {
    if (!remoteControlEnabled || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    client.sendMouseEvent('move', x, y);
  };

  const handleMouseDown = (e) => {
    if (!remoteControlEnabled) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    client.sendMouseEvent('down', x, y, e.button);
    e.preventDefault();
  };

  const handleMouseUp = (e) => {
    if (!remoteControlEnabled) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    client.sendMouseEvent('up', x, y, e.button);
    e.preventDefault();
  };

  const handleClick = (e) => {
    if (!remoteControlEnabled) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    client.sendMouseEvent('click', x, y, e.button);
    e.preventDefault();
  };

  const handleKeyDown = (e) => {
    if (!remoteControlEnabled) return;

    client.sendKeyboardEvent('down', e.key, e.code, {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey
    });

    e.preventDefault();
  };

  const handleKeyUp = (e) => {
    if (!remoteControlEnabled) return;

    client.sendKeyboardEvent('up', e.key, e.code, {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey
    });

    e.preventDefault();
  };

  const handleEndSession = () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      client.endSession();
      onClose();
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Preparing to send: ${file.name}`, 'info');
      // TODO: Integrate with actual file transfer service
      console.log('File selected for transfer:', file.name);
    }
  };

  // Toolbar content (shared between layouts)
  const ToolbarContent = ({ vertical = false }) => (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: '8px',
      padding: vertical ? '16px 12px' : '0'
    }}>
      {/* Session Info */}
      <div style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: vertical ? 'flex-start' : 'center',
        gap: vertical ? '8px' : '16px',
        marginBottom: vertical ? '16px' : '0',
        marginRight: vertical ? '0' : '16px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>
          {sessionId}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          opacity: 0.8
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connectionState === 'connected' ? '#10b981' :
              connectionState === 'connecting' ? '#fbbf24' : '#ef4444'
          }}></span>
          {connectionState === 'connected' ? (isAndroid ? 'Android' : 'Connected') :
            connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={toggleRemoteControl}
        style={remoteControlEnabled ? buttonStyles.success : buttonStyles.secondary}
      >
        🖱️ {remoteControlEnabled ? 'Control On' : 'Control'}
      </button>

      <button
        onClick={toggleFullscreen}
        style={buttonStyles.secondary}
      >
        {isFullscreen ? '↙️' : '↗️'} {vertical ? '' : (isFullscreen ? 'Exit' : 'Fullscreen')}
      </button>

      <button
        onClick={handleEndSession}
        style={buttonStyles.danger}
      >
        ✕ {vertical ? '' : 'End'}
      </button>
    </div>
  );

  return (
    <div
      id="video-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0d0d14',
        zIndex: 9999,
        display: 'flex',
        flexDirection: isAndroid ? 'row' : 'column'
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
    >
      {/* Toolbar - Left for Android, Top for Desktop */}
      <div style={{
        background: 'rgba(10, 10, 16, 0.95)',
        backdropFilter: 'blur(12px)',
        padding: isAndroid ? '0' : '12px 20px',
        display: 'flex',
        flexDirection: isAndroid ? 'column' : 'row',
        justifyContent: isAndroid ? 'flex-start' : 'space-between',
        alignItems: isAndroid ? 'stretch' : 'center',
        color: 'white',
        borderRight: isAndroid ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        borderBottom: isAndroid ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
        width: isAndroid ? '70px' : '100%',
        minWidth: isAndroid ? '70px' : 'auto'
      }}>
        <ToolbarContent vertical={isAndroid} />
      </div>

      {/* Video Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!stream && connectionState === 'connecting' && (
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite'
            }}>🔄</div>
            <div style={{ fontSize: '16px', opacity: 0.8 }}>
              {isAndroid ? 'Connecting to Android device...' : 'Connecting to remote desktop...'}
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            // Cursor visible for Android, hidden for PC when controlling
            cursor: (remoteControlEnabled && !isAndroid) ? 'none' : 'default'
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />

        {/* File Transfer Floating Button */}
        <button
          onClick={handleFileButtonClick}
          style={{
            position: 'absolute',
            right: '24px',
            bottom: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            zIndex: 10000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
          }}
          title="Send File"
        >
          📁
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      </div>

      {/* Status Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' :
            toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' :
              'rgba(139, 92, 246, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '12px 24px',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 10001,
          animation: 'fadeIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {/* Control Active Indicator */}
      {remoteControlEnabled && (
        <div style={{
          position: 'absolute',
          top: isAndroid ? '20px' : '80px',
          left: isAndroid ? '90px' : '20px',
          background: 'rgba(16, 185, 129, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '8px 16px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10000
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#fff',
            animation: 'pulse 1.5s ease infinite'
          }}></span>
          {isAndroid ? 'Controlling Android' : 'Remote Control Active'}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default RemoteDesktopView;

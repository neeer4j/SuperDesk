import React, { useEffect, useRef, useState } from 'react';

function RemoteDesktopView({ client, sessionId, onClose }) {
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    // Setup callbacks
    client.on('remoteStream', (remoteStream) => {
      console.log('Received remote stream');
      setStream(remoteStream);
      if (videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
    });

    client.on('connectionStateChange', (state) => {
      console.log('Connection state:', state);
      setConnectionState(state);
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
  }, [client, onClose, remoteControlEnabled]);

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
    } else {
      client.disableRemoteControl();
      setRemoteControlEnabled(false);
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

  return (
    <div
      id="video-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
    >
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            Session: {sessionId}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '12px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionState === 'connected' ? '#10b981' : 
                         connectionState === 'connecting' ? '#fbbf24' : '#ef4444'
            }}></span>
            {connectionState === 'connected' ? 'Connected' :
             connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleRemoteControl}
            style={{
              padding: '8px 16px',
              background: remoteControlEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {remoteControlEnabled ? '🖱️ Control Enabled' : '🖱️ Enable Control'}
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? '↙️ Exit Fullscreen' : '↗️ Fullscreen'}
          </button>

          <button
            onClick={handleEndSession}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            End Session
          </button>
        </div>
      </div>

      {/* Video */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000'
      }}>
        {!stream && connectionState === 'connecting' && (
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
            <div style={{ fontSize: '18px' }}>Connecting to remote desktop...</div>
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
            cursor: remoteControlEnabled ? 'none' : 'default'
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />
      </div>

      {/* Instructions */}
      {remoteControlEnabled && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '12px 24px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          border: '1px solid rgba(16, 185, 129, 0.5)'
        }}>
          Remote control is active - Your mouse and keyboard are controlling the host's computer
        </div>
      )}
    </div>
  );
}

export default RemoteDesktopView;

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import superdeskLogo from './assets/superdesk.png';

function LandingPage({ onGetStarted }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('share');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [sessionId] = useState(Math.random().toString(36).substring(2, 10).toUpperCase());
  
  const handleSendOTP = async () => {
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      alert('Check your email for the OTP code!');
      setOtpSent(true);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      alert('Please enter the OTP code');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (error) throw error;
    } catch (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOtpSent(false);
    setOtp('');
    setEmail('');
  };

  const handleJoinSession = () => {
    const sid = joinSessionId.trim().toUpperCase();
    if (!sid) {
      alert('Please enter a session ID');
      return;
    }
    alert(`Joining session ${sid}...\n\nThis will connect to the remote desktop.`);
  };

  const handleContinue = () => {
    setUser({ email: 'test@example.com', id: 'test-user' });
  };

  const handleStartShare = () => {
    alert(`Starting screen share with Session ID: ${sessionId}\n\nIn the full app, this would start capturing your screen.`);
  };

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      // Show temporary feedback
      const btn = document.getElementById('copy-session-btn');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy session ID');
    }
  };

  const handlePasteSessionId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJoinSessionId(text.trim().toUpperCase());
    } catch (err) {
      console.error('Failed to paste:', err);
      alert('Failed to paste from clipboard');
    }
  };

  const handleGoBack = () => {
    setActiveView('share');
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Authentication Screen
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw',
        overflow: 'hidden',
        background: '#613da9',
        margin: 0,
        padding: 0
      }}>
        {/* Left Panel - White with Logo */}
        <div style={{
          width: '30%',
          minWidth: '340px',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={superdeskLogo}
              alt="SuperDesk"
              style={{
                width: '100%',
                maxWidth: '300px',
                marginBottom: '40px',
                filter: 'drop-shadow(0 10px 40px rgba(0, 0, 0, 0.3))'
              }}
            />
            <div style={{
              fontSize: '24px',
              color: '#613da9',
              fontWeight: 300,
              lineHeight: 1.6,
              opacity: 0.9
            }}>
              Secure remote desktop sharing<br />for modern teams
            </div>
          </div>
        </div>

        {/* Right Panel - Authentication */}
        <div style={{
          flex: 1,
          background: '#613da9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: 'white'
        }}>
          <div style={{ maxWidth: '400px', width: '100%' }}>
            <h1 style={{
              fontWeight: 700,
              marginBottom: '12px',
              color: 'white',
              textAlign: 'center',
              fontSize: '32px',
              margin: '0 0 12px 0'
            }}>
              {otpSent ? 'Verify OTP' : 'Sign In'}
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '40px',
              textAlign: 'center',
              margin: '0 0 40px 0'
            }}>
              {otpSent 
                ? 'Enter the OTP code sent to your email'
                : 'Enter your email to receive an OTP code'
              }
            </p>

            {!otpSent ? (
              <>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSendOTP();
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '16px',
                    background: 'white',
                    color: '#09090b',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>

                <button
                  onClick={handleContinue}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#fbbf24',
                    border: '1px solid #fbbf24'
                  }}
                >
                  Continue Without Auth (Testing Only)
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleVerifyOTP();
                  }}
                  disabled={loading}
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '16px',
                    background: 'white',
                    color: '#09090b',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#fbbf24',
                    border: '1px solid #fbbf24'
                  }}
                >
                  Back to Email
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Screen (after login)
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden',
      background: '#613da9',
      margin: 0,
      padding: 0
    }}>
      {/* Left Sidebar - 30% */}
      <div style={{
        width: '30%',
        minWidth: '300px',
        background: '#FFFFFF',
        color: '#613da9',
        padding: '24px',
        borderRight: '1px solid rgba(97, 61, 169, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <img
            src={superdeskLogo}
            alt="SuperDesk"
            style={{
              width: '100%',
              maxWidth: '200px'
            }}
          />
        </div>

        {/* User Info */}
        <div style={{
          padding: '16px',
          background: 'rgba(97, 61, 169, 0.1)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '14px',
            opacity: 0.7,
            marginBottom: '4px',
            color: '#613da9'
          }}>
            Signed in as
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#613da9',
            wordBreak: 'break-all'
          }}>
            {user.email}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, marginBottom: '16px' }}>
          <button
            onClick={() => setActiveView('share')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '8px',
              background: activeView === 'share' ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
              color: '#613da9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: activeView === 'share' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '20px' }}>🖥️</span>
            Share Screen
          </button>

          <button
            onClick={() => setActiveView('join')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '8px',
              background: activeView === 'join' ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
              color: '#613da9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: activeView === 'join' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '20px' }}>🔗</span>
            Join Session
          </button>

          <button
            onClick={() => setActiveView('friends')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '8px',
              background: activeView === 'friends' ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
              color: '#613da9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: activeView === 'friends' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '20px' }}>👥</span>
            Friends
          </button>

          <button
            onClick={() => setActiveView('messages')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '8px',
              background: activeView === 'messages' ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
              color: '#613da9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: activeView === 'messages' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '20px' }}>💬</span>
            Messages
          </button>

          <button
            onClick={() => setActiveView('files')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '8px',
              background: activeView === 'files' ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
              color: '#613da9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: activeView === 'files' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '20px' }}>📁</span>
            File Transfer
          </button>
        </nav>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Right Content - 70% */}
      <div style={{
        flex: 1,
        padding: '40px',
        overflowY: 'auto',
        background: '#613da9',
        position: 'relative'
      }}>
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          style={{
            position: 'fixed',
            top: '50px',
            left: 'calc(30% + 16px)',
            width: '40px',
            height: '40px',
            background: 'white',
            border: '2px solid #613da9',
            borderRadius: '8px',
            color: '#613da9',
            fontSize: '20px',
            fontWeight: 600,
            cursor: 'pointer',
            display: activeView === 'share' ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(97, 61, 169, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#613da9';
            e.target.style.color = 'white';
            e.target.style.boxShadow = '0 4px 12px rgba(97, 61, 169, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#613da9';
            e.target.style.boxShadow = '0 2px 8px rgba(97, 61, 169, 0.15)';
          }}
        >
          &lt;
        </button>

        {/* Share Screen View */}
        {activeView === 'share' && (
          <div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '24px', 
              fontWeight: 700, 
              fontSize: '32px',
              margin: '0 0 24px 0'
            }}>
              Start a remote desktop session
            </h1>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '32px',
              marginBottom: '24px',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px'
              }}>
                Your Session ID
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 600,
                color: 'white',
                fontFamily: 'monospace',
                marginBottom: '24px',
                letterSpacing: '4px'
              }}>
                {sessionId}
              </div>

              {/* Copy Button */}
              <button
                id="copy-session-btn"
                onClick={handleCopySessionId}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                Copy
              </button>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '8px'
                  }}>
                    Connection
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981'
                    }}></span>
                    Ready
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '8px'
                  }}>
                    Session
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white'
                  }}>
                    Not Started
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartShare}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#09090b'
                }}
              >
                Start Sharing
              </button>
            </div>
          </div>
        )}

        {/* Join Session View */}
        {activeView === 'join' && (
          <div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '24px', 
              fontWeight: 700, 
              fontSize: '32px',
              margin: '0 0 24px 0'
            }}>
              Join a remote desktop session
            </h1>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '32px'
            }}>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px'
              }}>
                Session ID
              </div>
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Enter session ID (e.g. ABC123XY)"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{
                    width: '100%',
                    padding: '16px',
                    paddingRight: '80px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '2px'
                  }}
                />
                {/* Paste Button */}
                <button
                  onClick={handlePasteSessionId}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  Paste
                </button>
              </div>

              <button
                onClick={handleJoinSession}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#09090b'
                }}
              >
                Connect to Session
              </button>
            </div>
          </div>
        )}

        {/* Friends View */}
        {activeView === 'friends' && (
          <div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '24px', 
              fontWeight: 700, 
              fontSize: '32px',
              margin: '0 0 24px 0'
            }}>
              Friends
            </h1>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <div style={{ fontSize: '18px', color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                Friend system coming soon!
              </div>
            </div>
          </div>
        )}

        {/* Messages View */}
        {activeView === 'messages' && (
          <div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '24px', 
              fontWeight: 700, 
              fontSize: '32px',
              margin: '0 0 24px 0'
            }}>
              Messages
            </h1>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '18px', color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                Messaging system coming soon!
              </div>
            </div>
          </div>
        )}

        {/* File Transfer View */}
        {activeView === 'files' && (
          <div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '24px', 
              fontWeight: 700, 
              fontSize: '32px',
              margin: '0 0 24px 0'
            }}>
              File Transfer
            </h1>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <div style={{ fontSize: '18px', color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                File transfer (max 10MB) coming soon!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;

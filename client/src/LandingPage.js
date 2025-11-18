import React, { useState, useEffect } from 'react';
import { Box, Container, TextField, Button, Typography } from '@mui/material';
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
      <>
        {/* Top header bar - match desktop agent title bar */}
        <Box sx={{ height: 36, background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', px: 2, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: 0, opacity: 0.8 }}>SuperDesk Agent</Typography>
        </Box>

        {/* Use inline style here to defeat runtime-injected stylesheet rules */}
  <Box style={{ background: '#613da9', minHeight: '100vh', display: 'flex', paddingTop: 36 }}>
        {/* Left Panel - White with Logo */}
        <Box
          className="superdesk-left-panel"
          // inline style wins over runtime CSS rules injected by Emotion
          style={{ width: '44%', minWidth: '340px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', position: 'relative', overflow: 'hidden' }}
          sx={{
            '@media (max-width: 900px)': {
              display: 'none',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Box
              component="img"
              src={superdeskLogo}
              alt="SuperDesk"
              sx={{
                width: '100%',
                maxWidth: '180px',
                marginBottom: '18px',
                mt: 2
              }}
            />
            {/* Removed duplicate SuperDesk branding text */}
            <Typography
              sx={{
                fontSize: '20px',
                color: '#6C3FC5',
                fontWeight: 600,
                lineHeight: 1.4,
                mt: 2
              }}
            >
              Secure remote desktop sharing<br />for modern teams
            </Typography>
          </Box>
        </Box>

        {/* Right Panel - Authentication */}
        <Box className="superdesk-right-panel"
          style={{ flex: 1, background: '#6C3FC5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'white' }}
          sx={{}}
        >
          <Container maxWidth="sm">
            <Box sx={{
              padding: '0',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                marginBottom: '12px',
                color: 'white',
                textAlign: 'center',
                fontSize: 32
              }}>
                {otpSent ? 'Verify OTP' : 'Sign In'}
              </Typography>
              <Typography sx={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '40px',
                textAlign: 'center',
              }}>
                {otpSent 
                  ? 'Enter the OTP code sent to your email'
                  : 'Enter your email to receive an OTP code'
                }
              </Typography>

              {!otpSent ? (
                <>
                  {/* Email Input */}
                  <TextField
                    fullWidth
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSendOTP();
                    }}
                    disabled={loading}
                    sx={{
                      marginBottom: '12px',
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white',
                          background: 'rgba(255, 255, 255, 0.2)'
                        }
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'white',
                        padding: '13px 15px',
                        fontSize: '15px',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          opacity: 1
                        }
                      }
                    }}
                  />

                  {/* Send OTP Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSendOTP}
                    disabled={loading}
                    sx={{
                      background: 'white',
                      color: '#613da9',
                      padding: '12px 0',
                      fontSize: '15px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '7px',
                      marginBottom: '14px',
                      boxShadow: 'none',
                      '&:hover': {
                        background: '#f5f5f5',
                        boxShadow: 'none'
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: '#613da9',
                        opacity: 0.5
                      }
                    }}
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                  {/* Google Sign In Button removed */}

                  {/* Continue Button (Bypass for testing) */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleContinue}
                    sx={{
                      background: 'transparent',
                      color: 'white',
                      padding: '12px 0',
                      fontSize: '15px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '7px',
                      border: '2px solid white',
                      marginBottom: '14px',
                      boxShadow: 'none',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderColor: 'white'
                      }
                    }}
                  >
                    Continue Without Auth (Testing Only)
                  </Button>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <TextField
                    fullWidth
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleVerifyOTP();
                    }}
                    disabled={loading}
                    inputProps={{ maxLength: 6 }}
                    sx={{
                      marginBottom: '12px',
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '7px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white',
                          background: 'rgba(255, 255, 255, 0.2)'
                        }
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'white',
                        padding: '13px 15px',
                        fontSize: '15px',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          opacity: 1
                        }
                      }
                    }}
                  />

                  {/* Verify Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    sx={{
                      background: 'white',
                      color: '#613da9',
                      padding: '12px 0',
                      fontSize: '15px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '7px',
                      marginBottom: '14px',
                      boxShadow: 'none',
                      '&:hover': {
                        background: '#f5f5f5',
                        boxShadow: 'none'
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: '#613da9',
                        opacity: 0.5
                      }
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>

                  {/* Back Button */}
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      padding: '12px 0',
                      fontSize: '15px',
                      fontWeight: 600,
                      textTransform: 'none',
                      background: 'transparent',
                      boxShadow: 'none',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'white'
                      }
                    }}
                  >
                    Back to Email
                  </Button>
                </>
              )}

              {/* Terms */}
              <Typography sx={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                marginTop: '24px',
                lineHeight: 1.6
              }}>
                By continuing, you agree to our{' '}
                <Box component="span" sx={{
                  color: '#fff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { color: '#ffb300' }
                }}>
                  Terms of Service
                </Box>
                {' '}and{' '}
                <Box component="span" sx={{
                  color: '#fff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { color: '#ffb300' }
                }}>
                  Privacy Policy
                </Box>
                .
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
    );
  }

  // Dashboard Screen (After Authentication)
  return (
    <>
      {/* Top header bar - NO close/minimize buttons for web */}
      <Box sx={{ height: 36, background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', px: 2, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: 0, opacity: 0.8 }}>SuperDesk Agent</Typography>
      </Box>

      {/* Dashboard Container - flex layout matching Electron */}
      <Box sx={{ display: 'flex', height: '100vh', paddingTop: '36px', background: '#613da9' }}>
        {/* Left Sidebar - 30% */}
        <Box sx={{
          width: '30%',
          background: '#FFFFFF',
          color: '#613da9',
          padding: '24px',
          borderRight: '1px solid rgba(97, 61, 169, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Logo */}
          <Box sx={{ marginBottom: '40px', textAlign: 'center' }}>
            <Box
              component="img"
              src={superdeskLogo}
              alt="SuperDesk"
              sx={{ width: '100%', maxWidth: '200px' }}
            />
          </Box>
          {/* User Info */}
          <Box sx={{
            padding: '16px',
            background: 'rgba(97, 61, 169, 0.1)',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <Typography sx={{ fontSize: 14, opacity: 0.7, marginBottom: '4px', color: '#613da9' }}>
              Signed in as
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#613da9' }}>
              {user.email}
            </Typography>
          </Box>
          {/* Navigation Menu */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '16px' }}>
            {[
              { id: 'share', icon: '🖥️', label: 'Share Screen' },
              { id: 'join', icon: '🔗', label: 'Join Session' },
              { id: 'friends', icon: '👥', label: 'Friends' },
              { id: 'messages', icon: '💬', label: 'Messages' },
              { id: 'files', icon: '📁', label: 'File Transfer' }
            ].map((item) => (
              <Button
                key={item.id}
                fullWidth
                onClick={() => setActiveView(item.id)}
                sx={{
                  justifyContent: 'flex-start',
                  padding: '16px',
                  marginBottom: '8px',
                  color: '#613da9',
                  background: activeView === item.id ? 'rgba(97, 61, 169, 0.15)' : 'transparent',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: activeView === item.id ? 600 : 400,
                  '&:hover': {
                    background: 'rgba(97, 61, 169, 0.1)'
                  }
                }}
              >
                <Box component="span" sx={{ marginRight: '12px', fontSize: '20px' }}>
                  {item.icon}
                </Box>
                <Box component="span">{item.label}</Box>
              </Button>
            ))}
          </Box>
          {/* Sign Out Button */}
          <Button
            fullWidth
            onClick={handleSignOut}
            sx={{
              padding: '12px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': {
                background: 'rgba(239, 68, 68, 0.2)'
              }
            }}
          >
            Sign Out
          </Button>
        </Box>

        {/* Right Content Area - 70% */}
        <Box sx={{
          flex: 1,
          padding: '40px',
          overflowY: 'auto'
        }}>
        {/* Share Screen View */}
        {activeView === 'share' && (
          <Box>
            <Typography variant="h1" sx={{ marginBottom: '24px', fontWeight: 700, fontSize: 32, color: '#fff' }}>
              Share Your Screen
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography sx={{ fontSize: 16, marginBottom: '24px', opacity: 0.8 }}>
                Start a remote desktop session
              </Typography>
              <Box sx={{ marginBottom: '24px' }}>
                <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Session ID
                </Typography>
                <Box sx={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: '16px'
                }}>
                  {sessionId}
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
                    Connection
                  </Typography>
                  <Box sx={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span>Ready</span>
                  </Box>
                </Box>
                <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
                    Session
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    Not Started
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={onGetStarted}
                sx={{
                  background: '#fff',
                  color: '#09090b',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              >
                Start Sharing
              </Button>
            </Box>
          </Box>
        )}

        {/* Join Session View */}
        {activeView === 'join' && (
          <Box>
            <Typography variant="h1" sx={{ marginBottom: '24px', fontWeight: 700, fontSize: 32, color: '#fff' }}>
              Join Session
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography sx={{ fontSize: 16, marginBottom: '24px', opacity: 0.8 }}>
                Enter a session ID to connect to a remote desktop
              </Typography>
              <Box sx={{ marginBottom: '24px' }}>
                <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Session ID
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter session ID (e.g. ABC123XY)"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  inputProps={{ 
                    maxLength: 8,
                    style: {
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      fontSize: 18,
                      fontWeight: 600,
                      padding: '16px',
                      color: 'white'
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    },
                    '& .MuiOutlinedInput-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.4)',
                        opacity: 1
                      }
                    }
                  }}
                />
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={handleJoinSession}
                sx={{
                  background: '#fff',
                  color: '#09090b',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              >
                Connect to Session
              </Button>
            </Box>
          </Box>
        )}

        {/* Friends View */}
        {activeView === 'friends' && (
          <Box>
            <Typography variant="h1" sx={{ marginBottom: '24px', fontWeight: 700, fontSize: 32, color: '#fff' }}>
              Friends
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>👥</Typography>
              <Typography sx={{ fontSize: 18, color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                Friend system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* Messages View */}
        {activeView === 'messages' && (
          <Box>
            <Typography variant="h1" sx={{ marginBottom: '24px', fontWeight: 700, fontSize: 32, color: '#fff' }}>
              Messages
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>💬</Typography>
              <Typography sx={{ fontSize: 18, color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                Messaging system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* File Transfer View */}
        {activeView === 'files' && (
          <Box>
            <Typography variant="h1" sx={{ marginBottom: '24px', fontWeight: 700, fontSize: 32, color: '#fff' }}>
              File Transfer
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>📁</Typography>
              <Typography sx={{ fontSize: 18, color: '#fff', fontWeight: 400, opacity: 0.6 }}>
                File transfer (max 10MB) coming soon!
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
    </>
  );
}

export default LandingPage;

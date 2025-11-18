  // Google sign-in removed. Only OTP authentication is allowed.
  // Another test comment to force git change
  // Test change for git push troubleshooting
import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, TextField, Button, Typography, Tabs, Tab } from '@mui/material';
import { supabase } from './supabaseClient';
import superdeskLogo from './assets/superdesk.png';
import io from 'socket.io-client';
import config, { fetchIceServers } from './config';

function LandingPage({ onGetStarted }) {
  console.log('LandingPage rendered');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('share'); // share, friends, messages, files
  const [joinSessionId, setJoinSessionId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(''); // 'connecting', 'connected', 'error'

  // Placeholder implementations for missing handlers
  const handleSendOTP = () => {
    // TODO: Implement OTP sending logic
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOTP = () => {
    // TODO: Implement OTP verification logic
    setUser({ email, id: 'verified-user' });
    setLoading(false);
  };

  const handleSignOut = () => {
    // TODO: Implement sign out logic
    setUser(null);
    setOtpSent(false);
    setOtp('');
    setEmail('');
  };

  const handleJoinSession = () => {
    // TODO: Implement join session logic
    setConnectionStatus('connected');
  };

  const handleContinue = () => {
    // Bypass authentication for testing
    setUser({ email: 'test@example.com', id: 'test-user' });
  };

  // Authentication Screen
  if (!user) {
    return (
      <>
        {/* Top header bar - match desktop agent title bar */}
        <Box sx={{ height: 36, background: '#2d2046', color: '#fff', display: 'flex', alignItems: 'center', px: 2, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>SuperDesk Agent</Typography>
        </Box>

        {/* Use inline style here to defeat runtime-injected stylesheet rules */}
  <Box style={{ background: '#6C3FC5', minHeight: '100vh', display: 'flex', paddingTop: 36 }}>
        {/* Left Panel - White with Logo */}
        <Box
          className="superdesk-left-panel"
          // inline style wins over runtime CSS rules injected by Emotion
          style={{ width: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 0 0 0', position: 'relative', overflow: 'hidden' }}
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
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '48px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                marginBottom: '8px',
                color: 'white',
                textAlign: 'center',
                fontSize: 36
              }}>
                {otpSent ? 'Verify OTP' : 'Sign In'}
              </Typography>
              <Typography sx={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '32px',
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
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.1)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white'
                        }
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'white',
                        padding: '14px 16px',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.4)',
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
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)'
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: '#613da9'
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
                      color: '#ffb300',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      border: '2px solid #ffb300',
                      marginTop: '10px',
                      '&:hover': {
                        background: 'rgba(255, 179, 0, 0.08)',
                        borderColor: '#ffb300',
                        color: '#fff'
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
                    sx={{
                      marginBottom: '12px',
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white'
                        }
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'white',
                        padding: '14px 16px',
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
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.95)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)'
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: '#613da9'
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
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'none',
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
      {/* Top header bar - match desktop agent title bar */}
      <Box sx={{ height: 36, background: '#2d2046', color: '#fff', display: 'flex', alignItems: 'center', px: 2, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>SuperDesk Agent</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box component="span" sx={{ opacity: 0.6, fontSize: 18 }}>—</Box>
          <Box component="span" sx={{ opacity: 0.6, fontSize: 18, ml: 2 }}>✕</Box>
        </Box>
      </Box>

      {/* inline style to avoid runtime-injected dark backgrounds */}
  <Box style={{ display: 'flex', height: '100vh', minHeight: '100vh', background: '#7B4EDB', color: 'white', paddingTop: 36, overflow: 'hidden' }}>
        {/* Left Sidebar - Navigation (30%) */}
        <Box sx={{
          width: '32vw',
          minWidth: 340,
          maxWidth: 480,
          background: '#fff',
          color: '#6C3FC5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: 0,
          borderRight: 'none',
          height: '100vh',
          boxSizing: 'border-box',
        }}>
          {/* Logo */}
          <Box sx={{ mt: 3, mb: 3, textAlign: 'center' }}>
            <Box
              component="img"
              src={superdeskLogo}
              alt="SuperDesk"
              sx={{ width: '120px', mb: 1 }}
            />
          </Box>
          {/* User Info */}
          <Box sx={{
            background: '#f3eaff',
            borderRadius: '10px',
            margin: '0 24px 18px 24px',
            padding: '18px 16px',
            color: '#6C3FC5',
            fontWeight: 500,
            fontSize: 15,
            boxShadow: '0 1px 4px 0 rgba(108,63,197,0.04)'
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, opacity: 0.7, mb: 0.5 }}>Signed in as</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{user.email}</Typography>
          </Box>
          {/* Navigation Menu */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'stretch', justifyContent: 'flex-start', px: 2 }}>
            {[
              { id: 'share', icon: <span style={{color:'#6C3FC5',fontSize:22,verticalAlign:'middle'}}>🖥️</span>, label: 'Share Screen' },
              { id: 'join', icon: <span style={{color:'#bca6e7',fontSize:22,verticalAlign:'middle'}}>🔗</span>, label: 'Join Session' },
              { id: 'friends', icon: <span style={{color:'#bca6e7',fontSize:22,verticalAlign:'middle'}}>👥</span>, label: 'Friends' },
              { id: 'messages', icon: <span style={{color:'#bca6e7',fontSize:22,verticalAlign:'middle'}}>💬</span>, label: 'Messages' },
              { id: 'files', icon: <span style={{color:'#bca6e7',fontSize:22,verticalAlign:'middle'}}>📁</span>, label: 'File Transfer' }
            ].map((item) => (
              <Button
                key={item.id}
                fullWidth
                onClick={() => setActiveView(item.id)}
                sx={{
                  justifyContent: 'flex-start',
                  padding: '18px 18px',
                  marginBottom: '6px',
                  color: activeView === item.id ? '#6C3FC5' : '#bca6e7',
                  background: activeView === item.id ? '#f3eaff' : 'transparent',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: activeView === item.id ? 700 : 500,
                  boxShadow: activeView === item.id ? '0 1px 4px 0 rgba(108,63,197,0.04)' : 'none',
                  transition: 'background 0.2s, color 0.2s',
                  '&:hover': {
                    background: '#f3eaff',
                    color: '#6C3FC5',
                  }
                }}
              >
                <Box component="span" sx={{ marginRight: '14px', fontSize: '22px', display: 'inline-flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                <Box component="span">{item.label}</Box>
              </Button>
            ))}
          </Box>
          {/* Sign Out Button */}
          <Box sx={{ mt: 'auto', mb: 3, px: 2 }}>
            <Button
              fullWidth
              onClick={handleSignOut}
              sx={{
                padding: '14px',
                color: '#ef4444',
                background: '#fff0f0',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 16,
                '&:hover': {
                  background: '#ffeaea',
                }
              }}
            >
              Sign Out
            </Button>
          </Box>
        </Box>

      {/* Right Content Area (70%) */}
      <Box sx={{
        flex: 1,
        padding: 0,
        background: '#7B4EDB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Share Screen View */}
        {activeView === 'share' && (
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 40, color: '#fff', textAlign: 'left', width: '100%' }}>
              Share Your Screen
            </Typography>
            <Box sx={{
              background: '#7B4EDB',
              padding: '36px 32px',
              borderRadius: '18px',
              border: 'none',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 18, marginBottom: '24px', color: '#fff', fontWeight: 600, textAlign: 'left', width: '100%' }}>
                Start a remote desktop session
              </Typography>
              <Box sx={{ marginBottom: '24px', width: '100%' }}>
                <Typography sx={{ fontSize: 15, marginBottom: '8px', color: '#e0d7fa', fontWeight: 500, textAlign: 'left' }}>
                  Session ID
                </Typography>
                <Box sx={{
                  padding: '14px',
                  background: '#7B4EDB',
                  borderRadius: '8px',
                  border: 'none',
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: 2,
                  width: 340,
                  textAlign: 'left',
                  mb: 2
                }}>
                  21Z7568T
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: '24px', mb: 4, width: '100%' }}>
                <Box sx={{ flex: 1, background: '#7B4EDB', borderRadius: '10px', padding: '24px 0', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 18, border: 'none', boxShadow: 'none' }}>
                  <Typography sx={{ fontSize: 15, color: '#e0d7fa', fontWeight: 500, mb: 1 }}>Connection</Typography>
                  <Typography sx={{ fontSize: 18, color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', background: '#6fff8f', display: 'inline-block', mr: 1 }} />
                    Ready
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, background: '#7B4EDB', borderRadius: '10px', padding: '24px 0', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 18, border: 'none', boxShadow: 'none' }}>
                  <Typography sx={{ fontSize: 15, color: '#e0d7fa', fontWeight: 500, mb: 1 }}>Session</Typography>
                  <Typography sx={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>Not Started</Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={onGetStarted}
                sx={{
                  background: '#fff',
                  color: '#7B4EDB',
                  padding: '16px',
                  fontSize: 18,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  boxShadow: 'none',
                  border: 'none',
                  '&:hover': {
                    background: '#f3eaff',
                    color: '#7B4EDB',
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
          <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 40, color: '#fff', textAlign: 'left', ml: 2 }}>
              Join Session
            </Typography>
            <Box sx={{
              background: '#7B4EDB',
              padding: '36px 32px 36px 32px',
              borderRadius: '18px',
              border: '1.5px solid #bca6e7',
              maxWidth: 900,
              margin: '0 auto',
              boxShadow: '0 2px 16px 0 rgba(108,63,197,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <Typography sx={{ fontSize: 18, marginBottom: '24px', color: '#fff', fontWeight: 600, textAlign: 'left', width: '100%' }}>
                Enter a session ID to connect to a remote desktop
              </Typography>
              <Box sx={{ marginBottom: '24px', width: '100%' }}>
                <Typography sx={{ fontSize: 15, marginBottom: '8px', color: '#e0d7fa', fontWeight: 500, textAlign: 'left' }}>
                  Session ID
                </Typography>
                <input
                  type="text"
                  placeholder="Enter session ID (e.g. ABC123XY)"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  style={{
                    width: 340,
                    padding: '14px',
                    background: '#7B4EDB',
                    border: '1.5px solid #bca6e7',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    outline: 'none',
                    marginBottom: 0,
                    letterSpacing: 2
                  }}
                  maxLength={8}
                />
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={handleJoinSession}
                disabled={connectionStatus === 'connecting'}
                sx={{
                  background: '#fff',
                  color: '#7B4EDB',
                  padding: '16px',
                  fontSize: 18,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  boxShadow: 'none',
                  border: 'none',
                  margin: '24px 0 0 0',
                  '&:hover': {
                    background: '#f3eaff',
                    color: '#7B4EDB',
                  },
                  '&:disabled': {
                    background: '#e0d7fa',
                    color: '#bca6e7',
                  }
                }}
              >
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Join Session'}
              </Button>
              {/* Connection Status */}
              {connectionStatus && (
                <Box sx={{ margin: '24px 0 0 0', textAlign: 'center', width: '100%' }}>
                  {connectionStatus === 'connecting' && (
                    <Typography sx={{ color: '#fbbf24', fontSize: '15px', fontWeight: 600 }}>
                      🔄 Connecting to session...
                    </Typography>
                  )}
                  {connectionStatus === 'connected' && (
                    <Typography sx={{ color: '#6fff8f', fontSize: '15px', fontWeight: 600 }}>
                      ✅ Connected! Waiting for remote stream...
                    </Typography>
                  )}
                  {connectionStatus === 'error' && (
                    <Typography sx={{ color: '#ef4444', fontSize: '15px', fontWeight: 600 }}>
                      ❌ Connection failed. Please check the session ID and try again.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Friends View */}
        {activeView === 'friends' && (
          <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 40, color: '#fff', textAlign: 'left', ml: 2 }}>
              Friends
            </Typography>
            <Box sx={{
              background: '#7B4EDB',
              padding: '36px 32px',
              borderRadius: '18px',
              border: '1.5px solid #bca6e7',
              maxWidth: 900,
              margin: '0 auto',
              boxShadow: '0 2px 16px 0 rgba(108,63,197,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>👥</Typography>
              <Typography sx={{ fontSize: 20, color: '#fff', fontWeight: 600, opacity: 0.8 }}>
                Friend system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* Messages View */}
        {activeView === 'messages' && (
          <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 40, color: '#fff', textAlign: 'left', ml: 2 }}>
              Messages
            </Typography>
            <Box sx={{
              background: '#7B4EDB',
              padding: '36px 32px',
              borderRadius: '18px',
              border: '1.5px solid #bca6e7',
              maxWidth: 900,
              margin: '0 auto',
              boxShadow: '0 2px 16px 0 rgba(108,63,197,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>💬</Typography>
              <Typography sx={{ fontSize: 20, color: '#fff', fontWeight: 600, opacity: 0.8 }}>
                Messaging system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* File Transfer View */}
        {activeView === 'files' && (
          <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 40, color: '#fff', textAlign: 'left', ml: 2 }}>
              File Transfer
            </Typography>
            <Box sx={{
              background: '#7B4EDB',
              padding: '36px 32px',
              borderRadius: '18px',
              border: '1.5px solid #bca6e7',
              maxWidth: 900,
              margin: '0 auto',
              boxShadow: '0 2px 16px 0 rgba(108,63,197,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>📁</Typography>
              <Typography sx={{ fontSize: 20, color: '#fff', fontWeight: 600, opacity: 0.8 }}>
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

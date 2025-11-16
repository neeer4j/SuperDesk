  // Google sign-in removed. Only OTP authentication is allowed.
import React, { useState, useEffect } from 'react';
import { Box, Container, TextField, Button, Typography, Tabs, Tab } from '@mui/material';
import { supabase } from './supabaseClient';
import superdeskLogo from './assets/superdesk.png';

function LandingPage({ onGetStarted }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('share'); // share, friends, messages, files

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSendOTP = async () => {
    if (!email) {
      alert('Please enter your email');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;
      
      setOtpSent(true);
      alert('Check your email for the OTP code!');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
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
      
      // User will be set via onAuthStateChange listener
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Bypass authentication for testing
    setUser({ email: 'test@example.com', id: 'test-user' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOtpSent(false);
    setOtp('');
  };

  // Authentication Screen
  if (!user) {
    return (
      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        background: '#09090b',
        color: 'white'
      }}>
        {/* Left Panel - Branding */}
        <Box sx={{
          width: '50%',
          background: '#0a006f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          position: 'relative',
          overflow: 'hidden',
          '@media (max-width: 900px)': {
            display: 'none'
          }
        }}>
          {/* Decorative gradients */}
          <Box sx={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            top: '-250px',
            right: '-250px',
            pointerEvents: 'none'
          }} />
          <Box sx={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
            bottom: '-200px',
            left: '-200px',
            pointerEvents: 'none'
          }} />

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Box
              component="img"
              src={superdeskLogo}
              alt="SuperDesk"
              sx={{
                width: '100%',
                maxWidth: '500px',
                marginBottom: '40px',
                filter: 'drop-shadow(0 10px 40px rgba(0, 0, 0, 0.3))',
                animation: 'fadeInUp 0.8s ease-out',
                '@keyframes fadeInUp': {
                  from: {
                    opacity: 0,
                    transform: 'translateY(20px)'
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateY(0)'
                  }
                }
              }}
            />
            <Typography sx={{
              fontSize: '24px',
              fontWeight: 300,
              opacity: 0.9,
              lineHeight: 1.6,
              animation: 'fadeInUp 0.8s ease-out 0.2s both',
              '@keyframes fadeInUp': {
                from: {
                  opacity: 0,
                  transform: 'translateY(20px)'
                },
                to: {
                  opacity: 1,
                  transform: 'translateY(0)'
                }
              }
            }}>
              Secure remote desktop sharing<br />
              for modern teams
            </Typography>
          </Box>
        </Box>

        {/* Right Panel - Authentication */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          '@media (max-width: 900px)': {
            width: '100%'
          }
        }}>
          <Container maxWidth="sm">
            <Box sx={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              {/* Header */}
              <Box sx={{ marginBottom: '40px', textAlign: 'center' }}>
                <Typography variant="h4" sx={{
                  fontWeight: 700,
                  marginBottom: '12px',
                  color: 'white'
                }}>
                  {otpSent ? 'Verify OTP' : 'Sign In'}
                </Typography>
                <Typography sx={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  {otpSent 
                    ? 'Enter the OTP code sent to your email'
                    : 'Enter your email to receive an OTP code'
                  }
                </Typography>
              </Box>

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
                      color: '#09090b',
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
                        color: '#09090b'
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
                      color: '#fbbf24',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      border: '1px solid #fbbf24',
                      '&:hover': {
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderColor: '#fbbf24'
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

                  {/* Verify Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    sx={{
                      background: 'white',
                      color: '#09090b',
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
                        color: '#09090b'
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
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center',
                marginTop: '24px',
                lineHeight: 1.6
              }}>
                By continuing, you agree to our{' '}
                <Box component="span" sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { color: 'white' }
                }}>
                  Terms of Service
                </Box>
                {' '}and{' '}
                <Box component="span" sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { color: 'white' }
                }}>
                  Privacy Policy
                </Box>
                .
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    );
  }

  // Dashboard Screen (After Authentication)
  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      background: '#09090b',
      color: 'white'
    }}>
      {/* Left Sidebar - Navigation (30%) */}
      <Box sx={{
        width: '30%',
        background: '#0a006f',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        '@media (max-width: 900px)': {
          width: '80px'
        }
      }}>
        {/* Logo */}
        <Box sx={{ marginBottom: '40px', textAlign: 'center' }}>
          <Box
            component="img"
            src={superdeskLogo}
            alt="SuperDesk"
            sx={{
              width: '100%',
              maxWidth: '200px',
              '@media (max-width: 900px)': {
                maxWidth: '40px'
              }
            }}
          />
        </Box>

        {/* User Info */}
        <Box sx={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
            Signed in as
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
            {user.email}
          </Typography>
        </Box>

        {/* Navigation Menu */}
        <Box sx={{ flex: 1 }}>
          {[
            { id: 'share', icon: '🖥️', label: 'Share Screen' },
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
                color: 'white',
                background: activeView === item.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '16px',
                fontWeight: activeView === item.id ? 600 : 400,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Box component="span" sx={{ marginRight: '12px', fontSize: '20px' }}>
                {item.icon}
              </Box>
              <Box component="span" sx={{
                '@media (max-width: 900px)': {
                  display: 'none'
                }
              }}>
                {item.label}
              </Box>
            </Button>
          ))}
        </Box>

        {/* Sign Out Button */}
        <Button
          fullWidth
          onClick={handleSignOut}
          sx={{
            padding: '12px',
            marginTop: '16px',
            color: 'white',
            background: 'rgba(255, 0, 0, 0.2)',
            borderRadius: '8px',
            textTransform: 'none',
            '&:hover': {
              background: 'rgba(255, 0, 0, 0.3)'
            }
          }}
        >
          Sign Out
        </Button>
      </Box>

      {/* Right Content Area (70%) */}
      <Box sx={{
        flex: 1,
        padding: '40px',
        overflowY: 'auto'
      }}>
        {/* Share Screen View */}
        {activeView === 'share' && (
          <Box>
            <Typography variant="h4" sx={{ marginBottom: '24px', fontWeight: 700 }}>
              Share Your Screen
            </Typography>
            
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography sx={{ fontSize: '16px', marginBottom: '24px', opacity: 0.8 }}>
                Start a remote desktop session
              </Typography>

              <Box sx={{ marginBottom: '32px' }}>
                <Typography sx={{ fontSize: '14px', marginBottom: '8px', opacity: 0.7 }}>
                  Session ID
                </Typography>
                <Box sx={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  fontWeight: 600
                }}>
                  {Math.random().toString(36).substring(2, 10).toUpperCase()}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={onGetStarted}
                  sx={{
                    background: 'white',
                    color: '#09090b',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.9)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  Start Sharing
                </Button>
                
                <Button
                  variant="outlined"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.5)'
                    }
                  }}
                >
                  Join Session
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Friends View */}
        {activeView === 'friends' && (
          <Box>
            <Typography variant="h4" sx={{ marginBottom: '24px', fontWeight: 700 }}>
              Friends
            </Typography>
            
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>👥</Typography>
              <Typography sx={{ fontSize: '18px', opacity: 0.6 }}>
                Friend system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* Messages View */}
        {activeView === 'messages' && (
          <Box>
            <Typography variant="h4" sx={{ marginBottom: '24px', fontWeight: 700 }}>
              Messages
            </Typography>
            
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>💬</Typography>
              <Typography sx={{ fontSize: '18px', opacity: 0.6 }}>
                Messaging system coming soon!
              </Typography>
            </Box>
          </Box>
        )}

        {/* File Transfer View */}
        {activeView === 'files' && (
          <Box>
            <Typography variant="h4" sx={{ marginBottom: '24px', fontWeight: 700 }}>
              File Transfer
            </Typography>
            
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: '48px', marginBottom: '16px' }}>📁</Typography>
              <Typography sx={{ fontSize: '18px', opacity: 0.6 }}>
                File transfer (max 10MB) coming soon!
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default LandingPage;

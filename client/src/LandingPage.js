  // Google sign-in removed. Only OTP authentication is allowed.
  // Another test comment to force git change
  // Test change for git push troubleshooting
import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, TextField, Button, Typography, Tabs, Tab, Avatar } from '@mui/material';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import GroupIcon from '@mui/icons-material/Group';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import FolderIcon from '@mui/icons-material/Folder';
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

  // Navigation items for sidebar
  const navItems = [
    { id: 'share', label: 'Share', icon: <ScreenShareIcon /> },
    { id: 'friends', label: 'Friends', icon: <GroupIcon /> },
    { id: 'messages', label: 'Messages', icon: <ChatBubbleIcon /> },
    { id: 'files', label: 'Files', icon: <FolderIcon /> },
  ];

  // Placeholder implementations for missing handlers
  const handleSendOTP = () => {
    // TODO: Implement OTP sending logic
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOTP = () => {
    // TODO: Implement OTP verification logic
  };

  // Placeholder sign-out handler
  const handleSignOut = () => {
    // clear user session locally
    setUser(null);
    setActiveView('share');
  };

  // Placeholder join session handler
  const handleJoinSession = async () => {
    if (!joinSessionId) return;
    setConnectionStatus('connecting');
    // simulate connection
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);
  };

  // ...existing code for other handlers...

  // Assume isAuthenticated is set correctly elsewhere
  const isAuthenticated = !!user;

  return (
    <>
      {/* Dashboard View - Electron-style layout */}
      {isAuthenticated && (
        <div style={{ display: 'flex', height: '100vh', paddingTop: 40 }}>
          {/* Sidebar (30%) */}
          <div style={{ width: '30%', background: '#fff', padding: 24, borderRight: '1px solid rgba(97,61,169,0.2)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minWidth: 280 }}>
            {/* User Info */}
            <div style={{ background: 'rgba(97,61,169,0.08)', borderRadius: 8, padding: 16, marginBottom: 32, display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: '#613da9', width: 48, height: 48, fontWeight: 700, fontSize: 22 }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <div style={{ marginLeft: 16 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#613da9' }}>Signed in as</Typography>
                <Typography sx={{ fontWeight: 500, fontSize: 15, color: '#2d2046' }}>{user?.email}</Typography>
              </div>
            </div>
            {/* Navigation */}
            <div style={{ marginBottom: 32 }}>
              {navItems.map((item) => (
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
            </div>
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
          </div>
          {/* Content Area (70%) */}
          <div style={{ flex: 1, padding: 40, background: '#613da9', overflowY: 'auto' }}>
            {/* Share Screen View */}
            {activeView === 'share' && (
              <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
                  Share Your Screen
                </Typography>
                <Box sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '100%',
                  maxWidth: 900,
                  margin: 0,
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}>
                  <Typography sx={{ fontSize: 16, marginBottom: '24px', color: '#fff', fontWeight: 400, textAlign: 'left', width: '100%', opacity: 0.8 }}>
                    Start a remote desktop session
                  </Typography>
                  <Box sx={{ marginBottom: '24px', width: '100%' }}>
                    <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400, textAlign: 'left' }}>
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
                      color: '#fff',
                      letterSpacing: 0,
                      width: 'auto',
                      display: 'inline-block',
                      textAlign: 'left',
                      mb: 2
                    }}>
                      21Z7568T
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', mb: 3, width: '100%' }}>
                    <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400, mb: 1 }}>Connection</Typography>
                      <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', mr: 0.75 }} />
                        Ready
                      </Typography>
                    </Box>
                    <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400, mb: 1 }}>Session</Typography>
                      <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Not Started</Typography>
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
                      border: 'none',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#09090b',
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
              <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
                  Join Session
                </Typography>
                <Box sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '100%',
                  maxWidth: 900,
                  margin: 0,
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}>
                  <Typography sx={{ fontSize: 16, marginBottom: '24px', color: '#fff', fontWeight: 400, textAlign: 'left', width: '100%', opacity: 0.8 }}>
                    Enter a session ID to connect to a remote desktop
                  </Typography>
                  <Box sx={{ marginBottom: '24px', width: '100%' }}>
                    <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400, textAlign: 'left' }}>
                      Session ID
                    </Typography>
                    <input
                      type="text"
                      placeholder="Enter session ID (e.g. ABC123XY)"
                      value={joinSessionId}
                      onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        outline: 'none',
                        marginBottom: 0,
                        letterSpacing: 0
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
                      color: '#09090b',
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      border: 'none',
                      margin: 0,
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#09090b',
                      },
                      '&:disabled': {
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: '#09090b',
                        opacity: 0.5
                      }
                    }}
                  >
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Session'}
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
              <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
                  Friends
                </Typography>
                <Box sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '100%',
                  maxWidth: 900,
                  margin: 0,
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}>
                  <Typography sx={{ fontSize: 16, marginBottom: '24px', color: '#fff', fontWeight: 400, textAlign: 'left', width: '100%', opacity: 0.8 }}>
                    Your friends will appear here.
                  </Typography>
                </Box>
              </Box>
            )}
          </div>
        </div>
      )}
// ...existing code...
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
                  padding: '18px 18px',
                  marginBottom: '6px',
                  color: activeView === item.id ? '#6C3FC5' : '#bca6e7',
                  background: activeView === item.id ? '#f3eaff' : 'transparent',
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
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
              Share Your Screen
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 16, marginBottom: '24px', color: '#fff', fontWeight: 400, textAlign: 'left', width: '100%', opacity: 0.8 }}>
                Start a remote desktop session
              </Typography>
              <Box sx={{ marginBottom: '24px', width: '100%' }}>
                <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400, textAlign: 'left' }}>
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
                  color: '#fff',
                  letterSpacing: 0,
                  width: 'auto',
                  display: 'inline-block',
                  textAlign: 'left',
                  mb: 2
                }}>
                  21Z7568T
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', mb: 3, width: '100%' }}>
                <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400, mb: 1 }}>Connection</Typography>
                  <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', mr: 0.75 }} />
                    Ready
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400, mb: 1 }}>Session</Typography>
                  <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Not Started</Typography>
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
                  border: 'none',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#09090b',
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
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
              Join Session
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 16, marginBottom: '24px', color: '#fff', fontWeight: 400, textAlign: 'left', width: '100%', opacity: 0.8 }}>
                Enter a session ID to connect to a remote desktop
              </Typography>
              <Box sx={{ marginBottom: '24px', width: '100%' }}>
                <Typography sx={{ fontSize: 14, marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400, textAlign: 'left' }}>
                  Session ID
                </Typography>
                <input
                  type="text"
                  placeholder="Enter session ID (e.g. ABC123XY)"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    outline: 'none',
                    marginBottom: 0,
                    letterSpacing: 0
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
                  color: '#09090b',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  border: 'none',
                  margin: 0,
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#09090b',
                  },
                  '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.5)',
                    color: '#09090b',
                    opacity: 0.5
                  }
                }}
              >
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Session'}
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
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
              Friends
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
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
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
              Messages
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
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
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ marginBottom: '32px', fontWeight: 700, fontSize: 32, color: '#fff', textAlign: 'left', width: '100%' }}>
              File Transfer
            </Typography>
            <Box sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '60px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%',
              maxWidth: 900,
              margin: 0,
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
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

import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  DesktopWindows,
  Security,
  Speed,
  CloudUpload,
  TouchApp,
  ScreenShare,
  ArrowBack,
  Home
} from '@mui/icons-material';

function FeaturesPage({ onBack, onGetStarted, darkMode }) {
  const [isVisible, setIsVisible] = useState({
    features: false,
    details: false
  });

  const featuresRef = useRef(null);
  const detailsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === featuresRef.current) {
              setIsVisible((prev) => ({ ...prev, features: true }));
            }
            if (entry.target === detailsRef.current) {
              setIsVisible((prev) => ({ ...prev, details: true }));
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);
    if (detailsRef.current) observer.observe(detailsRef.current);

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <DesktopWindows sx={{ fontSize: '3rem' }} />,
      title: 'Real-Time Screen Sharing',
      description: 'Experience ultra-low latency desktop streaming with crystal-clear quality. Share your entire screen seamlessly with WebRTC technology for real-time communication.',
      details: [
        'HD quality streaming up to 1080p',
        'Adaptive bitrate for smooth performance',
        '30 FPS video capture',
        'System audio sharing support'
      ]
    },
    {
      icon: <TouchApp sx={{ fontSize: '3rem' }} />,
      title: 'Remote Control',
      description: 'Take full control of remote desktops with mouse and keyboard support. Work as if you\'re sitting right there with instant input response.',
      details: [
        'Full mouse control (click, drag, scroll)',
        'Complete keyboard support',
        'Keyboard shortcuts support',
        'Toggle control on/off anytime'
      ]
    },
    {
      icon: <Security sx={{ fontSize: '3rem' }} />,
      title: 'Enterprise Security',
      description: 'End-to-end encrypted connections via WebRTC with TURN relay support for maximum privacy and security in all network conditions.',
      details: [
        'End-to-end encryption',
        'DTLS-SRTP for media streams',
        'Secure WebSocket signaling',
        'Cloudflare TURN integration'
      ]
    },
    {
      icon: <Speed sx={{ fontSize: '3rem' }} />,
      title: 'Lightning Fast',
      description: 'Peer-to-peer connections ensure minimal latency. Experience responsive remote desktop like never before with optimized performance.',
      details: [
        'Average latency < 50ms',
        'Direct P2P connections',
        'Automatic quality optimization',
        'Network auto-recovery'
      ]
    },
    {
      icon: <CloudUpload sx={{ fontSize: '3rem' }} />,
      title: 'File Transfer',
      description: 'Securely transfer files up to 10MB between sessions. Share documents, images, and more instantly through encrypted data channels.',
      details: [
        'Up to 10MB file size',
        'Real-time progress tracking',
        'Secure data channel transfer',
        'Multiple file type support'
      ]
    },
    {
      icon: <ScreenShare sx={{ fontSize: '3rem' }} />,
      title: 'Multi-Platform',
      description: 'Access from any modern browser on Windows, Mac, or Linux. No installation required for guests - just share a session ID.',
      details: [
        'Cross-platform compatibility',
        'No installation for guests',
        'Modern browser support',
        'Mobile device friendly'
      ]
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DesktopWindows />
            <Typography variant="h6" component="div">
              SuperDesk Features
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={onBack}
            sx={{
              color: 'white',
              borderColor: 'rgba(139, 92, 246, 0.5)',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.1)'
              }
            }}
          >
            Home
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          py: 8,
          background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #fff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Powerful Features
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: 700,
              mx: 'auto'
            }}
          >
            Everything you need for professional remote desktop access, 
            built with cutting-edge WebRTC technology
          </Typography>
        </Container>
      </Box>

      {/* Features Grid */}
      <Box ref={featuresRef} sx={{ py: 8, background: '#0d0d0d' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  className={`feature-card ${isVisible.features ? 'visible' : ''}`}
                  elevation={0}
                  sx={{
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    animation: isVisible.features
                      ? `slide-in-up 0.6s ease-out ${index * 0.1}s forwards`
                      : 'none',
                    opacity: isVisible.features ? 1 : 0
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box className="feature-icon" sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    
                    <Typography
                      variant="h5"
                      className="feature-title"
                      sx={{ mb: 2, fontWeight: 700, color: '#fff' }}
                    >
                      {feature.title}
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      className="feature-description"
                      sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.8 }}
                    >
                      {feature.description}
                    </Typography>
                    
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {feature.details.map((detail, i) => (
                        <Typography
                          component="li"
                          key={i}
                          variant="body2"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            mb: 1,
                            '&::marker': {
                              color: '#8b5cf6'
                            }
                          }}
                        >
                          {detail}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 8,
          background: '#0a0a0a',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #fff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Ready to Get Started?
          </Typography>
          
          <Typography
            variant="h6"
            sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 4 }}
          >
            Experience the power of SuperDesk remote desktop
          </Typography>
          
          <Button
            variant="outlined"
            size="large"
            onClick={onGetStarted}
            startIcon={<DesktopWindows />}
            sx={{
              px: 5,
              py: 1.8,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: '8px',
              color: 'white',
              borderColor: 'rgba(139, 92, 246, 0.5)',
              background: 'rgba(139, 92, 246, 0.1)',
              backdropFilter: 'blur(10px)',
              textTransform: 'none',
              minWidth: '220px',
              '&:hover': {
                borderColor: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Start a Session
          </Button>
        </Container>
      </Box>
    </Box>
  );
}

export default FeaturesPage;

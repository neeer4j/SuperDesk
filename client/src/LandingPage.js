import React from 'react';
import { Box, Container, Button } from '@mui/material';
import superdeskLogo from './assets/superdesk.png';

function LandingPage({ onGetStarted }) {
  return (
    <Box>
      {/* Minimal hero: full-screen logo + Get Started button */}
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a006f'
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', py: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
            <Box component="img"
              src={superdeskLogo}
              alt="SuperDesk"
              sx={{
                width: { xs: '90vw', sm: '80vw', md: '70vw', lg: '60vw' },
                maxWidth: '1200px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 18px 48px rgba(0,0,0,0.6))',
                animation: 'fadeInUp 0.9s cubic-bezier(.2,.9,.2,1)'
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={onGetStarted}
              size="large"
              sx={{
                background: '#ffffff',
                color: '#0a006f',
                px: 6,
                py: 1.8,
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 10px 30px rgba(2,6,23,0.4)',
                '&:hover': {
                  background: '#f5f5f7'
                }
              }}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;

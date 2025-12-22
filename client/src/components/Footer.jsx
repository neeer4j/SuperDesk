import React from 'react';
import { useTheme } from '../context/ThemeContext';
import superdeskLogo from '../assets/superdesk.png';
import superdeskLogoWhite from '../assets/superdeskw.png';

export default function Footer() {
    const { darkMode } = useTheme();
    const currentYear = new Date().getFullYear();

    return (
        <footer style={{
            padding: '48px 24px',
            backgroundColor: darkMode ? '#0d0d14' : '#f8f7fc',
            borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(97, 61, 169, 0.1)',
        }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                {/* Logo and Brand */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    <img
                        src={darkMode ? superdeskLogoWhite : superdeskLogo}
                        alt="SuperDesk"
                        style={{ height: '32px', width: 'auto' }}
                    />
                    <span style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: darkMode ? 'white' : '#613da9',
                    }}>
                        SuperDesk
                    </span>
                </div>

                {/* Tagline */}
                <p style={{
                    fontSize: '14px',
                    color: darkMode ? 'rgba(255,255,255,0.6)' : '#666',
                    marginBottom: '32px',
                }}>
                    Secure remote desktop sharing for modern teams.
                </p>

                {/* Copyright */}
                <p style={{
                    fontSize: '13px',
                    color: darkMode ? 'rgba(255,255,255,0.4)' : '#999',
                }}>
                    © {currentYear} SuperDesk. All rights reserved.
                </p>
            </div>
        </footer>
    );
}


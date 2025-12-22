import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// Import logo
import superdeskLogo from '../assets/superdesk.png';
import superdeskLogoWhite from '../assets/superdeskw.png';

export default function Navbar() {
    const { darkMode, toggleDarkMode } = useTheme();
    const [supportOpen, setSupportOpen] = useState(false);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                backdropFilter: 'blur(12px)',
                backgroundColor: darkMode ? 'rgba(13, 13, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(97, 61, 169, 0.1)',
            }}
        >
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                    <img
                        src={darkMode ? superdeskLogoWhite : superdeskLogo}
                        alt="SuperDesk"
                        style={{ height: '32px', width: 'auto' }}
                    />
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: darkMode ? 'white' : '#613da9' }}>
                        SuperDesk
                    </span>
                </Link>

                {/* Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <a
                        href="#features"
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: darkMode ? 'rgba(255,255,255,0.8)' : '#666',
                            textDecoration: 'none',
                        }}
                    >
                        Features
                    </a>
                    <a
                        href="#about"
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: darkMode ? 'rgba(255,255,255,0.8)' : '#666',
                            textDecoration: 'none',
                        }}
                    >
                        About
                    </a>

                    {/* Support Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setSupportOpen(!supportOpen)}
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: darkMode ? 'rgba(255,255,255,0.8)' : '#666',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            Support
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>

                        <AnimatePresence>
                            {supportOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        backgroundColor: darkMode ? '#1a1a2e' : 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                                        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                        overflow: 'hidden',
                                        minWidth: '200px',
                                    }}
                                >
                                    <a
                                        href="https://ko-fi.com/idkcoding"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setSupportOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            color: darkMode ? 'white' : '#333',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            backgroundColor: 'transparent',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ☕ Support on Ko-fi
                                    </a>
                                    <a
                                        href="https://github.com/neeer4j/SuperDesk"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setSupportOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            color: darkMode ? 'white' : '#333',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            backgroundColor: 'transparent',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ⭐ Star on GitHub
                                    </a>
                                    <a
                                        href="mailto:support@superdesk.co.in"
                                        onClick={() => setSupportOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            color: darkMode ? 'white' : '#333',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            backgroundColor: 'transparent',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ✉️ Email Support
                                    </a>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        style={{
                            padding: '8px',
                            borderRadius: '50%',
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(97, 61, 169, 0.1)',
                            color: darkMode ? 'white' : '#613da9',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {darkMode ? (
                            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>

                    {/* Get the App Button */}
                    <a
                        href="https://github.com/neeer4j/SuperDesk/releases/tag/v1.2.0-alpha"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '10px 20px',
                            borderRadius: '9999px',
                            fontWeight: 600,
                            fontSize: '14px',
                            backgroundColor: '#613da9',
                            color: 'white',
                            textDecoration: 'none',
                            boxShadow: '0 4px 14px rgba(97, 61, 169, 0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        Get the App
                    </a>
                </div>
            </div>
        </motion.nav>
    );
}


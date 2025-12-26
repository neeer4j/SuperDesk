import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import superdeskLogoText from '../assets/superdeskmm.png';
import superdeskLogoWhite from '../assets/superdeskw.png';
import superdeskShowcase from '../assets/suppm.png';
import superdeskHeroMockup from '../assets/supipad.png';

// Icons matching Figma design
const FeatureIcons = {
    monitor: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
    ),
    zap: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
    ),
    download: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    ),
    users: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
};

// Feature data
const features = [
    {
        icon: 'monitor',
        title: 'Screen Sharing',
        description: 'Share your screen instantly with high-quality, low-latency streaming.',
    },
    {
        icon: 'zap',
        title: 'Fast & Secure',
        description: 'End-to-end encrypted peer-to-peer connections for maximum privacy.',
    },
    {
        icon: 'download',
        title: 'File Transfer',
        description: 'Send files directly between devices. Fast, secure, no size limits.',
    },
    {
        icon: 'users',
        title: 'Cross-Platform',
        description: 'Works on Windows, Android, iOS, and Web browsers seamlessly.',
    },
];

export default function Home() {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0d0d14',
            color: 'white',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            {/* Navbar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: '20px 48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(13, 13, 20, 0.9)',
                backdropFilter: 'blur(10px)',
            }}>
                {/* Logo */}
                <Link to="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                }}>
                    <img
                        src={superdeskLogoText}
                        alt="SuperDesk"
                        style={{ height: '36px', width: 'auto' }}
                    />
                </Link>

                {/* Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                    <a href="#about" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>About</a>
                    <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>Features</a>
                    <a href="https://github.com/neeer4j/SuperDesk" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>GitHub</a>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Get Desktop App Button */}
                    <a
                        href="https://github.com/neeer4j/SuperDesk/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        Get Desktop App
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '120px 48px 80px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    maxWidth: '1200px',
                    width: '100%',
                    gap: '80px',
                }}>
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{ flex: 1, maxWidth: '500px' }}
                    >
                        <h1 style={{
                            fontSize: '64px',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            marginBottom: '8px',
                            letterSpacing: '-2px',
                        }}>
                            Remote Desktop
                        </h1>
                        <h2 style={{
                            fontSize: '48px',
                            fontWeight: 700,
                            color: '#a78bfa',
                            lineHeight: 1.1,
                            marginBottom: '24px',
                            letterSpacing: '-1px',
                        }}>
                            Made Simple.
                        </h2>
                        <p style={{
                            fontSize: '18px',
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: 1.7,
                            marginBottom: '40px',
                        }}>
                            Secure screen sharing, remote control, and file transfer for modern teams.
                            Built on WebRTC for peer-to-peer connections that never touch our servers.
                        </p>
                    </motion.div>

                    {/* Right - App Mockup Image */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ flex: 1, maxWidth: '550px' }}
                    >
                        <img
                            src={superdeskHeroMockup}
                            alt="SuperDesk App"
                            style={{
                                width: '100%',
                                height: 'auto',
                                filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5))',
                            }}
                        />
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={{
                padding: '100px 48px',
                backgroundColor: '#0a0a10',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '64px' }}
                    >
                        <h2 style={{
                            fontSize: '42px',
                            fontWeight: 700,
                            marginBottom: '16px',
                            letterSpacing: '-1px',
                        }}>
                            What I Do
                        </h2>
                        <p style={{
                            fontSize: '18px',
                            color: 'rgba(255,255,255,0.6)',
                            maxWidth: '500px',
                            margin: '0 auto',
                        }}>
                            Powerful features for seamless remote collaboration
                        </p>
                    </motion.div>

                    {/* Feature Cards Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '24px',
                    }}>
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    padding: '32px 24px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    textAlign: 'center',
                                    transition: 'all 0.3s',
                                }}
                            >
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px',
                                    color: '#a78bfa',
                                }}>
                                    {FeatureIcons[feature.icon]}
                                </div>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    marginBottom: '12px',
                                }}>
                                    {feature.title}
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'rgba(255,255,255,0.5)',
                                    lineHeight: 1.6,
                                }}>
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" style={{
                padding: '100px 48px',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '32px',
                }}>
                    {/* Left - Image/Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        style={{ flexShrink: 0 }}
                    >
                        <img
                            src={superdeskShowcase}
                            alt="SuperDesk App"
                            style={{
                                width: '280px',
                                height: 'auto',
                                borderRadius: '12px',
                            }}
                        />
                    </motion.div>

                    {/* Right - Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        style={{ flex: 1 }}
                    >
                        <h2 style={{
                            fontSize: '42px',
                            fontWeight: 700,
                            marginBottom: '24px',
                            letterSpacing: '-1px',
                        }}>
                            About SuperDesk
                        </h2>
                        <div style={{
                            fontSize: '16px',
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: 1.8,
                        }}>
                            <p style={{ marginBottom: '20px' }}>
                                SuperDesk is an indie remote desktop solution created out of a passion for building tools that make work easier, faster, and more secure. Developed under real-world limitations, it proves that thoughtful design and dedication can create powerful software.
                            </p>
                            <p style={{ marginBottom: '20px' }}>
                                Built on WebRTC, all connections are peer to peer, meaning your data never passes through any server. Privacy, security, and speed are integral to every part of the platform.
                            </p>
                            <p>
                                SuperDesk is truly cross platform available as a web app, with mobile apps for Android and a desktop version that offers full functionality and flexibility.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{
                padding: '80px 48px',
                textAlign: 'center',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <Link
                        to="/app"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 32px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                    >
                        Launch SuperDesk Web App
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer style={{
                padding: '48px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'center',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                }}>
                    <img src={superdeskLogoWhite} alt="SuperDesk" style={{ height: '32px', width: 'auto' }} />
                    <img src={superdeskLogoText} alt="SuperDesk" style={{ height: '24px', width: 'auto' }} />
                </div>
                <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '24px',
                }}>
                    Secure remote desktop sharing for modern teams.
                </p>
                <p style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.3)',
                }}>
                    © {new Date().getFullYear()} SuperDesk. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

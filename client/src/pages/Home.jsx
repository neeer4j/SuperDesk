import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../portfolio.css';

// Feature data
const features = [
    {
        icon: '🖥️',
        title: 'Screen Sharing',
        description: 'Share your screen instantly with anyone. High-quality, low-latency streaming.',
    },
    {
        icon: '🔒',
        title: 'Secure Connection',
        description: 'End-to-end encrypted peer-to-peer connections. Your data stays private.',
    },
    {
        icon: '🎮',
        title: 'Remote Control',
        description: 'Take control of remote devices with mouse and keyboard. Permission-based.',
    },
    {
        icon: '📁',
        title: 'File Transfer',
        description: 'Send files directly between devices. Fast, secure, no size limits.',
    },
    {
        icon: '💬',
        title: 'Messaging',
        description: 'Built-in chat for seamless communication during sessions.',
    },
    {
        icon: '📱',
        title: 'Cross-Platform',
        description: 'Works on Windows, Android, and Web browsers.',
    },
];

export default function Home() {
    const { darkMode } = useTheme();

    return (
        <div className={`min-h-screen relative overflow-hidden ${darkMode ? 'bg-surface-dark' : 'bg-surface-light'}`}>
            {/* Animated IT-themed background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
                {/* Animated network nodes */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={`node-${i}`}
                        style={{
                            position: 'absolute',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: darkMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(97, 61, 169, 0.3)',
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                        }}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0.8, 0.3],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.5,
                        }}
                    />
                ))}

                {/* Connecting lines */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {[...Array(4)].map((_, i) => (
                        <motion.line
                            key={`line-${i}`}
                            x1={`${20 + i * 20}%`}
                            y1={`${30 + i * 10}%`}
                            x2={`${40 + i * 15}%`}
                            y2={`${50 + i * 8}%`}
                            stroke={darkMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(97, 61, 169, 0.1)'}
                            strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: [0, 1, 0] }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                delay: i * 0.8,
                            }}
                        />
                    ))}
                </svg>

                {/* Floating code snippets */}
                {['</>', '{ }', '( )', '::'].map((code, i) => (
                    <motion.div
                        key={`code-${i}`}
                        style={{
                            position: 'absolute',
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            color: darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(97, 61, 169, 0.12)',
                            userSelect: 'none',
                            pointerEvents: 'none',
                            right: `${10 + i * 20}%`,
                            top: `${25 + i * 15}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            delay: i * 1.2,
                        }}
                    >
                        {code}
                    </motion.div>
                ))}

                {/* Gradient orbs */}
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: '25%',
                    width: '384px',
                    height: '384px',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    backgroundColor: darkMode ? 'rgba(88, 28, 135, 0.4)' : 'rgba(97, 61, 169, 0.2)',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '25%',
                    right: '25%',
                    width: '320px',
                    height: '320px',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    backgroundColor: darkMode ? 'rgba(67, 56, 202, 0.3)' : 'rgba(124, 58, 237, 0.15)',
                }} />
            </div>

            <Navbar />

            {/* Hero Section */}
            <section style={{ paddingTop: '128px', paddingBottom: '80px', padding: '128px 24px 80px' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                            fontWeight: 'bold',
                            color: darkMode ? 'white' : '#1f1f1f',
                            marginBottom: '24px',
                            lineHeight: 1.1,
                        }}>
                            Remote Desktop
                            <br />
                            <span style={{ color: darkMode ? 'rgba(255,255,255,0.9)' : '#613da9' }}>Made Simple</span>
                        </h1>
                        <p style={{
                            fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                            color: darkMode ? 'rgba(255,255,255,0.8)' : '#555',
                            marginBottom: '40px',
                            maxWidth: '700px',
                            margin: '0 auto 40px',
                        }}>
                            Secure screen sharing, remote control, and file transfer for modern teams. No installation required.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}
                    >
                        <Link
                            to="/app"
                            style={{
                                padding: '16px 32px',
                                borderRadius: '16px',
                                fontWeight: 600,
                                fontSize: '16px',
                                backgroundColor: '#613da9',
                                color: 'white',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '180px',
                                boxShadow: '0 4px 20px rgba(97, 61, 169, 0.4)',
                                transition: 'all 0.2s',
                            }}
                        >
                            Launch Web App →
                        </Link>
                        <a
                            href="#features"
                            style={{
                                padding: '16px 32px',
                                borderRadius: '16px',
                                fontWeight: 600,
                                fontSize: '16px',
                                backgroundColor: darkMode ? 'transparent' : 'rgba(97, 61, 169, 0.1)',
                                color: darkMode ? 'white' : '#613da9',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '180px',
                                border: darkMode ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(97, 61, 169, 0.3)',
                                transition: 'all 0.2s',
                            }}
                        >
                            Learn More
                        </a>
                    </motion.div>

                    {/* Device Connection Animation - Horizontal Layout */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        style={{ marginTop: '64px' }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0',
                            position: 'relative',
                        }}>
                            {/* PC Device */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '24px',
                                    backgroundColor: darkMode ? 'rgba(97, 61, 169, 0.3)' : 'rgba(97, 61, 169, 0.15)',
                                    border: darkMode ? '2px solid rgba(168, 85, 247, 0.5)' : '2px solid rgba(97, 61, 169, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: darkMode
                                        ? '0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.1)'
                                        : '0 8px 32px rgba(97, 61, 169, 0.2)',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                <svg width="40" height="40" fill="none" stroke={darkMode ? 'white' : '#613da9'} viewBox="0 0 24 24" strokeWidth="1.5">
                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                                <span style={{ color: darkMode ? 'white' : '#613da9', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>PC</span>
                            </motion.div>

                            {/* Connection Line 1 with Pulse */}
                            <div style={{ width: '80px', height: '3px', position: 'relative', margin: '0 -5px', zIndex: 1 }}>
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: darkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(97, 61, 169, 0.2)',
                                    borderRadius: '2px',
                                }} />
                                <motion.div
                                    animate={{ x: ['-100%', '300%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    style={{
                                        position: 'absolute',
                                        width: '30%',
                                        height: '100%',
                                        background: darkMode
                                            ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), transparent)'
                                            : 'linear-gradient(90deg, transparent, rgba(97, 61, 169, 0.6), transparent)',
                                        borderRadius: '2px',
                                    }}
                                />
                            </div>

                            {/* Mobile Device */}
                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '24px',
                                    backgroundColor: darkMode ? 'rgba(97, 61, 169, 0.3)' : 'rgba(97, 61, 169, 0.15)',
                                    border: darkMode ? '2px solid rgba(168, 85, 247, 0.5)' : '2px solid rgba(97, 61, 169, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: darkMode
                                        ? '0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.1)'
                                        : '0 8px 32px rgba(97, 61, 169, 0.2)',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                <svg width="40" height="40" fill="none" stroke={darkMode ? 'white' : '#613da9'} viewBox="0 0 24 24" strokeWidth="1.5">
                                    <rect x="5" y="2" width="14" height="20" rx="3" />
                                    <circle cx="12" cy="18" r="1" fill={darkMode ? 'white' : '#613da9'} />
                                </svg>
                                <span style={{ color: darkMode ? 'white' : '#613da9', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>Mobile</span>
                            </motion.div>

                            {/* Connection Line 2 with Pulse */}
                            <div style={{ width: '80px', height: '3px', position: 'relative', margin: '0 -5px', zIndex: 1 }}>
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: darkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(97, 61, 169, 0.2)',
                                    borderRadius: '2px',
                                }} />
                                <motion.div
                                    animate={{ x: ['-100%', '300%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                                    style={{
                                        position: 'absolute',
                                        width: '30%',
                                        height: '100%',
                                        background: darkMode
                                            ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), transparent)'
                                            : 'linear-gradient(90deg, transparent, rgba(97, 61, 169, 0.6), transparent)',
                                        borderRadius: '2px',
                                    }}
                                />
                            </div>

                            {/* Web Device */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '24px',
                                    backgroundColor: darkMode ? 'rgba(97, 61, 169, 0.3)' : 'rgba(97, 61, 169, 0.15)',
                                    border: darkMode ? '2px solid rgba(168, 85, 247, 0.5)' : '2px solid rgba(97, 61, 169, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: darkMode
                                        ? '0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.1)'
                                        : '0 8px 32px rgba(97, 61, 169, 0.2)',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                <svg width="40" height="40" fill="none" stroke={darkMode ? 'white' : '#613da9'} viewBox="0 0 24 24" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <ellipse cx="12" cy="12" rx="4" ry="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                </svg>
                                <span style={{ color: darkMode ? 'white' : '#613da9', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>Web</span>
                            </motion.div>
                        </div>

                        {/* Subtitle under animation */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            style={{
                                textAlign: 'center',
                                marginTop: '24px',
                                fontSize: '14px',
                                color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(97, 61, 169, 0.6)',
                                fontWeight: 500,
                            }}
                        >
                            Seamlessly connected across all devices
                        </motion.p>
                    </motion.div>
                </div>
            </section>

            {/* Features Section - Scrolling Marquee */}
            <section id="features" style={{ padding: '80px 0', overflow: 'hidden' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            marginBottom: '16px',
                            color: darkMode ? 'white' : '#1f1f1f'
                        }}
                    >
                        Powerful Features
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{
                            fontSize: '18px',
                            color: darkMode ? 'rgba(255,255,255,0.6)' : '#666'
                        }}
                    >
                        Everything you need for seamless remote collaboration
                    </motion.p>
                </div>

                {/* Scrolling Marquee Container */}
                <div style={{ position: 'relative' }}>
                    {/* Gradient Fade Left */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '100px',
                        background: darkMode
                            ? 'linear-gradient(to right, #0d0d14, transparent)'
                            : 'linear-gradient(to right, #f8f7fc, transparent)',
                        zIndex: 10,
                        pointerEvents: 'none',
                    }} />

                    {/* Gradient Fade Right */}
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '100px',
                        background: darkMode
                            ? 'linear-gradient(to left, #0d0d14, transparent)'
                            : 'linear-gradient(to left, #f8f7fc, transparent)',
                        zIndex: 10,
                        pointerEvents: 'none',
                    }} />

                    {/* Scrolling Track */}
                    <motion.div
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                        style={{
                            display: 'flex',
                            gap: '32px',
                            width: 'fit-content',
                        }}
                    >
                        {/* Duplicate features for seamless loop */}
                        {[...features, ...features].map((feature, index) => (
                            <div
                                key={`${feature.title}-${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px 32px',
                                    borderRadius: '16px',
                                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(97, 61, 169, 0.08)',
                                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(97, 61, 169, 0.15)',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                <span style={{ fontSize: '32px' }}>{feature.icon}</span>
                                <div>
                                    <div style={{
                                        fontWeight: 600,
                                        fontSize: '16px',
                                        color: darkMode ? 'white' : '#1f1f1f',
                                        marginBottom: '4px',
                                    }}>
                                        {feature.title}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: darkMode ? 'rgba(255,255,255,0.6)' : '#666',
                                    }}>
                                        {feature.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 px-6 relative">
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            marginBottom: '32px',
                            textAlign: 'center',
                            color: darkMode ? 'white' : '#1f1f1f'
                        }}>
                            About SuperDesk
                        </h2>

                        <div style={{
                            fontSize: '17px',
                            lineHeight: '1.8',
                            color: darkMode ? 'rgba(255,255,255,0.75)' : '#555',
                        }}>
                            <p style={{ marginBottom: '24px' }}>
                                SuperDesk is an indie remote desktop solution created out of a passion for building tools that make work easier, faster, and more secure. Developed under real-world limitations, it proves that thoughtful design and dedication can create powerful software without the resources of a large organization. Every feature is crafted to solve real problems, keeping simplicity, reliability, and usability at the heart of the experience.
                            </p>

                            <p style={{ marginBottom: '24px' }}>
                                SuperDesk is designed for the modern way of working. Whether you need to access your own computer remotely, provide tech support, or collaborate with others across locations, SuperDesk makes it seamless. Built on WebRTC, all connections are peer-to-peer, meaning your data never passes through any server. Privacy, security, and speed are integral to every part of the platform.
                            </p>

                            <p style={{ marginBottom: '24px' }}>
                                SuperDesk is truly cross-platform. It is available today as a web app, with mobile apps for Android and iOS coming soon, and a desktop version that offers full functionality and flexibility. This makes it easy to work the way you want, wherever you are.
                            </p>

                            <p>
                                At its core, SuperDesk represents the spirit of indie software—driven by curiosity, passion, and a desire to create something meaningful. It continues to evolve, learning from real-world use and feedback, making remote work effortless, secure, and enjoyable.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: '80px 24px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{
                            fontSize: 'clamp(2rem, 5vw, 3rem)',
                            fontWeight: 'bold',
                            color: darkMode ? 'white' : '#1f1f1f',
                            marginBottom: '24px',
                        }}>
                            Ready to Get Started?
                        </h2>
                        <p style={{
                            fontSize: '18px',
                            color: darkMode ? 'rgba(255,255,255,0.8)' : '#555',
                            marginBottom: '40px',
                        }}>
                            No download required. Launch the web app and start sharing in seconds.
                        </p>
                        <Link
                            to="/app"
                            style={{
                                display: 'inline-block',
                                padding: '20px 48px',
                                borderRadius: '16px',
                                fontWeight: 600,
                                fontSize: '18px',
                                backgroundColor: '#613da9',
                                color: 'white',
                                textDecoration: 'none',
                                boxShadow: '0 8px 30px rgba(97, 61, 169, 0.4)',
                                transition: 'all 0.2s',
                            }}
                        >
                            Launch SuperDesk →
                        </Link>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import '../portfolio.css';
import superdeskLogoText from '../assets/superdeskmm.png';
import superdeskLogoWhite from '../assets/superdeskw.png';
import superdeskShowcase from '../assets/suppm.png';
import superdeskHeroMockup from '../assets/supipad.png';
import {
    SiReact, SiNodedotjs, SiElectron,
    SiSocketdotio, SiWebrtc, SiTailwindcss, SiGithub,
    SiVercel, SiExpress, SiSupabase, SiFramer
} from 'react-icons/si';
import { VscAzure } from 'react-icons/vsc';

// Loading Overlay Component
const LoadingOverlay = React.memo(() => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0d0d14',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}
    >
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <img src={superdeskLogoText} alt="Loading..." style={{ height: '48px', width: 'auto' }} />
        </motion.div>
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
                height: '2px',
                backgroundColor: '#8b5cf6',
                marginTop: '24px',
                borderRadius: '2px',
            }}
        />
        <p style={{
            marginTop: '16px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            fontFamily: 'monospace',
        }}>Initializing Environment...</p>
    </motion.div>
));

// Typewriter effect component
const TypewriterText = React.memo(({ lines, typingSpeed = 80, delayBetweenLines = 300 }) => {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [showCursor, setShowCursor] = useState(true);

    useEffect(() => {
        // Blinking cursor effect
        const cursorInterval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, 530);
        return () => clearInterval(cursorInterval);
    }, []);

    useEffect(() => {
        if (currentLineIndex >= lines.length) return;

        const currentLine = lines[currentLineIndex];

        if (currentCharIndex < currentLine.text.length) {
            const timeout = setTimeout(() => {
                setDisplayedLines(prev => {
                    const newLines = [...prev];
                    if (!newLines[currentLineIndex]) {
                        newLines[currentLineIndex] = { ...currentLine, text: '' };
                    }
                    newLines[currentLineIndex] = {
                        ...currentLine,
                        text: currentLine.text.slice(0, currentCharIndex + 1)
                    };
                    return newLines;
                });
                setCurrentCharIndex(prev => prev + 1);
            }, typingSpeed);
            return () => clearTimeout(timeout);
        } else if (currentLineIndex < lines.length - 1) {
            const timeout = setTimeout(() => {
                setCurrentLineIndex(prev => prev + 1);
                setCurrentCharIndex(0);
            }, delayBetweenLines);
            return () => clearTimeout(timeout);
        }
    }, [currentLineIndex, currentCharIndex, lines, typingSpeed, delayBetweenLines]);

    const isTypingComplete = currentLineIndex >= lines.length - 1 &&
        currentCharIndex >= lines[lines.length - 1]?.text.length;

    return (
        <div>
            {displayedLines.map((line, index) => (
                <h1
                    key={index}
                    style={{
                        fontSize: line.fontSize || '64px',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        marginBottom: index === displayedLines.length - 1 ? '24px' : '8px',
                        letterSpacing: line.letterSpacing || '-2px',
                        color: line.color || 'white',
                    }}
                >
                    {line.text}
                    {/* Show cursor only on the last line being typed, and hide when complete */}
                    {index === displayedLines.length - 1 && !isTypingComplete && (
                        <span style={{
                            opacity: showCursor ? 1 : 0,
                            color: '#a78bfa',
                            marginLeft: '2px',
                        }}>|</span>
                    )}
                </h1>
            ))}
        </div>
    );
});

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
        description: 'Works on Windows, Android and Web browsers seamlessly.',
    },
];

export default function Home() {
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [navHidden, setNavHidden] = useState(false);
    const lastScrollY = useRef(0);

    // Hide navbar on scroll down, show on scroll up (mobile only)
    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
                        setNavHidden(true);
                    } else {
                        setNavHidden(false);
                    }
                    lastScrollY.current = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAppNavigation = (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Fake loading delay
        setTimeout(() => {
            navigate('/app');
        }, 1200);
    };

    return (
        <div className="portfolio-container">
            <AnimatePresence>
                {isLoading && <LoadingOverlay key="loader" />}
            </AnimatePresence>

            {/* Navbar */}
            <nav className={`portfolio-nav ${navHidden ? 'nav-hidden' : ''}`}>
                {/* Logo */}
                <Link to="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    flexShrink: 0,
                }}>
                    <img
                        src={superdeskLogoText}
                        alt="SuperDesk"
                        className="portfolio-nav-logo"
                    />
                </Link>

                {/* Nav Links */}
                <div className="portfolio-nav-links">
                    <a href="#about">About</a>
                    <a href="#features">Features</a>
                    <a href="https://github.com/neeer4j/SuperDesk" target="_blank" rel="noopener noreferrer">GitHub</a>
                </div>

                {/* Right side */}
                <div className="portfolio-nav-buttons">
                    {/* Web App Button */}
                    <a href="/app" onClick={handleAppNavigation}>
                        <span>Web App</span>
                    </a>

                    {/* Get Desktop App Button */}
                    <a href="https://github.com/neeer4j/SuperDesk/releases/download/v1.2.0-alpha/SuperDesk.Agent.Setup.1.2.0.exe" download>
                        <span>Get Desktop App</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </a>

                    {/* Get Android App Button */}
                    <a href="https://github.com/neeer4j/SuperDesk-Mobile/releases/download/v1.1/SuperDesk.Android.v1.1.apk" download>
                        <span>Get Android App</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                        </svg>
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="portfolio-hero">

                {/* Background Pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                    zIndex: 0,
                    pointerEvents: 'none',
                }} />
                <div className="portfolio-hero-content">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{ flex: 1, maxWidth: '500px' }}
                    >
                        <TypewriterText
                            lines={[
                                { text: 'Remote Desktop', fontSize: '64px', letterSpacing: '-2px', color: 'white' },
                                { text: 'Made Simple.', fontSize: '48px', letterSpacing: '-1px', color: '#a78bfa' },
                            ]}
                            typingSpeed={70}
                            delayBetweenLines={200}
                        />
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
            <section id="features" className="portfolio-features">
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
                            Capabilities
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
                    <div className="portfolio-features-grid">
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
            <section id="about" className="portfolio-about">
                <div className="portfolio-about-container">
                    {/* Left - Image/Visual */}
                    <motion.div
                        className="portfolio-about-image"
                        initial={{ opacity: 0, clipPath: 'inset(50% 50% 50% 50%)' }}
                        whileInView={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <img
                            src={superdeskShowcase}
                            alt="SuperDesk App"
                        />
                    </motion.div>

                    {/* Right - Text Content */}
                    <motion.div
                        className="portfolio-about-text"
                        initial={{ opacity: 0, clipPath: 'inset(50% 50% 50% 50%)' }}
                        whileInView={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                    >
                        <h2>About SuperDesk</h2>
                        <div>
                            <p>
                                SuperDesk is an indie remote desktop solution created out of a passion for building tools that make work easier, faster, and more secure. Developed under real-world limitations, it proves that thoughtful design and dedication can create powerful software.
                            </p>
                            <p>
                                Built on WebRTC, all connections are peer to peer, meaning your data never passes through any server. Privacy, security, and speed are integral to every part of the platform.
                            </p>
                            <p>
                                SuperDesk is truly cross platform available as a web app, with mobile apps for Android and a desktop version that offers full functionality and flexibility.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Note from the Developers Section */}
            <section id="developers-note" className="portfolio-developers-note">
                <div className="portfolio-developers-note-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2>A Note from the Developers</h2>

                        <div className="developers-note-content">
                            <p>
                                SuperDesk started with a simple thought. Remote access should not feel complicated, heavy, or intrusive.
                            </p>
                            <p>
                                We are a small independent team, and SuperDesk was built out of curiosity, frustration with existing tools, and a genuine love for building good software.
                            </p>
                            <p>
                                This is not a product created by a large company or backed by investors. It was built under real limitations, with a lot of trial and error, late nights, and constant learning. Every feature exists because it solves a real problem we personally cared about.
                            </p>
                            <p className="highlight-paragraph">
                                Privacy sits at the heart of SuperDesk. Connections are peer to peer using WebRTC, so your data does not pass through our servers. We believe remote access should be fast, secure, and respectful of the user.
                            </p>
                            <p>
                                SuperDesk is not perfect, and it never will be. Software is always evolving. What we can promise is that we will give our full effort every single day to make it better, more reliable, and more useful with each update.
                            </p>
                            <p>
                                The aim of SuperDesk is simple. To make remote access easy and reliable. To put privacy and control back in the hands of users. To build software that feels lightweight, honest, and human.
                            </p>
                            <p>

                                SuperDesk is still evolving, and so are we as developers. If you are using it or supporting it in any way, you are already part of this journey. Thank you for being here.
                            </p>


                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section className="tech-stack-section">
                <div className="section-title-container">
                    <h2 className="section-title" style={{ color: '#ffffff' }}>Powered By</h2>
                </div>

                <div className="tech-grid">
                    <div className="tech-item" title="React">
                        <SiReact className="tech-icon react" />
                    </div>
                    <div className="tech-item" title="Node.js">
                        <SiNodedotjs className="tech-icon node" />
                    </div>
                    <div className="tech-item" title="WebRTC">
                        <SiWebrtc className="tech-icon webrtc" />
                    </div>
                    <div className="tech-item" title="Electron">
                        <SiElectron className="tech-icon electron" />
                    </div>
                    <div className="tech-item" title="Socket.io">
                        <SiSocketdotio className="tech-icon socket" />
                    </div>
                    <div className="tech-item" title="Express">
                        <SiExpress className="tech-icon express" />
                    </div>
                    <div className="tech-item" title="GitHub">
                        <SiGithub className="tech-icon github" />
                    </div>
                    <div className="tech-item" title="Tailwind CSS">
                        <SiTailwindcss className="tech-icon tailwind" />
                    </div>
                    <div className="tech-item" title="Azure">
                        <VscAzure className="tech-icon azure" />
                    </div>
                    <div className="tech-item" title="Supabase">
                        <SiSupabase className="tech-icon supabase" />
                    </div>
                    <div className="tech-item" title="Framer Motion">
                        <SiFramer className="tech-icon framer" />
                    </div>
                    <div className="tech-item" title="Vercel">
                        <SiVercel className="tech-icon vercel" />
                    </div>
                </div>
            </section>

            {/* CTA Section */}

            {/* Footer */}
            <footer className="portfolio-footer">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                }}>
                    <img src={superdeskLogoText} alt="SuperDesk" style={{ height: '40px', width: 'auto' }} />
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

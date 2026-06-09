import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../portfolio.css';
import superdeskLogoText from '../assets/superdeskmm.png';
import superdeskShowcase from '../assets/suppm.png';
import superdeskScreenshot from '../assets/sup.png';
import supimage from '../assets/supimage.png';
import renderLogo from '../assets/render.png';
import {
    SiReact, SiNodedotjs, SiElectron,
    SiSocketdotio, SiWebrtc, SiTailwindcss, SiGithub,
    SiVercel, SiExpress, SiSupabase, SiFramer, SiKotlin, SiCloudflare
} from 'react-icons/si';

// Render icon (image component)
const RenderIcon = (props) => (
    <img src={renderLogo} alt="Render" className="tech-icon render" {...props} />
);

// Loading Overlay Component - Ultra-minimal and professional
const LoadingOverlay = React.memo(() => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
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
            gap: '28px',
        }}
    >
        {/* Logo */}
        <motion.img
            src={superdeskLogoText}
            alt="SuperDesk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ height: '36px', width: 'auto' }}
        />

        {/* Minimal three-dot loader */}
        <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                />
            ))}
        </div>

        <style>{`
            @keyframes dotPulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }
        `}</style>
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
                        color: line.gradient ? undefined : (line.color || 'white'),
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        ...(line.gradient ? {
                            background: line.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        } : {}),
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
                    {/* Web App Button - Hidden on Mobile */}
                    <a href="/app" onClick={handleAppNavigation} style={{
                        display: window.innerWidth <= 768 ? 'none' : 'flex'
                    }}>
                        <span>Web App</span>
                    </a>

                    {/* Get Desktop App Button */}
                    <a href="https://github.com/neeer4j/SuperDesk/releases/download/v1.0.0/SuperDesk.Agent.Setup.1.0.0.exe" download>
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
                        {/* Gradient Badge Pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '999px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                marginBottom: '24px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#a78bfa',
                                letterSpacing: '0.5px',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>✦</span> Unified Workspace Solution
                        </motion.div>

                        <TypewriterText
                            lines={[
                                { text: 'Unified Workspace', fontSize: '64px', letterSpacing: '-2px', color: 'white' },
                                { text: 'Made Simple.', fontSize: '48px', letterSpacing: '-1px', gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6366f1 100%)' },
                            ]}
                            typingSpeed={70}
                            delayBetweenLines={200}
                        />
                        <p style={{
                            fontSize: '17px',
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.85,
                            marginBottom: '40px',
                        }}>
                            Your all-in-one hub for secure screen sharing, remote control, and file transfer.
                            Built on WebRTC for peer-to-peer connections that never touch our servers.
                        </p>
                    </motion.div>

                    {/* Right - App Mockup Images with Mac Frames (Stacked) */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ flex: 1, maxWidth: '900px', position: 'relative', minHeight: '550px' }}
                    >
                        {/* First Mac Window Frame (Top Left - Agent Screenshot) */}
                        <div style={{
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            padding: '0',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                            transform: 'perspective(1200px) rotateZ(-2deg) rotateY(-2deg) rotateX(1deg)',
                            transformStyle: 'preserve-3d',
                            position: 'absolute',
                            top: '0',
                            left: '-40px',
                            width: '420px',
                            zIndex: 2,
                            overflow: 'hidden',
                        }}>
                            {/* Mac Title Bar - Slim */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(30, 30, 30, 0.95)',
                            }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#ff5f57',
                                    }} />
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#ffbd2e',
                                    }} />
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#28c840',
                                    }} />
                                </div>
                            </div>
                            <div style={{
                                background: '#000',
                                overflow: 'hidden',
                            }}>
                                <img
                                    src={supimage}
                                    alt="SuperDesk App"
                                    loading="lazy"
                                    decoding="async"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Second Mac Window Frame (Bottom Right - Supimage) */}
                        <div style={{
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            padding: '0',
                            boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.8)',
                            transform: 'perspective(1200px) rotateZ(2deg) rotateY(2deg) rotateX(1deg)',
                            transformStyle: 'preserve-3d',
                            position: 'absolute',
                            top: '120px',
                            right: '-60px',
                            width: '480px',
                            zIndex: 1,
                            overflow: 'hidden',
                        }}>
                            {/* Mac Title Bar - Slim */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(30, 30, 30, 0.95)',
                            }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#ff5f57',
                                    }} />
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#ffbd2e',
                                    }} />
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#28c840',
                                    }} />
                                </div>
                            </div>
                            <div style={{
                                background: '#000',
                                overflow: 'hidden',
                                aspectRatio: '16 / 10',
                            }}>
                                <img
                                    src={superdeskScreenshot}
                                    alt="SuperDesk Agent"
                                    loading="lazy"
                                    decoding="async"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        objectPosition: 'center',
                                        display: 'block',
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="portfolio-about">
                <div className="portfolio-about-container">
                    {/* Left - Image/Visual */}
                    <motion.div
                        className="portfolio-about-image"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <img
                            src={superdeskShowcase}
                            alt="SuperDesk App"
                            loading="lazy"
                            decoding="async"
                        />
                    </motion.div>

                    {/* Right - Text Content */}
                    <motion.div
                        className="portfolio-about-text"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
                    >
                        {/* Accent line */}
                        <div style={{
                            width: '48px',
                            height: '3px',
                            background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                            borderRadius: '2px',
                            marginBottom: '20px',
                        }} />
                        <h2 style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>About SuperDesk</h2>
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

            {/* Features Section */}
            <section id="features" className="portfolio-features">
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '72px' }}
                    >
                        {/* Section Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            borderRadius: '999px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                            marginBottom: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#a78bfa',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                        }}>
                            What We Offer
                        </div>
                        <h2 style={{
                            fontSize: '42px',
                            fontWeight: 700,
                            marginBottom: '16px',
                            letterSpacing: '-1px',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        }}>
                            Capabilities
                        </h2>
                        <p style={{
                            fontSize: '17px',
                            color: 'rgba(255,255,255,0.5)',
                            maxWidth: '480px',
                            margin: '0 auto',
                            lineHeight: 1.6,
                        }}>
                            Powerful features for seamless remote collaboration
                        </p>
                    </motion.div>

                    {/* Feature Cards Grid */}
                    <div className="portfolio-features-grid">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                className="feature-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.4 }}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.025)',
                                    borderRadius: '16px',
                                    padding: '36px 24px 32px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    textAlign: 'center',
                                }}
                            >
                                <div className="feature-icon-box" style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '14px',
                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px',
                                    color: '#a78bfa',
                                    transition: 'box-shadow 0.3s ease',
                                }}>
                                    {FeatureIcons[feature.icon]}
                                </div>
                                <h3 style={{
                                    fontSize: '17px',
                                    fontWeight: 600,
                                    marginBottom: '10px',
                                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                }}>
                                    {feature.title}
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'rgba(255,255,255,0.45)',
                                    lineHeight: 1.65,
                                }}>
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Note from the Developers Section */}
            <section id="developers-note" className="portfolio-developers-note">
                <div className="portfolio-developers-note-container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}
                    >
                        <h2 style={{
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontSize: '28px',
                            fontWeight: 700,
                            marginBottom: '20px',
                            letterSpacing: '-0.5px',
                        }}>From the Developers</h2>

                        <div style={{
                            fontSize: '15px',
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.8,
                        }}>
                            <p style={{ marginBottom: '14px' }}>
                                SuperDesk started as a side project born out of curiosity and a love for coding. We're independent devs — no big company, no investors — just late nights, trial and error, and a lot of coffee. Privacy matters to us, so every connection is peer-to-peer. Your data never touches our servers.
                            </p>
                            <p>
                                It's not perfect, but we're improving it every day. If you're using SuperDesk, you're part of our journey — and we appreciate you being here.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Tech Stack Section - Scrolling Marquee */}
            <section className="tech-stack-section">
                <div className="section-title-container">
                    <h2 className="section-title" style={{ color: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>Powered By</h2>
                </div>

                <div
                    className="tech-marquee-container"
                    onMouseEnter={(e) => e.currentTarget.querySelector('.tech-marquee-track').style.animationPlayState = 'paused'}
                    onMouseLeave={(e) => e.currentTarget.querySelector('.tech-marquee-track').style.animationPlayState = 'running'}
                >
                    <div className="tech-marquee-track">
                        {/* First set of icons */}
                        <div className="tech-item" title="React"><SiReact className="tech-icon react" /></div>
                        <div className="tech-item" title="Node.js"><SiNodedotjs className="tech-icon node" /></div>
                        <div className="tech-item" title="WebRTC"><SiWebrtc className="tech-icon webrtc" /></div>
                        <div className="tech-item" title="Electron"><SiElectron className="tech-icon electron" /></div>
                        <div className="tech-item" title="Socket.io"><SiSocketdotio className="tech-icon socket" /></div>
                        <div className="tech-item" title="Express"><SiExpress className="tech-icon express" /></div>
                        <div className="tech-item" title="GitHub"><SiGithub className="tech-icon github" /></div>
                        <div className="tech-item" title="Tailwind CSS"><SiTailwindcss className="tech-icon tailwind" /></div>
                        <div className="tech-item" title="Render"><RenderIcon className="tech-icon render" /></div>
                        <div className="tech-item" title="Supabase"><SiSupabase className="tech-icon supabase" /></div>
                        <div className="tech-item" title="Framer Motion"><SiFramer className="tech-icon framer" /></div>
                        <div className="tech-item" title="Vercel"><SiVercel className="tech-icon vercel" /></div>
                        <div className="tech-item" title="Kotlin"><SiKotlin className="tech-icon kotlin" /></div>
                        <div className="tech-item" title="Cloudflare"><SiCloudflare className="tech-icon cloudflare" /></div>
                        {/* Duplicate set for seamless loop */}
                        <div className="tech-item" title="React"><SiReact className="tech-icon react" /></div>
                        <div className="tech-item" title="Node.js"><SiNodedotjs className="tech-icon node" /></div>
                        <div className="tech-item" title="WebRTC"><SiWebrtc className="tech-icon webrtc" /></div>
                        <div className="tech-item" title="Electron"><SiElectron className="tech-icon electron" /></div>
                        <div className="tech-item" title="Socket.io"><SiSocketdotio className="tech-icon socket" /></div>
                        <div className="tech-item" title="Express"><SiExpress className="tech-icon express" /></div>
                        <div className="tech-item" title="GitHub"><SiGithub className="tech-icon github" /></div>
                        <div className="tech-item" title="Tailwind CSS"><SiTailwindcss className="tech-icon tailwind" /></div>
                        <div className="tech-item" title="Render"><RenderIcon className="tech-icon render" /></div>
                        <div className="tech-item" title="Supabase"><SiSupabase className="tech-icon supabase" /></div>
                        <div className="tech-item" title="Framer Motion"><SiFramer className="tech-icon framer" /></div>
                        <div className="tech-item" title="Vercel"><SiVercel className="tech-icon vercel" /></div>
                        <div className="tech-item" title="Kotlin"><SiKotlin className="tech-icon kotlin" /></div>
                        <div className="tech-item" title="Cloudflare"><SiCloudflare className="tech-icon cloudflare" /></div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}

            {/* Footer */}
            <footer className="portfolio-footer" style={{ position: 'relative' }}>
                {/* Global Bottom Grid Pattern */}
                <div style={{
                    position: 'absolute',
                    top: 'auto',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '600px',
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
                    zIndex: 0,
                    pointerEvents: 'none',
                }} />

                {/* Divider Line */}
                <div style={{
                    width: '120px',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)',
                    margin: '0 auto 40px',
                    position: 'relative',
                    zIndex: 1,
                }} />

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <img src={superdeskLogoText} alt="SuperDesk" style={{ height: '40px', width: 'auto' }} />
                </div>
                <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '28px',
                }}>
                    A unified digital workspace for modern teams.
                </p>

                {/* Icon Links Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    marginBottom: '28px',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    <a href="https://github.com/neeer4j/SuperDesk" target="_blank" rel="noopener noreferrer" style={{
                        color: 'rgba(255,255,255,0.4)',
                        transition: 'color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                    }} onMouseEnter={(e) => e.currentTarget.style.color = '#a78bfa'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                    </a>
                    <a href="https://github.com/neeer4j/SuperDesk/releases/download/v1.0.0/SuperDesk.Agent.Setup.1.0.0.exe" download style={{
                        color: 'rgba(255,255,255,0.4)',
                        transition: 'color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                    }} onMouseEnter={(e) => e.currentTarget.style.color = '#a78bfa'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    </a>
                    <a href="https://github.com/neeer4j/SuperDesk-Mobile/releases/download/v1.1/SuperDesk.Android.v1.1.apk" download style={{
                        color: 'rgba(255,255,255,0.4)',
                        transition: 'color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                    }} onMouseEnter={(e) => e.currentTarget.style.color = '#a78bfa'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </a>
                </div>

                <p style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.3)',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    © {new Date().getFullYear()} SuperDesk. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

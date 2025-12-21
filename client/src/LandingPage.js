import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import superdeskLogo from './assets/superdesk.png?v=3';
import superdeskLogoWhite from './assets/superdeskw.png';
import superdeskLogoLarge from './assets/superdeskL.png';
import superdeskLogoWhiteLarge from './assets/superdeskwL.png';
import SuperDeskClient from './SuperDeskClient';
import RemoteDesktopView from './RemoteDesktopView';

// SVG Icons matching agent app
const Icons = {
  monitor: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
  login: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
      <polyline points="10 17 15 12 10 7"></polyline>
      <line x1="15" y1="12" x2="3" y2="12"></line>
    </svg>
  ),
  file: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="M12 18v-6"></path>
      <path d="M9 15l3 3 3-3"></path>
    </svg>
  ),
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  message: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  userPlus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  logout: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  lock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  zap: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  upload: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

// Theme CSS Variables matching agent app
const getTheme = (isDark) => {
  if (isDark) {
    // Dark Mode
    return {
      primaryBg: '#0d0d14',
      secondaryBg: '#12121a',
      sidebarBg: '#0a0a10',
      sidebarText: '#e0e0e0',
      sidebarBorder: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#f0f0f5',
      textSecondary: 'rgba(255, 255, 255, 0.75)',
      textMuted: 'rgba(255, 255, 255, 0.45)',
      cardBg: 'rgba(255, 255, 255, 0.03)',
      cardBorder: 'rgba(255, 255, 255, 0.06)',
      cardShadow: '0 4px 32px rgba(0, 0, 0, 0.3)',
      inputBg: 'rgba(255, 255, 255, 0.04)',
      inputBorder: 'rgba(255, 255, 255, 0.1)',
      btnPrimaryBg: '#8b5cf6',
      btnPrimaryText: '#ffffff',
      glassBg: 'rgba(255, 255, 255, 0.02)',
      glassBorder: 'rgba(255, 255, 255, 0.05)',
      accentGlow: 'rgba(139, 92, 246, 0.1)',
      authLeftBg: '#16213e'
    };
  } else {
    // Light Mode (Purple Theme - Default)
    return {
      primaryBg: '#613da9',
      secondaryBg: '#f8f7fc',
      sidebarBg: '#ffffff',
      sidebarText: '#613da9',
      sidebarBorder: 'rgba(97, 61, 169, 0.12)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.9)',
      textMuted: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(80, 45, 140, 0.55)',
      cardBorder: 'rgba(255, 255, 255, 0.18)',
      cardShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      inputBg: 'rgba(0, 0, 0, 0.2)',
      inputBorder: 'rgba(255, 255, 255, 0.25)',
      btnPrimaryBg: '#ffffff',
      btnPrimaryText: '#613da9',
      glassBg: 'rgba(80, 45, 140, 0.4)',
      glassBorder: 'rgba(255, 255, 255, 0.15)',
      accentGlow: 'rgba(255, 255, 255, 0.25)',
      authLeftBg: '#613da9'
    };
  }
};

// Complete inline styles matching agent app
const getStyles = (darkTheme) => ({
  // Auth Container (Login Screen)
  authContainer: {
    display: 'flex',
    height: '100vh',
    background: darkTheme.primaryBg,
    color: darkTheme.textPrimary
  },
  authLeft: {
    width: '44%',
    minWidth: '340px',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
    position: 'relative',
    overflow: 'hidden'
  },
  authRight: {
    flex: 1,
    background: darkTheme.primaryBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px'
  },
  logoLarge: {
    width: '70%',
    maxWidth: '350px',
    height: 'auto',
    marginBottom: '24px',
    filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.1))'
  },
  brandText: {
    fontSize: '18px',
    fontWeight: 400,
    color: '#613da9',
    lineHeight: 1.6,
    textAlign: 'center'
  },
  authForm: {
    width: '100%',
    maxWidth: '400px'
  },
  authHeader: {
    marginBottom: '40px',
    textAlign: 'center'
  },
  authTitle: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#ffffff'
  },
  authSubtitle: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  inputField: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    marginBottom: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  btnPrimary: {
    width: '100%',
    padding: '14px 0',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
    background: '#ffffff',
    color: '#613da9',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  btnSecondary: {
    width: '100%',
    padding: '14px 0',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s'
  },
  // Dashboard Layout
  dashboardContainer: {
    display: 'flex',
    height: '100vh',
    background: darkTheme.primaryBg
  },
  // Sidebar
  dashboardSidebar: {
    width: '72px',
    background: darkTheme.sidebarBg,
    borderRight: `1px solid ${darkTheme.sidebarBorder}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0',
    gap: '8px'
  },
  sidebarLogo: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
    marginBottom: '16px'
  },
  navMenu: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
    padding: '0 8px'
  },
  navItem: (isActive) => ({
    width: '52px',
    height: '52px',
    padding: 0,
    margin: 0,
    background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    color: isActive ? '#a78bfa' : darkTheme.sidebarText,
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    transition: 'all 0.15s ease',
    position: 'relative'
  }),
  navItemActive: {
    position: 'absolute',
    left: '-8px',
    width: '4px',
    height: '24px',
    background: '#8b5cf6',
    borderRadius: '0 4px 4px 0'
  },
  // Main Content
  dashboardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: darkTheme.primaryBg,
    overflow: 'hidden'
  },
  // Content Header
  contentHeader: {
    padding: '20px 32px',
    borderBottom: `1px solid ${darkTheme.cardBorder}`,
    background: darkTheme.glassBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  contentHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  contentHeaderIcon: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#8b5cf6'
  },
  contentHeaderTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: darkTheme.textPrimary,
    letterSpacing: '-0.3px'
  },
  contentHeaderSubtitle: {
    fontSize: '13px',
    color: darkTheme.textMuted,
    marginTop: '2px'
  },
  headerUserPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px 8px 8px',
    background: darkTheme.glassBg,
    border: `1px solid ${darkTheme.glassBorder}`,
    borderRadius: '24px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  headerUserAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: 'white',
    fontWeight: 600,
    overflow: 'hidden'
  },
  headerUserName: {
    fontSize: '13px',
    fontWeight: 600,
    color: darkTheme.textPrimary,
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // Content Body
  contentBody: {
    flex: 1,
    padding: '32px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Join Session Styles
  joinMainCard: {
    background: darkTheme.cardBg,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${darkTheme.cardBorder}`,
    borderRadius: '20px',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxShadow: darkTheme.cardShadow
  },
  joinVisual: {
    position: 'relative',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '140px',
    height: '140px'
  },
  joinVisualRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '2px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '50%'
  },
  joinVisualIcon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6'
  },
  joinIdLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '12px'
  },
  sessionIdDisplay: {
    width: '100%',
    marginBottom: '20px'
  },
  joinInput: {
    width: '100%',
    padding: '20px 24px',
    background: darkTheme.inputBg,
    border: `2px solid ${darkTheme.inputBorder}`,
    borderRadius: '14px',
    color: darkTheme.textPrimary,
    fontSize: '24px',
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
    textAlign: 'center',
    letterSpacing: '3px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px'
  },
  sessionIdActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  },
  sessionActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: darkTheme.inputBg,
    border: `1px solid ${darkTheme.inputBorder}`,
    borderRadius: '8px',
    color: darkTheme.textSecondary,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sessionStatusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: darkTheme.glassBg,
    border: `1px solid ${darkTheme.glassBorder}`,
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '13px',
    color: darkTheme.textMuted
  },
  sessionStatusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  sessionStatusDivider: {
    width: '1px',
    height: '16px',
    background: darkTheme.cardBorder
  },
  statusIndicator: (isActive) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: isActive ? '#10b981' : '#6b7280',
    flexShrink: 0
  }),
  joinBtn: {
    width: '100%',
    maxWidth: '380px',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: '14px',
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  // Info Card
  infoCard: {
    background: darkTheme.cardBg,
    border: `1px solid ${darkTheme.cardBorder}`,
    borderRadius: '16px',
    padding: '20px',
    boxShadow: darkTheme.cardShadow,
    marginBottom: '16px'
  },
  infoCardIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6',
    marginBottom: '12px'
  },
  infoCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: darkTheme.textPrimary,
    marginBottom: '8px'
  },
  infoCardText: {
    fontSize: '13px',
    color: darkTheme.textMuted,
    lineHeight: 1.5
  },
  // Settings Panel styles
  settingsPanel: (isOpen) => ({
    position: 'fixed',
    top: 0,
    right: isOpen ? 0 : '-400px',
    width: '400px',
    height: '100vh',
    background: darkTheme.primaryBg,
    transition: 'right 0.3s ease-in-out',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '-4px 0 32px rgba(0, 0, 0, 0.3)',
    borderLeft: `1px solid ${darkTheme.cardBorder}`
  }),
  settingsHeader: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: `1px solid ${darkTheme.cardBorder}`
  },
  settingsBackBtn: {
    width: '36px',
    height: '36px',
    background: darkTheme.inputBg,
    border: 'none',
    borderRadius: '8px',
    color: darkTheme.textPrimary,
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  settingsTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: darkTheme.textPrimary
  },
  settingsContent: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    overflowX: 'hidden',
    // Custom scrollbar styling
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent'
  },
  settingsSection: {
    marginBottom: '24px'
  },
  settingsSectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px'
  },
  settingsItem: {
    background: darkTheme.inputBg,
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s'
  },
  settingsItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  settingsItemIcon: {
    width: '40px',
    height: '40px',
    background: 'rgba(139, 92, 246, 0.15)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6',
    flexShrink: 0
  },
  settingsItemText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  settingsItemLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: darkTheme.textPrimary
  },
  settingsItemDesc: {
    fontSize: '12px',
    color: darkTheme.textMuted
  },
  toggleSwitch: (isActive) => ({
    position: 'relative',
    width: '48px',
    height: '26px',
    background: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    flexShrink: 0
  }),
  toggleSwitchKnob: (isActive) => ({
    position: 'absolute',
    width: '22px',
    height: '22px',
    background: 'white',
    borderRadius: '50%',
    top: '2px',
    left: isActive ? '24px' : '2px',
    transition: 'all 0.3s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  }),
  settingsSelect: {
    padding: '8px 12px',
    background: darkTheme.inputBg,
    border: `1px solid ${darkTheme.inputBorder}`,
    borderRadius: '8px',
    color: darkTheme.textPrimary,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit'
  },
  settingsActionBtn: (variant) => ({
    width: '100%',
    padding: '12px',
    background: variant === 'danger' ? '#ef4444' : darkTheme.inputBg,
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '8px'
  }),
  settingsFooter: {
    padding: '20px 24px',
    borderTop: `1px solid ${darkTheme.cardBorder}`,
    textAlign: 'center'
  },
  settingsVersion: {
    fontSize: '12px',
    color: darkTheme.textMuted,
    marginBottom: '4px'
  },
  settingsCopyright: {
    fontSize: '11px',
    color: darkTheme.textMuted,
    opacity: 0.6
  },
  // Account Modal styles
  accountModalOverlay: (isOpen) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100001,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: 'all 0.2s ease-out'
  }),
  accountModal: (isOpen) => ({
    background: 'linear-gradient(145deg, #1a1a2e 0%, #0d0d14 100%)',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
    transition: 'all 0.2s ease-out',
    overflow: 'hidden'
  }),
  accountModalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  accountModalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'white'
  },
  accountModalClose: {
    width: '32px',
    height: '32px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  accountModalBody: {
    padding: '24px'
  },
  accountAvatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px'
  },
  accountAvatarPreview: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: 700,
    color: 'white',
    marginBottom: '12px',
    overflow: 'hidden'
  },
  accountAvatarBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  accountField: {
    marginBottom: '20px'
  },
  accountFieldLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px'
  },
  accountFieldInput: (disabled) => ({
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    fontFamily: 'inherit'
  }),
  accountFieldInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  usernamePrefix: {
    position: 'absolute',
    left: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    pointerEvents: 'none'
  },
  accountFieldHint: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '6px'
  },
  accountFieldError: {
    fontSize: '12px',
    color: '#f87171',
    marginTop: '6px'
  },
  accountFieldSuccess: {
    fontSize: '12px',
    color: '#34d399',
    marginTop: '6px'
  },
  accountModalFooter: {
    padding: '16px 24px 24px',
    display: 'flex',
    gap: '12px'
  },
  accountModalBtn: (variant, disabled) => ({
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    background: variant === 'primary' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: disabled ? 0.5 : 1
  }),
  // Friends styles
  friendsLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  addFriendCard: {
    background: darkTheme.cardBg,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${darkTheme.cardBorder}`,
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: darkTheme.cardShadow
  },
  addFriendHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 700,
    color: darkTheme.textPrimary,
    marginBottom: '16px'
  },
  addFriendForm: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  addFriendInput: {
    flex: 1,
    padding: '14px 18px',
    background: darkTheme.inputBg,
    border: `1px solid ${darkTheme.inputBorder}`,
    borderRadius: '10px',
    color: darkTheme.textPrimary,
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  addFriendBtn: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  friendsSection: {
    background: darkTheme.cardBg,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${darkTheme.cardBorder}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: darkTheme.cardShadow
  },
  friendsSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  friendsSectionTitle: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: darkTheme.textMuted
  },
  friendsBadge: {
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700
  },
  friendsEmpty: {
    textAlign: 'center',
    padding: '48px 32px',
    color: darkTheme.textMuted,
    fontSize: '13px',
    fontWeight: 500
  },
  // Messages styles
  messagesContainer: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    background: darkTheme.cardBg,
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: `1px solid ${darkTheme.cardBorder}`,
    boxShadow: darkTheme.cardShadow
  },
  conversationsPanel: {
    width: '380px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    borderRight: `1px solid ${darkTheme.glassBorder}`
  },
  conversationsHeader: {
    padding: '20px 24px',
    borderBottom: `1px solid ${darkTheme.glassBorder}`,
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: darkTheme.textMuted
  },
  conversationsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px'
  },
  conversationsEmpty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: darkTheme.textMuted,
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.5
  },
  chatPanel: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  chatPlaceholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: darkTheme.textMuted
  },
  chatPlaceholderIcon: {
    fontSize: '56px',
    marginBottom: '20px',
    opacity: 0.2
  },
  chatPlaceholderText: {
    fontSize: '14px',
    fontWeight: 500,
    opacity: 0.6
  },
  // Files styles
  filesLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },
  filesMainCard: {
    background: darkTheme.cardBg,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${darkTheme.cardBorder}`,
    borderRadius: '24px',
    padding: '60px 80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxShadow: darkTheme.cardShadow,
    minHeight: '0',
    flex: 1,
    position: 'relative'
  },
  filesVisual: {
    position: 'relative',
    marginBottom: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '140px',
    height: '140px'
  },
  filesVisualIcon: {
    width: '100px',
    height: '100px',
    background: 'transparent',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    color: 'rgba(139, 92, 246, 0.4)'
  },
  filesStatusTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: darkTheme.textPrimary,
    marginBottom: '12px',
    letterSpacing: '-0.5px'
  },
  filesStatusSubtitle: {
    fontSize: '15px',
    color: darkTheme.textMuted,
    marginBottom: '48px',
    opacity: 0.8
  },
  filesDropArea: {
    width: '100%',
    maxWidth: '700px',
    padding: '52px 70px',
    border: '2px dashed rgba(139, 92, 246, 0.25)',
    borderRadius: '20px',
    background: 'rgba(139, 92, 246, 0.04)',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  filesDropIcon: {
    marginBottom: '16px'
  },
  filesDropText: {
    fontSize: '18px',
    fontWeight: 600,
    color: darkTheme.textPrimary,
    marginBottom: '8px'
  },
  filesDropHint: {
    fontSize: '13px',
    color: darkTheme.textMuted
  },
  guestFileTransferZone: {
    position: 'fixed',
    right: '48px',
    bottom: '48px',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
    cursor: 'pointer',
    zIndex: 1000,
    transition: 'transform 0.2s ease',
    border: '3px solid rgba(139, 92, 246, 0.2)'
  },
  guestFileTransferZoneIcon: {
    color: 'white',
    fontSize: '28px'
  },
  filesInfoPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }
});

function LandingPage() {
  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Custom scrollbar for settings panel */
      .settings-content::-webkit-scrollbar {
        width: 8px;
      }
      .settings-content::-webkit-scrollbar-track {
        background: transparent;
      }
      .settings-content::-webkit-scrollbar-thumb {
        background: rgba(139, 92, 246, 0.5);
        border-radius: 4px;
      }
      .settings-content::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 92, 246, 0.7);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('join'); // Default to join (not share)
  const [joinSessionId, setJoinSessionId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [inSession, setInSession] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    autostart: false,
    audio: true,
    approval: true,
    history: false,
    videoQuality: 'auto'
  });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [hostPlatform, setHostPlatform] = useState(null); // 'android', 'electron', or null
  const clientRef = useRef(null);
  const usernameTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const darkTheme = getTheme(darkMode);
  const styles = getStyles(darkTheme);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      alert('Check your email for the OTP code!');
      setOtpSent(true);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
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
    } catch (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOtpSent(false);
    setOtp('');
    setEmail('');
  };

  const handleJoinSession = async () => {
    const sid = joinSessionId.trim().toUpperCase();
    if (!sid) {
      alert('Please enter a session ID');
      return;
    }

    if (sid.length !== 8) {
      alert('Session ID must be 8 characters');
      return;
    }

    setConnecting(true);

    try {
      if (!clientRef.current) {
        clientRef.current = new SuperDeskClient();

        clientRef.current.on('sessionJoined', () => {
          console.log('Successfully joined session');
          setSessionId(sid);
          setInSession(true);
          setConnecting(false);
        });

        clientRef.current.on('sessionEnded', () => {
          console.log('Session ended');
          setInSession(false);
          setSessionId('');
          clientRef.current = null;
        });

        clientRef.current.on('error', (error) => {
          console.error('Session error:', error);
          alert(`Error: ${error.message || 'Failed to join session'}`);
          setConnecting(false);
        });

        clientRef.current.on('hostInfo', (info) => {
          console.log('Received host platform info:', info);
          setHostPlatform(info.platform || null);
        });
      }

      await clientRef.current.joinSession(sid);
    } catch (error) {
      console.error('Failed to join session:', error);
      alert('Failed to join session: ' + error.message);
      setConnecting(false);
    }
  };

  const handleContinue = () => {
    setUser({ email: 'test@example.com', id: 'test-user' });
  };

  const handleAddFriend = () => {
    if (!friendEmail.trim()) {
      alert('Please enter a username or email');
      return;
    }
    alert(`Friend request sent to: ${friendEmail}`);
    setFriendEmail('');
  };

  const toggleSetting = (settingName) => {
    setSettings(prev => ({
      ...prev,
      [settingName]: !prev[settingName]
    }));
  };

  const toggleDarkModeHandler = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('superdeskTheme', newMode ? 'dark' : 'light');
      // Apply to document for CSS theme switching
      if (newMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      return newMode;
    });
  };

  const handleVideoQualityChange = (e) => {
    setSettings(prev => ({
      ...prev,
      videoQuality: e.target.value
    }));
  };

  const openAccountModal = () => {
    setAccountModalOpen(true);
    setUsername('');
    setUsernameError('');
    setUsernameSuccess('');
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setUsernameError('');
    setUsernameSuccess('');
  };

  const validateUsername = (value) => {
    // Clear previous timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    // Reset states
    setUsernameError('');
    setUsernameSuccess('');

    // Empty is allowed
    if (!value || value.trim() === '') {
      return;
    }

    const usernameValue = value.trim().toLowerCase();

    // Check format: letters, numbers, underscores, periods (3-30 chars)
    const usernameRegex = /^[a-z0-9._]{3,30}$/;
    if (!usernameRegex.test(usernameValue)) {
      setUsernameError('Username must be 3-30 characters, only letters, numbers, underscores and periods');
      return;
    }

    // Cannot start or end with period, no consecutive periods
    if (usernameValue.startsWith('.') || usernameValue.endsWith('.') || usernameValue.includes('..')) {
      setUsernameError('Username cannot start/end with a period or have consecutive periods');
      return;
    }

    // Simulate availability check (debounced)
    usernameTimeoutRef.current = setTimeout(() => {
      setUsernameSuccess('✓ Username is available');
    }, 500);
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  const handleSaveAccount = async () => {
    if (usernameError) return;

    setSavingAccount(true);

    // Simulate save
    setTimeout(() => {
      alert('Profile updated successfully!');
      setSavingAccount(false);
      closeAccountModal();
    }, 1000);
  };

  useEffect(() => {
    // Initialize theme from localStorage (default to light mode)
    const savedTheme = localStorage.getItem('superdeskTheme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setDarkMode(false);
      document.documentElement.removeAttribute('data-theme');
      // Ensure light mode is explicitly set
      if (savedTheme === null) {
        localStorage.setItem('superdeskTheme', 'light');
      }
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get user display info
  const getUserDisplay = () => {
    if (!user) return { name: '', initial: '?' };
    const email = user.email || '';
    const name = user.user_metadata?.name || email.split('@')[0] || 'User';
    const initial = name.charAt(0).toUpperCase();
    return { name, initial, email };
  };

  const userInfo = getUserDisplay();

  // Authentication Screen
  if (!user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authLeft}>
          {/* Light mode logo */}
          {!darkMode && (
            <img
              src={superdeskLogoLarge}
              alt="SuperDesk"
              style={styles.logoLarge}
              onError={(e) => { e.target.src = superdeskLogo; }}
            />
          )}
          {/* Dark mode logo */}
          {darkMode && (
            <img
              src={superdeskLogoWhiteLarge}
              alt="SuperDesk"
              style={styles.logoLarge}
              onError={(e) => { e.target.src = superdeskLogoWhite; }}
            />
          )}
          <div style={styles.brandText}>
            Secure remote desktop sharing<br />for modern teams
          </div>
        </div>

        <div style={styles.authRight}>
          <div style={styles.authForm}>
            <div style={styles.authHeader}>
              <h1 style={styles.authTitle}>
                {otpSent ? 'Verify OTP' : 'Welcome Back!'}
              </h1>
              <p style={styles.authSubtitle}>
                {otpSent
                  ? 'Enter the code sent to your email'
                  : 'Sign in to access your remote desktop'
                }
              </p>
            </div>

            {!otpSent ? (
              <>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                  disabled={loading}
                  style={styles.inputField}
                />

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={{
                    ...styles.btnPrimary,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>

                <button
                  onClick={handleContinue}
                  style={styles.btnSecondary}
                >
                  Continue Without Auth (Testing)
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  disabled={loading}
                  maxLength={6}
                  style={styles.inputField}
                />

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  style={{
                    ...styles.btnPrimary,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  style={styles.btnSecondary}
                >
                  Back to Email
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show remote desktop view when in session
  if (inSession && clientRef.current && sessionId) {
    return (
      <RemoteDesktopView
        client={clientRef.current}
        sessionId={sessionId}
        hostPlatform={hostPlatform}
        onClose={() => {
          setInSession(false);
          setSessionId('');
          setHostPlatform(null);
          clientRef.current = null;
        }}
      />
    );
  }

  // Get header info based on active view
  const getHeaderInfo = () => {
    switch (activeView) {
      case 'join':
        return { icon: Icons.login, title: 'Join Session', subtitle: 'Connect to a remote desktop' };
      case 'friends':
        return { icon: Icons.users, title: 'Friends', subtitle: 'Manage your connections' };
      case 'messages':
        return { icon: Icons.message, title: 'Messages', subtitle: 'Chat with friends' };
      case 'files':
        return { icon: Icons.file, title: 'File Transfer', subtitle: 'Send and receive files' };
      default:
        return { icon: Icons.login, title: 'Join Session', subtitle: 'Connect to a remote desktop' };
    }
  };

  const headerInfo = getHeaderInfo();

  // Dashboard Screen - Share Screen is HIDDEN
  return (
    <div style={styles.dashboardContainer}>
      {/* Left Sidebar - Icon Rail (Share Screen removed) */}
      <div style={styles.dashboardSidebar}>
        <img
          src={superdeskLogo}
          alt="SuperDesk"
          style={styles.sidebarLogo}
          onError={(e) => { e.target.src = superdeskLogo; }}
        />

        <nav style={styles.navMenu}>
          <button
            onClick={() => setActiveView('join')}
            style={styles.navItem(activeView === 'join')}
            title="Join Session"
          >
            {activeView === 'join' && <span style={styles.navItemActive}></span>}
            {Icons.login}
          </button>

          <button
            onClick={() => setActiveView('files')}
            style={styles.navItem(activeView === 'files')}
            title="File Transfer"
          >
            {activeView === 'files' && <span style={styles.navItemActive}></span>}
            {Icons.file}
          </button>

          <button
            onClick={() => setActiveView('friends')}
            style={styles.navItem(activeView === 'friends')}
            title="Friends"
          >
            {activeView === 'friends' && <span style={styles.navItemActive}></span>}
            {Icons.users}
          </button>

          <button
            onClick={() => setActiveView('messages')}
            style={styles.navItem(activeView === 'messages')}
            title="Messages"
          >
            {activeView === 'messages' && <span style={styles.navItemActive}></span>}
            {Icons.message}
          </button>
        </nav>

        {/* Settings at bottom */}
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            ...styles.navItem(false),
            marginTop: 'auto'
          }}
          title="Settings"
        >
          {Icons.settings}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            ...styles.navItem(false),
            marginTop: '8px'
          }}
          title="Sign Out"
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = darkTheme.sidebarText}
        >
          {Icons.logout}
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.dashboardContent}>
        {/* Content Header */}
        <div style={styles.contentHeader}>
          <div style={styles.contentHeaderLeft}>
            <div style={styles.contentHeaderIcon}>
              {headerInfo.icon}
            </div>
            <div>
              <div style={styles.contentHeaderTitle}>{headerInfo.title}</div>
              <div style={styles.contentHeaderSubtitle}>{headerInfo.subtitle}</div>
            </div>
          </div>
          <div
            onClick={openAccountModal}
            style={{
              ...styles.headerUserPill,
              cursor: 'pointer'
            }}
          >
            <div style={styles.headerUserAvatar}>
              {userInfo.initial}
            </div>
            <span style={styles.headerUserName}>@{userInfo.name}</span>
          </div>
        </div>

        {/* Content Body */}
        <div style={styles.contentBody}>
          {/* Join Session View */}
          {activeView === 'join' && (
            <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '1200px', alignItems: 'stretch' }}>
              {/* Main Join Card */}
              <div style={{ ...styles.joinMainCard, flex: 1, maxWidth: 'none' }}>
                <div style={styles.joinVisual}>
                  <div style={styles.joinVisualRing}></div>
                  <div style={styles.joinVisualIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                  </div>
                </div>

                <div style={styles.sessionIdDisplay}>
                  <div style={styles.joinIdLabel}>SESSION CODE</div>

                  <input
                    type="text"
                    placeholder="ddem5239"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value.toLowerCase())}
                    maxLength={8}
                    style={styles.joinInput}
                  />

                  <div style={styles.sessionIdActions}>
                    <button
                      onClick={() => {
                        navigator.clipboard.readText().then(text => {
                          setJoinSessionId(text.trim().toLowerCase());
                        }).catch(() => alert('Failed to read clipboard'));
                      }}
                      style={styles.sessionActionBtn}
                    >
                      {Icons.file}
                      <span>Paste</span>
                    </button>
                    <button
                      onClick={() => setJoinSessionId('')}
                      style={styles.sessionActionBtn}
                    >
                      {Icons.x}
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <div style={styles.sessionStatusBar}>
                  <div style={styles.sessionStatusItem}>
                    <span style={styles.statusIndicator(connecting)}></span>
                    <span>{connecting ? 'Connecting' : 'Ready'}</span>
                  </div>
                  <div style={styles.sessionStatusDivider}></div>
                  <div style={styles.sessionStatusItem}>
                    <span>Enter code to connect</span>
                  </div>
                </div>

                <button
                  onClick={handleJoinSession}
                  disabled={connecting}
                  style={{
                    ...styles.joinBtn,
                    opacity: connecting ? 0.7 : 1,
                    cursor: connecting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span style={{ fontSize: '16px', marginRight: '8px' }}>▶</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700 }}>{connecting ? 'Joining...' : 'Connect to Session'}</span>
                    <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: 400 }}>Enter code above to connect</span>
                  </div>
                </button>
              </div>

              {/* Tip Card on the Side */}
              <div style={{ width: '280px', flexShrink: 0 }}>
                <div style={styles.infoCard}>
                  <div style={styles.infoCardIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div style={styles.infoCardTitle}>Tip</div>
                  <div style={styles.infoCardText}>
                    The remote desktop will open in a new window once the host starts sharing.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Friends View */}
          {activeView === 'friends' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', overflow: 'auto', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
              <div style={styles.addFriendCard}>
                <div style={styles.addFriendHeader}>
                  {Icons.userPlus}
                  <span>Add a Friend</span>
                </div>
                <div style={styles.addFriendForm}>
                  <input
                    type="text"
                    placeholder="Search by @username or email..."
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
                    style={styles.addFriendInput}
                  />
                  <button
                    onClick={handleAddFriend}
                    style={styles.addFriendBtn}
                  >
                    Send Request
                  </button>
                  <button
                    style={{
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '10px',
                      color: darkTheme.textPrimary,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ ...styles.friendsSection, flex: 1, minHeight: '300px' }}>
                <div style={styles.friendsSectionHeader}>
                  <span style={styles.friendsSectionTitle}>YOUR FRIENDS</span>
                  <span style={styles.friendsBadge}>0</span>
                </div>
                <div style={styles.friendsEmpty}>No friends yet. Add someone to get started!</div>
              </div>
            </div>
          )}

          {/* Messages View */}
          {activeView === 'messages' && (
            <div style={{ ...styles.messagesContainer, flex: 1, margin: '24px', maxWidth: '1600px', marginLeft: 'auto', marginRight: 'auto', width: 'calc(100% - 48px)' }}>
              <div style={styles.conversationsPanel}>
                <div style={styles.conversationsHeader}>
                  <span>CONVERSATIONS</span>
                </div>
                <div style={styles.conversationsList}>
                  <div style={styles.conversationsEmpty}>No conversations yet. Message a friend to start!</div>
                </div>
              </div>

              <div style={styles.chatPanel}>
                <div style={styles.chatPlaceholder}>
                  <div style={styles.chatPlaceholderIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" opacity="0.3">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div style={styles.chatPlaceholderText}>Select a conversation to start chatting</div>
                </div>
              </div>
            </div>
          )}

          {/* File Transfer View */}
          {activeView === 'files' && (
            <div style={{ flex: 1, display: 'flex', gap: '24px', padding: '24px', overflow: 'hidden', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
              <div style={styles.filesMainCard}>
                <div style={styles.filesVisual}>
                  <div style={styles.filesVisualIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M12 18v-6" />
                      <path d="M9 15l3 3 3-3" />
                    </svg>
                  </div>
                </div>

                <div style={styles.filesStatusTitle}>File Transfer</div>
                <div style={styles.filesStatusSubtitle}>Connect to a session to send or receive files</div>

                <div style={styles.filesDropArea} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <div style={styles.filesDropIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36" style={{ color: 'rgba(139, 92, 246, 0.6)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div style={styles.filesDropText}>Drag & drop files here</div>
                  <div style={styles.filesDropHint}>or click to browse</div>
                </div>

                <input ref={fileInputRef} type="file" style={{ display: 'none' }} multiple onChange={(e) => { console.log('Selected files', e.target.files); }} />

                {/* Floating file button - bottom right of the entire view */}
              </div>

              <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={styles.infoCard}>
                  <div style={styles.infoCardIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div style={styles.infoCardTitle}>How it works</div>
                  <div style={styles.infoCardText}>
                    Files are transferred directly peer-to-peer. Start or join a session first, then use this page to send files.
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoCardIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div style={styles.infoCardTitle}>Secure Transfer</div>
                  <div style={styles.infoCardText}>
                    All files are encrypted end-to-end and transferred directly between devices.
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoCardIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div style={styles.infoCardTitle}>Recent Transfers</div>
                  <div style={styles.infoCardText}>No recent transfers</div>
                </div>
              </div>

              {/* Floating file transfer button */}
              {activeView === 'files' && (
                <div
                  style={styles.guestFileTransferZone}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Browse files"
                >
                  <div style={styles.guestFileTransferZoneIcon}>📁</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <div style={styles.settingsPanel(settingsOpen)}>
        <div style={styles.settingsHeader}>
          <button
            onClick={() => setSettingsOpen(false)}
            style={styles.settingsBackBtn}
          >
            ←
          </button>
          <h2 style={styles.settingsTitle}>Settings</h2>
        </div>

        <div style={styles.settingsContent} className="settings-content">
          {/* Account Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Account</div>
            <div
              onClick={openAccountModal}
              style={{
                ...styles.settingsItem,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = darkTheme.inputBg}
            >
              <div style={styles.settingsItemLeft}>
                <div style={{
                  ...styles.settingsItemIcon,
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '16px'
                }}>
                  {userInfo.initial}
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>{userInfo.email}</div>
                  <div style={styles.settingsItemDesc}>@{userInfo.name}</div>
                </div>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px' }}>›</div>
            </div>
          </div>

          {/* Appearance Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Appearance</div>
            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Dark Mode</div>
                  <div style={styles.settingsItemDesc}>Switch to dark theme</div>
                </div>
              </div>
              <div
                onClick={toggleDarkModeHandler}
                style={styles.toggleSwitch(darkMode)}
              >
                <div style={styles.toggleSwitchKnob(darkMode)}></div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Preferences</div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Notifications</div>
                  <div style={styles.settingsItemDesc}>Get notified when someone joins</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('notifications')}
                style={styles.toggleSwitch(settings.notifications)}
              >
                <div style={styles.toggleSwitchKnob(settings.notifications)}></div>
              </div>
            </div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Sound Effects</div>
                  <div style={styles.settingsItemDesc}>Play sounds for events</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('sounds')}
                style={styles.toggleSwitch(settings.sounds)}
              >
                <div style={styles.toggleSwitchKnob(settings.sounds)}></div>
              </div>
            </div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Start on System Boot</div>
                  <div style={styles.settingsItemDesc}>Launch SuperDesk automatically</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('autostart')}
                style={styles.toggleSwitch(settings.autostart)}
              >
                <div style={styles.toggleSwitchKnob(settings.autostart)}></div>
              </div>
            </div>
          </div>

          {/* Connection Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Connection</div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="2" y="7" width="20" height="15" rx="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Video Quality</div>
                  <div style={styles.settingsItemDesc}>Adjust stream quality</div>
                </div>
              </div>
              <select
                value={settings.videoQuality}
                onChange={handleVideoQualityChange}
                style={styles.settingsSelect}
              >
                <option value="auto">Auto</option>
                <option value="high">High (1080p)</option>
                <option value="medium">Medium (720p)</option>
                <option value="low">Low (480p)</option>
              </select>
            </div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Share Audio</div>
                  <div style={styles.settingsItemDesc}>Include system audio in share</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('audio')}
                style={styles.toggleSwitch(settings.audio)}
              >
                <div style={styles.toggleSwitchKnob(settings.audio)}></div>
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Privacy & Security</div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Require Approval</div>
                  <div style={styles.settingsItemDesc}>Approve before remote control</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('approval')}
                style={styles.toggleSwitch(settings.approval)}
              >
                <div style={styles.toggleSwitchKnob(settings.approval)}></div>
              </div>
            </div>

            <div style={styles.settingsItem}>
              <div style={styles.settingsItemLeft}>
                <div style={styles.settingsItemIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div style={styles.settingsItemText}>
                  <div style={styles.settingsItemLabel}>Session History</div>
                  <div style={styles.settingsItemDesc}>Keep connection logs</div>
                </div>
              </div>
              <div
                onClick={() => toggleSetting('history')}
                style={styles.toggleSwitch(settings.history)}
              >
                <div style={styles.toggleSwitchKnob(settings.history)}></div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsSectionTitle}>Actions</div>
            <button
              onClick={() => alert('Session data cleared')}
              style={styles.settingsActionBtn('secondary')}
            >
              Clear Session Data
            </button>
            <button
              onClick={() => alert('You are using the latest version')}
              style={styles.settingsActionBtn('secondary')}
            >
              Check for Updates
            </button>
            <button
              onClick={handleSignOut}
              style={styles.settingsActionBtn('danger')}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div style={styles.settingsFooter}>
          <div style={styles.settingsVersion}>SuperDesk v1.0.0</div>
          <div style={styles.settingsCopyright}>© 2025 SuperDesk. All rights reserved.</div>
        </div>
      </div>

      {/* Account Modal */}
      <div
        style={styles.accountModalOverlay(accountModalOpen)}
        onClick={(e) => e.target === e.currentTarget && closeAccountModal()}
      >
        <div style={styles.accountModal(accountModalOpen)}>
          <div style={styles.accountModalHeader}>
            <div style={styles.accountModalTitle}>Edit Profile</div>
            <button
              onClick={closeAccountModal}
              style={styles.accountModalClose}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              ×
            </button>
          </div>

          <div style={styles.accountModalBody}>
            {/* Avatar Section */}
            <div style={styles.accountAvatarSection}>
              <div style={styles.accountAvatarPreview}>
                {userInfo.initial}
              </div>
              <button
                onClick={() => alert('Avatar upload coming soon!')}
                style={styles.accountAvatarBtn}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                📷 Change Photo
              </button>
            </div>

            {/* Email Field (Read-only) */}
            <div style={styles.accountField}>
              <div style={styles.accountFieldLabel}>Email</div>
              <input
                type="text"
                value={userInfo.email}
                disabled
                style={styles.accountFieldInput(true)}
              />
              <div style={styles.accountFieldHint}>Your email cannot be changed</div>
            </div>

            {/* Username Field */}
            <div style={styles.accountField}>
              <div style={styles.accountFieldLabel}>Username</div>
              <div style={styles.accountFieldInputWrapper}>
                <span style={styles.usernamePrefix}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  maxLength={30}
                  style={{
                    ...styles.accountFieldInput(false),
                    paddingLeft: '24px'
                  }}
                />
              </div>
              <div style={styles.accountFieldHint}>
                Letters, numbers, underscores and periods. 3-30 characters.
              </div>
              {usernameError && (
                <div style={styles.accountFieldError}>{usernameError}</div>
              )}
              {usernameSuccess && (
                <div style={styles.accountFieldSuccess}>{usernameSuccess}</div>
              )}
            </div>
          </div>

          <div style={styles.accountModalFooter}>
            <button
              onClick={closeAccountModal}
              style={styles.accountModalBtn('secondary', false)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAccount}
              disabled={savingAccount || !!usernameError}
              style={styles.accountModalBtn('primary', savingAccount || !!usernameError)}
              onMouseEnter={(e) => !savingAccount && !usernameError && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !savingAccount && !usernameError && (e.currentTarget.style.opacity = '1')}
            >
              {savingAccount ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

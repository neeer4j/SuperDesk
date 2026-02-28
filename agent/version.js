/**
 * SuperDesk Desktop Agent - Version Information
 * This file tracks the version and changelog for the desktop agent
 */

const VERSION = '1.3.1';
const BUILD_DATE = '2026-02-28';

const CHANGELOG = {
  '1.3.1': {
    date: '2026-02-28',
    changes: [
      'Added auto-reconnect logic for dropped connections',
      'Improved connection quality monitoring',
      'Enhanced session activity tracking',
      'Better error messages and user feedback',
      'Added session timeout cleanup (30 min inactivity)',
      'Implemented rate limiting for session creation',
      'Performance optimizations for mouse control'
    ]
  },
  '1.3.0': {
    date: '2026-02-15',
    changes: [
      'Direct Windows API mouse control via koffi',
      'Ultra-low latency input processing',
      'H.264/H.265 codec support for Android streams',
      'Bidirectional audio support',
      'Camera overlay features',
      'File transfer via drag-and-drop'
    ]
  },
  '1.2.0': {
    date: '2026-01-20',
    changes: [
      'WebRTC peer-to-peer connections',
      'Screen sharing capabilities',
      'Remote control implementation',
      'Session management',
      'Floating toolbar interface'
    ]
  }
};

module.exports = {
  VERSION,
  BUILD_DATE,
  CHANGELOG,
  
  getVersionInfo() {
    return {
      version: VERSION,
      buildDate: BUILD_DATE,
      latestChanges: CHANGELOG[VERSION]
    };
  },
  
  getFullChangelog() {
    return CHANGELOG;
  },
  
  printVersion() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║   SuperDesk Desktop Agent v${VERSION}     ║`);
    console.log(`║   Build: ${BUILD_DATE}                   ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    
    const latest = CHANGELOG[VERSION];
    console.log(`Latest updates (${latest.date}):`);
    latest.changes.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change}`);
    });
    console.log('');
  }
};

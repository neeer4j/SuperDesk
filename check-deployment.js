#!/usr/bin/env node

/**
 * SuperDesk Deployment Status Checker
 * Verifies if your deployment is ready for multi-device connections
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3001',
  timeout: 5000
};

console.log('🔍 SuperDesk Deployment Status Check\n');

// Check if URL is reachable
async function checkEndpoint(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, { timeout: CONFIG.timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode;
      
      if (status >= 200 && status < 400) {
        console.log(`✅ ${description}`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${status}`);
        console.log(`   Response Time: ${responseTime}ms\n`);
        resolve(true);
      } else {
        console.log(`❌ ${description}`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${status}\n`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}`);
      console.log(`   URL: ${url}`);
      console.log(`   Error: ${err.message}\n`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${description}`);
      console.log(`   URL: ${url}`);
      console.log(`   Error: Request timeout\n`);
      resolve(false);
    });
  });
}

// Main check function
async function runChecks() {
  console.log(`📋 Configuration:`);
  console.log(`   Client URL: ${CONFIG.CLIENT_URL}`);
  console.log(`   Server URL: ${CONFIG.SERVER_URL}\n`);

  const results = [];

  // Check server health
  results.push(await checkEndpoint(`${CONFIG.SERVER_URL}/health`, 'Server Health Check'));
  
  // Check server info
  results.push(await checkEndpoint(`${CONFIG.SERVER_URL}/api/info`, 'Server Info Endpoint'));
  
  // Check client (if deployed)
  if (CONFIG.CLIENT_URL.includes('vercel.app') || CONFIG.CLIENT_URL.includes('netlify.app')) {
    results.push(await checkEndpoint(CONFIG.CLIENT_URL, 'Client Deployment'));
  } else if (CONFIG.CLIENT_URL.includes('localhost')) {
    console.log('ℹ️  Client running locally - skipping remote check\n');
  }

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`📊 Summary: ${passed}/${total} checks passed\n`);

  if (passed === total) {
    console.log('🎉 Your SuperDesk deployment is ready!');
    console.log('🌍 Multi-device connections should work globally.\n');
    
    console.log('🚀 Next Steps:');
    console.log('1. Open your client URL on Device 1');
    console.log('2. Create a session and note the Session ID');
    console.log('3. Open the same URL on Device 2');
    console.log('4. Join using the Session ID');
    console.log('5. Test file transfer and audio/video!\n');
  } else {
    console.log('⚠️  Some checks failed. Please review the deployment.');
    console.log('📖 Check DEPLOYMENT.md for troubleshooting steps.\n');
  }
}

// Handle command line usage
if (require.main === module) {
  runChecks().catch(console.error);
}

module.exports = { checkEndpoint, runChecks };
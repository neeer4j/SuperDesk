// server/check_turn.js
// Simple smoke-test to verify Cloudflare TURN credentials via server/turn-provider.js

require('dotenv').config();

const provider = require('./turn-provider');

async function run() {
  console.log('🔎 Running Cloudflare TURN provider smoke-test');
  try {
    const servers = await provider.getTurnServers(3600);
    if (!servers || !servers.length) {
      console.error('❌ No ICE servers returned');
      process.exitCode = 2;
      return;
    }

    console.log('✅ Received ICE servers:');
    servers.forEach((s, i) => {
      console.log(`  [${i+1}] urls: ${Array.isArray(s.urls) ? s.urls.join(',') : s.urls}`);
      console.log(`       username: ${s.username}`);
      console.log(`       credential: ${s.credential ? '***present***' : 'MISSING'}`);
    });

    console.log('\n🎉 Cloudflare TURN provider seems to be returning credentials.');
  } catch (err) {
    console.error('❌ Error while fetching TURN credentials:');
    console.error(err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exitCode = 3;
  }
}

run();

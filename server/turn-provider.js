// server/turn-provider.js
// Cloudflare Realtime TURN provider implementation (template)
// Copy of this file may contain secrets via env vars - DO NOT commit real secrets to git.

// Supported env variables:
// - CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_KEY_API_TOKEN (preferred for rtc.live.cloudflare.com)
// - CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (legacy /realtime/turn-credentials endpoint)

// This implementation attempts to use global fetch (Node 18+). If not available, it will try to require 'node-fetch'.

let fetchFn = global.fetch;
if (!fetchFn) {
  try {
    // node-fetch v3 is ESM; this require may only work on older node-fetch versions.
    fetchFn = require('node-fetch');
  } catch (e) {
    throw new Error('No global fetch available and node-fetch is not installed. Please run `npm install node-fetch` or use Node 18+');
  }
}

module.exports = {
  // Request ephemeral TURN credentials from Cloudflare Realtime API
  // Returns an array of objects: { urls: 'turn:...', username: '...', credential: '...' }
  async getTurnServers(ttlSeconds = 3600) {
    const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID || process.env.TURN_KEY_ID;
    const turnKeyToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN || process.env.CLOUDFLARE_TURN_KEY_TOKEN || process.env.TURN_KEY_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY;

    const hasTurnKey = Boolean(turnKeyId && turnKeyToken);
    const hasLegacyRealtime = Boolean(accountId && apiToken);

    if (!hasTurnKey && !hasLegacyRealtime) {
      console.log('Cloudflare TURN provider not configured: set TURN key env or account-level env');
      return null;
    }

    const url = hasTurnKey
      ? `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate`
      : `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/turn-credentials`;
    const bearerToken = hasTurnKey ? turnKeyToken : apiToken;

    try {
      const resp = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttl: ttlSeconds })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Cloudflare TURN request failed: ${resp.status} ${resp.statusText} - ${text}`);
      }

      const data = await resp.json();
      console.log('[TURN] Raw Cloudflare response:', JSON.stringify(data, null, 2));
      
      // Handle different response structures:
      // 1. TURN key API: { "iceServers": { "urls": [...], "username": "...", "credential": "..." } }
      // 2. Legacy Realtime: { "result": { "credentials": { ... } } }
      const result = data.result || data;
      const payload = result.credentials || result.iceServers || result;
      
      if (!payload || (!payload.urls && !payload.turn_urls && !payload.ice_servers && !payload.uris)) {
        const msg = `Unexpected Cloudflare TURN response shape: ${JSON.stringify(data)}`;
        console.warn(msg);
        throw new Error(msg);
      }

      // Normalize possible field names
      const urls = payload.uris || payload.urls || payload.turn_urls || payload.ice_servers || [];
      const username = payload.username || payload.user || payload.auth?.username;
      const credential = payload.password || payload.credential || payload.auth?.password;

      if (!Array.isArray(urls) || !urls.length || !username || !credential) {
        const msg = `Incomplete Cloudflare TURN response: ${JSON.stringify({ urls, username, credential })}`;
        console.warn(msg);
        throw new Error(msg);
      }

      const servers = urls.map(u => ({ urls: u, username, credential }));
      console.log('Obtained Cloudflare TURN servers:', servers.map(s => s.urls));
      return servers;
    } catch (err) {
      console.error('Error fetching Cloudflare TURN credentials:', err);
      return null;
    }
  }
};

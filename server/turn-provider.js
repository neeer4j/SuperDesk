// server/turn-provider.js
// Cloudflare Realtime TURN provider implementation (template)
// Copy of this file may contain secrets via env vars - DO NOT commit real secrets to git.

// Required env variables:
// CLOUDFLARE_ACCOUNT_ID - your Cloudflare account id
// CLOUDFLARE_API_TOKEN  - a scoped API token with permission to mint realtime TURN credentials

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
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY;

    if (!accountId || !apiToken) {
      console.log('Cloudflare TURN provider not configured: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
      return null;
    }

    // Cloudflare Realtime TURN credentials endpoint (illustrative - verify with current CF docs)
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/turn-credentials`;

    try {
      const resp = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttl: ttlSeconds })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Cloudflare TURN request failed: ${resp.status} ${resp.statusText} - ${text}`);
      }

      const data = await resp.json();
      // Data shape may be { result: { username, password, urls: [...] } } or { username, password, urls }
      const result = data.result || data;
      if (!result || (!result.urls && !result.turn_urls && !result.ice_servers)) {
        const msg = `Unexpected Cloudflare TURN response shape: ${JSON.stringify(data)}`;
        console.warn(msg);
        throw new Error(msg);
      }

      // Normalize possible field names
      const urls = result.urls || result.turn_urls || result.ice_servers || [];
      const username = result.username || result.user || result.auth?.username;
      const credential = result.password || result.credential || result.auth?.password;

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

/*
  turn-provider.example.js

  Placeholder examples for obtaining TURN credentials from a provider.
  Copy this file to `turn-provider.js` and implement the provider-specific
  logic. Do NOT commit your real API keys or `turn-provider.js` to git.

  Usage:
    const turnProvider = require('./turn-provider');
    // inside /api/webrtc-config handler:
    const providerServers = await turnProvider.getTurnServers();
    // providerServers should be an array of { urls, username, credential }

  Two example flows are shown below as commented samples:
   - Generic provider that accepts a POST with TTL and returns credentials
   - Cloudflare Realtime style (illustrative) — adapt per provider docs
*/

const fetch = require('node-fetch'); // `node-fetch` may be required in older Node versions

module.exports = {
  // Implement this function in your local copy (server/turn-provider.js)
  // It must return an array of ICE server objects or null if unavailable.
  // Example return value:
  // [ { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' } ]
  async getTurnServers() {
    throw new Error('getTurnServers not implemented. Copy turn-provider.example.js -> turn-provider.js and implement provider API calls.');
  }
};

/* --------------------- Example 1: Generic TURN provider (ephemeral creds) -------------------

// Example implementation sketch (replace endpoint + payload with provider docs):

const GENERIC_API_URL = 'https://api.provider.example.com/v1/turn';

async function getTurnServers_Generic() {
  const apiKey = process.env.PROVIDER_API_KEY;
  if (!apiKey) return null;

  const resp = await fetch(GENERIC_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ttl: 3600 })
  });

  if (!resp.ok) throw new Error('Provider TURN request failed: ' + resp.status);
  const data = await resp.json();
  // provider expected response shape (example): { username, credential, urls: ['turn:...'] }
  return (data.urls || []).map(url => ({ urls: url, username: data.username, credential: data.credential }));
}

/* --------------------- Example 2: Cloudflare Realtime (illustrative) -------------------

// Cloudflare's exact Realtime/TURN API may differ — read their docs. Typical flow:
// 1. Server calls Cloudflare API with API token to get ephemeral ICE credentials / token
// 2. Cloudflare returns a short-lived username and password and TURN/STUN urls

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4/accounts/<account-id>/realtime/turn-credentials';

async function getTurnServers_Cloudflare() {
  const apiKey = process.env.CLOUDFLARE_API_TOKEN; // or PROVIDER_API_KEY
  if (!apiKey) return null;

  const resp = await fetch(CLOUDFLARE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ttl: 3600 })
  });

  if (!resp.ok) throw new Error('Cloudflare TURN request failed: ' + resp.status);
  const data = await resp.json();

  // Example shape (illustrative): { result: { username, password, urls: [...] } }
  const res = data.result || data;
  return (res.urls || []).map(url => ({ urls: url, username: res.username || res.user, credential: res.password || res.credential }));
}

*/

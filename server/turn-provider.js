// Unified Cloudflare TURN provider
function getFetch() {
  if (typeof global.fetch === 'function') return global.fetch;
  try { const nf = require('node-fetch'); return typeof nf === 'function' ? nf : nf.default; } catch (e) { return null; }
}

const fetchImpl = getFetch();

function maskToken(t) { if (!t) return '(none)'; if (t.length <= 8) return t; return `${t.slice(0,4)}...${t.slice(-4)}`; }

async function callUrl(url, token, ttlSeconds) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: ttlSeconds })
  });
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return { ok: res.ok, status: res.status, statusText: res.statusText, text, json };
}

function normalizeResponse(data) {
  const result = (data && data.result) || data || {};
  const payload = result.credentials || result.iceServers || result;
  const urls = payload?.uris || payload?.urls || payload?.turn_urls || payload?.ice_servers || [];
  const username = payload?.username || payload?.user || payload?.auth?.username;
  const credential = payload?.password || payload?.credential || payload?.auth?.password;
  if (!Array.isArray(urls) || !urls.length || !username || !credential) return null;
  return urls.map(u => ({ urls: u, username, credential }));
}

module.exports = {
  async getTurnServers(ttlSeconds = 3600) {
    if (!fetchImpl) throw new Error('Fetch implementation unavailable. Install node-fetch or use Node 18+');
    const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID || process.env.TURN_KEY_ID || '';
    const turnKeyToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN || process.env.CLOUDFLARE_TURN_KEY_TOKEN || process.env.TURN_KEY_API_TOKEN || '';
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.PROVIDER_API_KEY || '';
    const hasTurnKey = Boolean(turnKeyId && turnKeyToken);
    const hasLegacy = Boolean(accountId && apiToken);
    console.log('[TURN] Configuration: hasTurnKey=', hasTurnKey, 'hasLegacy=', hasLegacy);
    console.log('[TURN] turnKeyId=', turnKeyId ? turnKeyId : '(none)', 'turnKeyToken=', maskToken(turnKeyToken));
    console.log('[TURN] accountId=', accountId ? accountId : '(none)', 'apiToken=', maskToken(apiToken));
    let lastError = null;
    if (hasTurnKey) {
      const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate`;
      console.log('[TURN] Trying TURN Key API:', url);
      try {
        const r = await callUrl(url, turnKeyToken, ttlSeconds);
        if (!r.ok) { lastError = new Error(`TURN Key API failed: ${r.status} ${r.statusText} - ${r.text}`); console.warn('[TURN] TURN Key API response:', r.status, r.statusText, r.text); }
        else { console.log('[TURN] TURN Key API returned JSON:', JSON.stringify(r.json)); const servers = normalizeResponse(r.json); if (servers) return servers; lastError = new Error('TURN Key API returned unexpected payload shape'); }
      } catch (err) { lastError = err; console.error('[TURN] Error calling TURN Key API:', err && err.message ? err.message : err); }
    }
    if (hasLegacy) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/turn-credentials`;
      console.log('[TURN] Trying account-level Realtime API:', url);
      try {
        const r = await callUrl(url, apiToken, ttlSeconds);
        if (!r.ok) { lastError = new Error(`Account-level Realtime API failed: ${r.status} ${r.statusText} - ${r.text}`); console.warn('[TURN] Account Realtime response:', r.status, r.statusText, r.text); }
        else { console.log('[TURN] Account Realtime API returned JSON:', JSON.stringify(r.json)); const servers = normalizeResponse(r.json); if (servers) return servers; lastError = new Error('Account-level Realtime API returned unexpected payload shape'); }
      } catch (err) { lastError = err; console.error('[TURN] Error calling account-level Realtime API:', err && err.message ? err.message : err); }
    }
    if (lastError) throw lastError;
    return null;
  }
};

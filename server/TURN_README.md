TURN provider integration — quick guide

What these files are for
- `turn-provider.js` — Cloudflare Realtime implementation (already wired into `/api/webrtc-config`).
- `turn-provider.example.js` — reference template if you want to plug in a different provider.

Using Cloudflare TURN keys (rtc.live.cloudflare.com)
Cloudflare’s newer RTC product exposes TURN keys that you can use instead of the legacy `/realtime/turn-credentials` endpoint.

1. In the Cloudflare dashboard open **Realtime → TURN Server** and click **Create TURN Key**. Copy both the TURN Key ID and the API token when prompted.
2. Set the env vars:
   ```
   CLOUDFLARE_TURN_KEY_ID=your-turn-key-id
   CLOUDFLARE_TURN_KEY_API_TOKEN=cf_turn_key_api_token
   ```
3. Leave the legacy `CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN` empty (or keep them as fallback).
4. Redeploy and call `/api/webrtc-config` — the server now hits `https://rtc.live.cloudflare.com/v1/turn/keys/<id>/credentials/generate` and returns the Anycast TURN URIs with short-lived credentials.

Cloudflare setup (5 minutes)
1. Create a Cloudflare API token with the "Cloudflare Realtime / TURN" permission (Account → Workers & Pages → Realtime → API Tokens). Copy the token and account ID.
2. Add the env vars:
   - Local dev: create `.env` (see repo `.env.example`) with:
     ```
     CLOUDFLARE_ACCOUNT_ID=xxxx
     CLOUDFLARE_API_TOKEN=cf_realtime_token
     ```
   - Render (prod): Dashboard → your service → Environment → add the same variables and redeploy.
3. Install dependencies (already committed):
   ```powershell
   npm install --workspace server
   ```
4. Run the server (`npm run dev --workspace server`) and hit:
   ```
   curl http://localhost:3001/api/webrtc-config
   ```
   You should see Cloudflare TURN entries with short-lived usernames/passwords.

How it works now
- `server/index.js` loads `turn-provider.js` automatically. If Cloudflare vars are present, the server fetches fresh TURN creds for every `/api/webrtc-config` request.
- If Cloudflare is not configured, it falls back to static `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` values, then to the public OpenRelay service.

Using Cloudflare TURN Server with static credentials
If your Cloudflare account doesn’t expose the RealtimeKit API (or you prefer static credentials), you can still use Cloudflare’s Anycast TURN servers.

1. In the Cloudflare dashboard open **Realtime → TURN Server** (or request access from support if the menu is hidden).
2. Create TURN credentials (username/password). Cloudflare’s docs sometimes call this “Create User” in the TURN section.
3. Configure the following endpoints in `TURN_URLS` (comma separated):
   - `turn:turn.cloudflare.com:3478` (primary UDP/TCP)
   - `turn:turn.cloudflare.com:53`
   - `turn:turn.cloudflare.com:80`
   - `turns:turn.cloudflare.com:5349` (primary TLS)
   - `turns:turn.cloudflare.com:443`
4. Set `TURN_USERNAME` / `TURN_CREDENTIAL` to the values you generated.
5. Remove `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` (or leave them empty) so the server prefers your static config.
6. Redeploy and hit `/api/webrtc-config` — the response should list the Cloudflare Anycast TURN entries with your username/credential.

These static TURN entries work with any WebRTC stack and keep traffic within Cloudflare’s Anycast network.

Custom providers
1. Copy `turn-provider.example.js` to `turn-provider.js` and edit `getTurnServers()` to call your provider.
2. Ensure whatever env vars you need are defined.
3. Restart the server — `/api/webrtc-config` will automatically use your new implementation.

Security notes
- Secrets live only in environment variables. `.env` is gitignored.
- Rotate API tokens periodically and scope them narrowly.
- Never return the API token to clients; only the short-lived TURN credentials.

TURN provider integration — quick guide

What these files are for
- `turn-provider.js` — Cloudflare Realtime implementation (already wired into `/api/webrtc-config`).
- `turn-provider.example.js` — reference template if you want to plug in a different provider.

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

Custom providers
1. Copy `turn-provider.example.js` to `turn-provider.js` and edit `getTurnServers()` to call your provider.
2. Ensure whatever env vars you need are defined.
3. Restart the server — `/api/webrtc-config` will automatically use your new implementation.

Security notes
- Secrets live only in environment variables. `.env` is gitignored.
- Rotate API tokens periodically and scope them narrowly.
- Never return the API token to clients; only the short-lived TURN credentials.

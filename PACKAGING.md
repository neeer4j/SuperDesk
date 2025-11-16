# Packaging SuperDesk Agent (Windows)

This document describes a repeatable process to build the Windows Electron agent and avoid native rebuild/ABI issues for modules like `robotjs`.

Goals
- Reproducible builds on CI (Windows runners).
- Simple local commands to rebuild native modules.
- Clear troubleshooting steps for file-locks and ABI mismatches.

Prerequisites (local)
- Node.js 18.x or 20.x (use nvm or installer).
- Visual C++ Build Tools / Visual Studio Build Tools installed (for native builds).
- Powershell (Windows) — commands in this doc use PowerShell syntax.

Key points
- The project pins Electron in `agent/package.json` (27.3.5) so native modules can be rebuilt for a known ABI.
- CI runs on a clean Windows runner so file-lock and local environment issues don't interfere.

Local useful commands
- Install all workspace deps (root):
  ```powershell
  npm ci
  ```

- Rebuild `robotjs` for the pinned Electron (recommended before packaging):
  ```powershell
  cd agent
  npx electron-rebuild -v 27.3.5 -f -w robotjs
  ```

- Build the agent (local):
  ```powershell
  cd agent
  npm run build
  ```

- CI-style build (no installer publish, creates artifacts):
  ```powershell
  cd agent
  npm run build:ci
  ```

Troubleshooting
- If electron-builder fails with a node-ABI/prebuild-install error:
  - Ensure `node-abi` and `prebuild-install` are up-to-date in the repo devDependencies (the repo already includes them).
  - Confirm the Electron version in `agent/package.json` is the target version for your build (the repo pins to 27.3.5).
  - Run the `electron-rebuild` step above to compile robotjs locally.

- If packaging fails with "file is being used by another process":
  - Close running instances of the agent (and editors that might be serving files). Reboot if needed.
  - Ensure antivirus isn't scanning the output folder.
  - Prefer using the GitHub Actions workflow which runs on a fresh runner and avoids local locks.

CI Notes
- The included workflow `.github/workflows/windows-build.yml` builds on `windows-latest`, runs the native rebuild, then runs `electron-builder` and uploads the artifacts to the Actions run.

When to update
- When bumping Electron, update the `-v` flag used for rebuild steps and confirm robotjs prebuilds exist for that ABI, or ensure the CI runner has the toolchain to build from source.

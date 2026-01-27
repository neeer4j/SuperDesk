# SuperDesk Agent v1.0.0 Release Notes

**"The Foundation Release"** 🚀

We are thrilled to announce the first official release of the SuperDesk Agent! This build focuses on **ultra-low latency performance**, security, and a seamless remote collaboration experience.

## key Features

### ⚡ Optimized Latency Control
- **Direct Mouse Response**: Integrated direct Windows API calls (via `koffi`) to minimize standard input lag. Mouse movement is now synchronous and highly responsive.
- **High-Performance Rendering**: Optimized Electron flags for H.264/HEVC hardware acceleration and disabled vsync for improved responsiveness.

### 🔒 Security & Privacy
- **Secure Release Build**: Developer Tools are completely disabled in this production build to prevent tampering.
- **Privacy-First Camera**: Guest camera overlays now use **Content Protection** to ensuring infinite video loops don't occur during screen sharing.

### 🛠 Collaboration Tools
- **Rich Toolbar**: Collapsible toolbar with mic/video toggles and session info.
- **File Transfer**: Drag-and-drop file sharing with native notification alerts.
- **Picture-in-Picture**: Host can pop out the guest's camera into a floating window while working.

### 🎨 Visuals
- **Dark Mode UI**: Sleek, professional dark theme (`#0d0d14`) consistent with the new web platform.
- **Branded Installer**: Professional setup wizard with SuperDesk branding.

---

## Technical Details
- **Version**: 1.0.0
- **Build**: Windows (NSIS Installer)
- **Engine**: Electron 28.0 (Chromium 120)
- **Architecture**: x64

## Download
**[SuperDesk Agent Setup 1.0.0.exe]** (Available in Downloads)

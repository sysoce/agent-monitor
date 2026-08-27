# Agent Mobile Monitor

A zero-friction, mobile-optimized web app that lets you monitor, steer, and prompt your Agent sessions directly from your phone's browser or as an installed Home Screen app (PWA).

---

## ⚡ Quick Start (One Command)

From your terminal in your workspace, run:

```bash
npm run monitor:setup
```

This wizard will:
1. Detect or prompt for your GitHub credentials (`gh auth token`, `GITHUB_TOKEN`, or `AGENT_SYNC_TOKEN`).
2. Automatically create or link a private GitHub Gist vault for turn synchronization.
3. Generate a secure access PIN.
4. Render a QR code right in your terminal.

**Scan the QR code with your phone camera** (iOS Camera / Android QR scanner) — you'll be taken straight into the app with all credentials automatically configured!

---

## 📱 Installing as a Phone App (PWA)

The monitor is fully Progressive Web App (PWA) enabled:

1. **iOS (Safari)**:
   - Open the setup link or scan the QR code in Safari.
   - Tap the **Share** button (box with upward arrow).
   - Select **"Add to Home Screen"**.
2. **Android (Chrome)**:
   - Open the setup link in Chrome.
   - Tap the three-dot menu (**⋮**).
   - Select **"Install app"** or **"Add to Home screen"**.

Once installed, the app launches in full-screen standalone mode with no browser address bars or navigation chrome.

---

## 🔌 Connection Modes

The monitor supports two modes:

### 1. Zero-Server / Git Backup Mode (Direct GitHub Gist Sync)
- **How it works**: Your phone browser connects directly to GitHub's REST API (`api.github.com/gists/<gistId>`).
- **No port forwarding or public tunnels required**: Works on 5G/cellular data, Wi-Fi networks across different subnets, or coffee shop Wi-Fi without needing a direct network route to your desktop.
- **End-to-end security**: Payload turns and inbox messages are encrypted client-side with AES-256-GCM using your vault password.
- **Background Desktop Worker**: `LocalSyncWorker` runs alongside Agent on your computer, pulling incoming phone prompts and pushing updated agent turns back to the Gist.

### 2. Live SSE Mode (Real-Time LAN / Tunnel)
- **How it works**: Connects directly to the local Node.js monitor server over your local network, Tailscale, or an automatic public tunnel.
- **Instant updates**: Streams live thought tokens, tool execution cards, diff reviews, and interactive approval requests in real time.

---

## 🛠️ CLI Commands & Server Options

### Start the Local Monitor Server
```bash
npm run monitor
```
Starts the monitor server at `http://localhost:4200` and displays LAN and Tailscale access URLs.

### Start with Automatic Public Tunnel
```bash
npm run monitor:tunnel
```
Starts the server and establishes an encrypted public tunnel URL for remote access when outside your local Wi-Fi.

### Web Setup & QR Page
When the server is running, visit:
```
http://localhost:4200/setup
```
This displays a browser QR code, a "Copy Mobile Link" button, and step-by-step mobile installation instructions.

### Export Standalone Single-File Bundle
```bash
npm run monitor:export
```
Exports a self-contained, single-file HTML application to `dist/monitor/standalone.html`. All CSS, JavaScript, icons, and PWA manifest are inlined as base64 data URIs.

> 💡 **Direct Download from GitHub Releases**: The standalone HTML app is published directly with every release. You can download [`agent-monitor.html`](https://github.com/sysoce/agent/releases) from GitHub Releases and open it in any browser (mobile or desktop) with zero installation or build steps. You can also host it on GitHub Pages, Cloudflare Pages, S3, or open it locally.

---

## ⚙️ CLI Flags

```text
Options:
  -s, --setup        Run the interactive setup wizard and display the mobile QR code
  -e, --export       Export a single-file standalone.html bundle to dist/monitor/
  -p, --port <port>  Port to listen on (default: 4200, or PORT env var)
  -h, --host <host>  Host interface to bind (default: 0.0.0.0, or HOST env var)
  -d, --dir <dir>    Workspace directory root (default: current working directory)
  -t, --tunnel       Enable automatic encrypted public tunnel
  -P, --password     Set explicit vault password / PIN (or MONITOR_PASSWORD env var)
      --no-auth      Disable password authentication
```

# agent-monitor

> Mobile-first PWA and real-time live monitoring dashboard for autonomous AI coding agents.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GitHub Pages](https://img.shields.io/badge/Live%20App-GitHub%20Pages-success.svg)](https://sysoce.github.io/agent-monitor/)

`agent-monitor` provides real-time observability, steering controls, and mobile phone pairing for coding agent sessions. Run it as a lightweight local server on your dev machine, access it remotely via secure tunnel, or use the zero-server static web app on **GitHub Pages** backed by end-to-end encrypted GitHub Gist sync.

---

## 🌐 Live Web App

Open the hosted PWA directly in any browser or on your phone:
👉 **[https://sysoce.github.io/agent-monitor/](https://sysoce.github.io/agent-monitor/)**

---

## 📱 Seamless Mobile Pairing (QR Code)

Pair your mobile phone in seconds:
1. Start `agent-monitor` on your computer or open the desktop browser.
2. Click the **`📱 Connect Phone`** button in the header (or scan the QR code printed in the terminal).
3. Scan the QR code with your phone camera:
   - Opens `https://sysoce.github.io/agent-monitor/#setup=<payload>` pre-configured.
   - Automatically establishes peer-to-peer sync via `git-sync` over any network (cellular 5G/LTE, Wi-Fi).
4. Tap **Share → Add to Home Screen** (iOS Safari) or **⋮ → Install app** (Android Chrome) for a fullscreen native app experience.

---

## ⚡ Key Features

- **Dual-Mode Sync Architecture**:
  - **Local Server / SSE Mode**: Connects directly to the active agent session directory over Server-Sent Events (SSE) with sub-second latency.
  - **Zero-Server / Git Backup Mode**: Fully decentralized browser-only mode where sessions, logs, plans, and messages sync through end-to-end encrypted GitHub Gists (AES-GCM).
- **Mobile-First Progressive Web App (PWA)**:
  - Add to Home Screen on iOS / Android with standalone display, app icon, and custom theme colors.
  - Interactive viewport management with virtual keyboard avoidance and notch awareness.
- **Rich Agent Observability**:
  - Live streaming response renderer with collapsible thinking/reasoning blocks.
  - Tool execution timeline with rich syntax-highlighted diff cards.
  - Active plan tracking, todo status checklists, and walkthrough documentation viewers.
- **Bi-Directional Steering**:
  - Send steering prompts, queue follow-up user tasks, or abort long-running agent loops.
  - Live model switcher across frontier models (Gemini 3.7 Flash, Claude 3.7 Sonnet, GPT-4o) and local models (Ollama, LM Studio).
  - `@mention` auto-completion for files, folders, symbols, and diagnostics.
- **Single-File Standalone Export**:
  - Generates a self-contained zero-dependency `standalone.html` containing inlined CSS, bundled JS, and base64 assets for instant offline sharing.
- **Terminal QR Code Generator**:
  - Displays formatted QR codes in the terminal during startup for instant camera scan & phone pairing.

---

## 🚀 Installation & Quick Start

### Global / npx Usage

```bash
# Start local monitoring server (default: http://localhost:4200)
npx agent-monitor start

# Start with custom port and workspace root
npx agent-monitor start --port 4300 --workspace /path/to/project

# Run interactive setup wizard (configure Gist sync and password auth)
npx agent-monitor setup

# Export self-contained single-file HTML bundle
npx agent-monitor export --out ./agent-monitor.html

# Start server with public tunnel
npx agent-monitor tunnel
```

### Local Development

```bash
# Clone the repository
git clone git@github.com:sysoce/agent-monitor.git
cd agent-monitor

# Install dependencies
npm install

# Build distribution bundles (CLI, server, browser bundle, CSS, standalone HTML)
npm run build

# Run unit tests (280+ tests covering server, crypto, UI components, and state machines)
npm test

# Typecheck and lint
npm run lint
```

---

## 🛠️ CLI Options

| Command | Option | Description |
| :--- | :--- | :--- |
| `start` | `-p, --port <number>` | Port to listen on (default: `4200` or `PORT` env) |
| `start` | `-h, --host <string>` | Host interface (default: `0.0.0.0`) |
| `start` | `-d, --dir <path>` | Workspace directory containing `.agent` runtime files |
| `start` | `-P, --password <pin>` | Require PIN / password authentication for web access |
| `setup` | *(interactive)* | Interactive configuration for GitHub Gist sync token |
| `export` | `-o, --out <path>` | Target destination path for `standalone.html` |
| `tunnel` | `-t, --tunnel` | Expose server via public tunnel |

---

## 🔒 Security & Architecture

- **Zero External Runtime Dependencies**: Standalone crypto using Web Crypto API and Node.js `node:crypto`. Pure TypeScript QR code generator with no native C++ bindings.
- **End-to-End Encryption**: Gist sync payloads use AES-256-GCM encryption with client-side key derivation, ensuring zero plain-text leaks to GitHub servers.
- **Air-Gapped & Offline Ready**: All UI assets, syntax highlighting tokenizers, and diagram renderers execute entirely in the client runtime without third-party CDN dependencies.

---

## 📄 License

[Apache-2.0](LICENSE)

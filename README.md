# agent-monitor

> Mobile-first PWA and real-time live monitoring dashboard for autonomous AI coding agents.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

`agent-monitor` provides real-time observability, control, and mobile management for coding agent sessions. Run it as a lightweight local server on your dev machine, access it remotely via secure tunnel, or deploy it as a zero-server standalone HTML file backed by encrypted GitHub Gist sync.

---

## Key Features

- **Dual Mode Architecture**:
  - **Local Server / SSE Mode**: Connects directly to the active agent session directory over Server-Sent Events (SSE) with sub-second latency and bidirectional message dispatching.
  - **Zero-Server / Git Backup Gist Sync Mode**: Fully decentralized browser-only mode where sessions, logs, plans, and messages sync through end-to-end encrypted GitHub Gists (AES-GCM).
- **Mobile-First Progressive Web App (PWA)**:
  - Add to Home Screen on iOS / Android with standalone display, app icon, and custom theme colors.
  - Interactive viewport and virtual keyboard avoidance with safe-area notch awareness.
- **Rich Agent Observability**:
  - Live streaming response renderer with collapsible thinking/reasoning blocks.
  - Tool execution timeline with rich syntax-highlighted diff cards.
  - Active plan tracking, todo status checklists, and walkthrough documentation viewers.
- **Bi-Directional Steering**:
  - Send steering prompts, queue follow-up user tasks, or abort long-running agent loops.
  - Live model switcher across frontier models (Gemini 3.7 Flash, Claude 3.7 Sonnet, GPT-4o) and local models (Ollama, LM Studio).
  - `@mention` auto-completion for files, folders, symbols, and diagnostics.
- **Single-File Standalone Export**:
  - Generates a self-contained zero-dependency `standalone.html` containing inlined CSS, bundled JS, and base64 assets for instant zero-config sharing.
- **Built-in Terminal QR Code Generator**:
  - Displays formatted QR codes in the terminal during startup for instant camera scan & phone pairing.

---

## Installation & Quick Start

### Global / npx Usage

```bash
# Start local monitoring server on default port (http://localhost:3000)
npx agent-monitor start

# Start with custom port and workspace root
npx agent-monitor start --port 4000 --workspace /path/to/project

# Run interactive setup wizard (configure Gist sync and PIN auth)
npx agent-monitor setup

# Export self-contained single-file HTML bundle
npx agent-monitor export --out ./monitor.html

# Start server with public ngrok / cloudflare tunnel
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

# Run unit tests (250+ tests covering server, crypto, UI components, and state machines)
npm test

# Typecheck and lint
npm run lint
```

---

## CLI Options

| Command | Option | Description |
| :--- | :--- | :--- |
| `start` | `--port <number>` | Port to listen on (default: `3000` or `PORT` env) |
| `start` | `--host <string>` | Host interface (default: `0.0.0.0`) |
| `start` | `--workspace <path>` | Workspace directory containing `.agent` runtime files |
| `start` | `--pin <string>` | Require PIN authentication for web access |
| `setup` | `--gist` | Interactive configuration for GitHub Gist sync token |
| `export` | `--out <path>` | Target destination path for `standalone.html` |
| `tunnel` | `--provider <name>` | Tunnel provider (`localtunnel`, `cloudflared`, `ngrok`) |

---

## Security & Architecture

- **Zero External Runtime Dependencies**: Standalone crypto using Web Crypto API and Node.js `node:crypto`. Pure TypeScript QR code generator with no native C++ bindings.
- **End-to-End Encryption**: Gist sync payloads use AES-256-GCM encryption with client-side key derivation, ensuring zero plain-text leaks to GitHub servers.
- **Air-Gapped & Offline Ready**: All UI assets, syntax highlighting tokenizers, and diagram renderers execute entirely in the client runtime without third-party CDN dependencies.

---

## License

[Apache-2.0](LICENSE)

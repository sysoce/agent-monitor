import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { handleRequest } from './router';
import { SseEmitter } from './sseEmitter';
import { getLocalNetworkAddresses } from './networkAddress';
import { startTunnel, type TunnelInstance } from './tunnel';
import { generateSecurePin } from './auth';
import type { MonitorServerConfig } from './types';
import { loadSyncConfig, encodeSetupPayload } from '../sync/syncConfigLoader';
import { LocalSyncWorker } from '../sync/localSyncWorker';
import { GistClient } from '../sync/gistClient';
import { generateQrMatrix } from '../qr/qrEncoder';
import { renderQrToTerminal } from '../qr/qrRenderer';

export function resolveStaticDir(): string {
  const candidates = [
    path.join(__dirname),
    path.join(__dirname, '..', 'monitor'),
    path.join(__dirname, '..', 'dist', 'monitor'),
    path.join(process.cwd(), 'dist', 'monitor'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  return candidates[0]!;
}

export function startMonitorServer(customConfig?: Partial<MonitorServerConfig>): {
  server: http.Server;
  close: () => Promise<void>;
  port: number;
  password?: string;
} {
  const port = customConfig?.port ?? (Number(process.env.PORT) || 4200);
  const host = process.env.HOST || customConfig?.host || '0.0.0.0';
  const workspaceRoot = customConfig?.workspaceRoot || process.cwd();
  const enableTunnel = customConfig?.tunnel || process.env.TUNNEL === '1';
  const staticDir = resolveStaticDir();

  let password = customConfig?.password || process.env.MONITOR_PASSWORD;
  if (customConfig?.requireAuth === false || process.env.NO_AUTH === '1') {
    password = undefined;
  } else if (!password && (enableTunnel || customConfig?.requireAuth)) {
    password = generateSecurePin();
  }

  const sse = new SseEmitter(workspaceRoot);
  let tunnelInstance: TunnelInstance | null = null;
  const syncConfig = loadSyncConfig(workspaceRoot, password);
  let syncWorker: LocalSyncWorker | null = null;

  if (syncConfig?.gistId) {
    syncWorker = new LocalSyncWorker(workspaceRoot, new GistClient(syncConfig));
    syncWorker.start();
    sse.onChange(() => {
      syncWorker?.scheduleOutboxSync();
    });
  }

  const server = http.createServer((req, res) => {
    handleRequest(req, res, workspaceRoot, staticDir, sse, password, syncConfig).catch((err) => {
      console.error('[Monitor Server Error]', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  });

  server.listen(port, host, async () => {
    const networks = getLocalNetworkAddresses(port);
    console.log('\n======================================================');
    console.log(' 🚀  Agent Mobile Monitor is Running!');
    console.log('======================================================');
    console.log(` ▸ Local:        http://localhost:${port}`);
    for (const net of networks) {
      if (net.isTailscale) console.log(` ▸ Tailscale:    ${net.url}`);
      else console.log(` ▸ LAN (${net.name}):   ${net.url}`);
    }
    if (syncConfig) {
      console.log(` ▸ Git Backup:   Active (Gist: ${syncConfig.gistId.slice(0, 8)}...)`);
    }
    if (enableTunnel) {
      tunnelInstance = await startTunnel(port);
      if (tunnelInstance) console.log(` ▸ Public URL:   ${tunnelInstance.url}`);
    }
    const payload = encodeSetupPayload({
      token: syncConfig?.token || '',
      gistId: syncConfig?.gistId || '',
      password: password || syncConfig?.password || '',
    });
    const ghUrl = `https://sysoce.github.io/agent-monitor/#setup=${payload}`;
    console.log(` ▸ GitHub Pages: ${ghUrl}`);
    console.log(` ▸ Mobile Setup: http://localhost:${port}/setup`);
    if (password) console.log(` 🔐 Access Password:  ${password}`);
    console.log('------------------------------------------------------');
    console.log(' 📱 Mobile Pairing QR Code (Scan with phone camera):');
    try {
      const qrMatrix = generateQrMatrix(ghUrl);
      console.log(renderQrToTerminal(qrMatrix));
    } catch {}
    console.log('======================================================\n');
  });

  return {
    server,
    port,
    password,
    close: async () => {
      if (syncWorker) syncWorker.stop();
      if (tunnelInstance) tunnelInstance.close();
      sse.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

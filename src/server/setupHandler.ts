import type { ServerResponse } from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GistSyncConfig } from '../sync/types';
import { encodeSetupPayload } from '../sync/syncConfigLoader';
import { generateQrMatrix } from '../qr/qrEncoder';
import { renderQrToSvg } from '../qr/qrRenderer';

import { getLocalNetworkAddresses } from './networkAddress';

export async function handleSetupRoute(
  res: ServerResponse,
  pathname: string,
  url: URL,
  workspaceRoot: string,
  staticDir: string,
  password?: string,
  syncConfig?: GistSyncConfig
): Promise<boolean> {
  if (pathname === '/download') {
    try {
      const file = path.join(staticDir, 'standalone.html');
      const data = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="agent-monitor.html"',
        'Content-Length': data.length,
        'Cache-Control': 'no-cache',
      });
      res.end(data);
      return true;
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Standalone bundle not found. Run npm run monitor:export first.');
      return true;
    }
  }

  if (pathname === '/api/setup-info') {
    const port = url.port ? Number(url.port) : 4200;
    const networks = getLocalNetworkAddresses(port);
    const bestAddress = networks.find((n) => n.isTailscale) || networks.find((n) => !n.name.includes('localhost')) || { url: url.origin };

    const payload = encodeSetupPayload({
      token: syncConfig?.token || '',
      gistId: syncConfig?.gistId || '',
      password: password || syncConfig?.password || '',
    });

    const githubPagesUrl = `https://sysoce.github.io/agent-monitor/#setup=${payload}`;
    const lanUrl = `${bestAddress.url}/#setup=${payload}`;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      githubPagesUrl,
      lanUrl,
      setupPayload: payload,
      hasSyncConfig: Boolean(syncConfig?.gistId),
      gistId: syncConfig?.gistId || '',
      version: '1.0.0',
    }));
    return true;
  }

  if (pathname === '/api/version') {
    let version = '2.3.198';
    try {
      const pkgPath = path.join(workspaceRoot, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as { version?: string };
      if (pkg.version) version = pkg.version;
    } catch {}
    const body = JSON.stringify({ version, downloadUrl: '/download' });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
    return true;
  }

  if (pathname !== '/setup' && pathname !== '/qr') return false;

  const payload = encodeSetupPayload({
    token: syncConfig?.token || '',
    gistId: syncConfig?.gistId || '',
    password: password || syncConfig?.password || '',
  });

  const setupUrl = `${url.origin}/#setup=${payload}`;
  const matrix = generateQrMatrix(setupUrl);
  const qrSvg = renderQrToSvg(matrix, 2, 7);

  if (pathname === '/qr') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' });
    res.end(qrSvg);
    return true;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Monitor Mobile Setup</title>
  <style>
    body { margin: 0; background: #121212; color: #cccccc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
    .card { background: #1e1e1e; border: 1px solid #333333; border-radius: 12px; max-width: 420px; width: 100%; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; margin: 0 0 8px 0; color: #ffffff; }
    p { font-size: 13px; line-height: 1.5; color: #999999; margin: 0 0 16px 0; }
    .qr-container { background: #ffffff; padding: 16px; border-radius: 8px; display: inline-block; margin: 12px 0; }
    .qr-container svg { width: 220px; height: 220px; display: block; }
    .btn { display: block; width: 100%; box-sizing: border-box; background: #0e639c; color: #ffffff; border: none; padding: 10px 14px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; text-decoration: none; margin-top: 10px; text-align: center; }
    .btn:hover { background: #1177bb; }
    .btn-green { background: #238636; }
    .btn-green:hover { background: #2ea043; }
    .steps { text-align: left; background: #252526; border-radius: 6px; padding: 12px 16px; font-size: 12px; line-height: 1.6; margin-top: 16px; border-left: 3px solid #0e639c; }
    .steps ol { margin: 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 32px; margin-bottom: 8px;">📱</div>
    <h1>Agent Monitor Mobile Setup</h1>
    <p>Scan this QR code with your phone camera to open and automatically connect the mobile monitor.</p>
    <div class="qr-container">${qrSvg}</div>
    <button class="btn" onclick="navigator.clipboard.writeText('${setupUrl}').then(() => alert('Mobile setup link copied to clipboard!'))">📋 Copy Mobile Link</button>
    <a class="btn btn-green" href="/download" download="agent-monitor.html">📥 Download Offline App (HTML)</a>
    <a class="btn" style="background: #333333;" href="${setupUrl}">🚀 Open Web App</a>
    <div class="steps">
      <strong>To install as a phone app:</strong>
      <ol>
        <li>Scan the QR code with iOS Safari or Android Chrome.</li>
        <li>Tap <strong>Share</strong> &rarr; <strong>"Add to Home Screen"</strong> (iOS) or Chrome <strong>&vellip;</strong> &rarr; <strong>"Install app"</strong>.</li>
        <li>Launch anytime from your phone's home screen!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
  return true;
}

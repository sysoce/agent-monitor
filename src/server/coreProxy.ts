import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface CoreServerMeta {
  host: string;
  port: number;
  url: string;
  wsUrl: string;
  pid: number;
}

export function readAgentCoreMeta(workspaceRoot: string): CoreServerMeta | null {
  const metaPath = path.join(workspaceRoot, '.agent', 'server.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const data = JSON.parse(raw);
    if (data.port) {
      const host = data.host || '127.0.0.1';
      return {
        host,
        port: data.port,
        url: data.url || `http://${host}:${data.port}`,
        wsUrl: data.ws_url || data.wsUrl || `ws://${host}:${data.port}`,
        pid: data.pid || 0,
      };
    }
  } catch {
    // Ignore malformed json
  }
  return null;
}

export async function proxyToAgentCore(
  req: IncomingMessage,
  res: ServerResponse,
  meta: CoreServerMeta
): Promise<boolean> {
  return new Promise((resolve) => {
    const options: http.RequestOptions = {
      hostname: meta.host,
      port: meta.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${meta.host}:${meta.port}`,
      },
      timeout: 4000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
      resolve(true);
    });

    proxyReq.on('error', () => {
      resolve(false);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      resolve(false);
    });

    req.pipe(proxyReq, { end: true });
  });
}

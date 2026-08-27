import type { IncomingMessage, ServerResponse } from 'node:http';
import * as zlib from 'node:zlib';
import type { GistSyncConfig } from '../sync/types';
import { isRequestAuthorized, timingSafeCompare } from './auth';


export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
  reqOrHeaders?: IncomingMessage | Record<string, string>,
  extraHeaders?: Record<string, string>
): void {
  const req = (reqOrHeaders && typeof reqOrHeaders === 'object' && 'headers' in reqOrHeaders) ? (reqOrHeaders as IncomingMessage) : undefined;
  const customHeaders = req ? extraHeaders : (reqOrHeaders as Record<string, string> | undefined);

  const raw = JSON.stringify(data);
  const acceptEncoding = String(req?.headers['accept-encoding'] || '');
  res.socket?.setNoDelay(true);

  if (acceptEncoding.includes('gzip') && raw.length > 512) {
    const gzipped = zlib.gzipSync(Buffer.from(raw), { level: 6 });
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Content-Length': gzipped.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...customHeaders,
    });
    res.end(gzipped);
    return;
  }

  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(raw),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...customHeaders,
  });
  res.end(raw);
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
  password?: string,
  syncConfig?: GistSyncConfig
): Promise<boolean> {
  if (pathname === '/api/auth/verify' && req.method === 'GET') {
    const auth = isRequestAuthorized(req, password, url);
    sendJson(res, 200, {
      required: !!password,
      authorized: auth,
      gistConfig: auth && syncConfig ? { token: syncConfig.token, gistId: syncConfig.gistId } : undefined,
    });
    return true;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readJsonBody<{ password?: string }>(req);
    if (!password || timingSafeCompare(body.password || '', password)) {
      sendJson(
        res,
        200,
        {
          ok: true,
          token: password || 'ok',
          gistConfig: syncConfig ? { token: syncConfig.token, gistId: syncConfig.gistId } : undefined,
        },
        password
          ? { 'Set-Cookie': `agent_auth=${encodeURIComponent(password)}; Path=/; SameSite=Lax; Max-Age=2592000` }
          : {}
      );
    } else {
      sendJson(res, 401, { error: 'Invalid password' });
    }
    return true;
  }

  return false;
}

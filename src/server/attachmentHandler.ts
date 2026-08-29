import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

export async function handleAttachmentRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  workspaceRoot: string
): Promise<boolean> {
  if (url.pathname !== '/api/attachments' || req.method !== 'GET') {
    return false;
  }

  const rawPath = url.searchParams.get('path');
  if (!rawPath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing path parameter' }));
    return true;
  }

  const clean = decodeURIComponent(rawPath).replace(/^file:\/\//i, '').trim();
  const rootResolved = path.resolve(workspaceRoot);
  const targetResolved = path.isAbsolute(clean) ? path.resolve(clean) : path.resolve(rootResolved, clean);

  const isInsideRoot = targetResolved === rootResolved || targetResolved.startsWith(rootResolved + path.sep);
  if (!isInsideRoot) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Access denied' }));
    return true;
  }

  try {
    const stat = await fs.stat(targetResolved);
    if (!stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Attachment not found' }));
      return true;
    }

    const ext = path.extname(targetResolved).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'public, max-age=86400' });
      res.end();
      return true;
    }

    const data = await fs.readFile(targetResolved);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
      ETag: etag,
      'Cache-Control': 'public, max-age=86400',
    });
    res.end(data);
    return true;
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Attachment not found' }));
    return true;
  }
}

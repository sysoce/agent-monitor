import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

export async function serveStaticFile(
  req: IncomingMessage,
  res: ServerResponse,
  staticDir: string,
  filePath: string,
  mime: string
): Promise<void> {
  const full = path.join(staticDir, filePath);
  try {
    const stat = await fs.stat(full);
    const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    res.socket?.setNoDelay(true);

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }

    const data = await fs.readFile(full);
    const acceptEncoding = String(req.headers['accept-encoding'] || '');

    if (acceptEncoding.includes('gzip') && data.length > 512) {
      const gzipped = zlib.gzipSync(data, { level: 6 });
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Encoding': 'gzip',
        'Content-Length': gzipped.length,
        ETag: etag,
        'Cache-Control': 'no-cache',
      });
      res.end(gzipped);
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
      ETag: etag,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

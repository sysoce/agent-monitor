import type { ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class SseEmitter {
  private readonly clients = new Set<ServerResponse>();
  private heartbeatTimer?: NodeJS.Timeout;
  private watcher?: fs.FSWatcher;
  private debounceTimer?: NodeJS.Timeout;

  constructor(private readonly workspaceRoot: string) {
    this.startHeartbeat();
    this.startWatcher();
  }

  addClient(res: ServerResponse): void {
    res.socket?.setNoDelay(true);
    res.socket?.setKeepAlive?.(true);
    res.socket?.setTimeout?.(0);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
    res.write('retry: 3000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`);

    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(': ping\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, 15000);
  }

  private readonly changeListeners = new Set<() => void>();

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private startWatcher(): void {
    const target = path.join(this.workspaceRoot, '.agent');
    if (!fs.existsSync(target)) return;
    try {
      this.watcher = fs.watch(target, { recursive: true }, () => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.broadcast('change', { timestamp: Date.now() });
          for (const fn of this.changeListeners) {
            try { fn(); } catch {}
          }
        }, 150);
      });
    } catch {
      // Ignore watch setup error if unsupported
    }
  }

  close(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.watcher) this.watcher.close();
    for (const c of this.clients) {
      try {
        c.end();
      } catch {}
    }
    this.clients.clear();
  }
}

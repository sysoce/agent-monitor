import type { SyncStatus } from './types';
import { getStoredToken } from './authStore';

export interface SseClientOptions {
  onStatusChange: (status: SyncStatus) => void;
  onChange: () => void;
}

export function isStaticHostEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, protocol } = window.location;
  return protocol === 'file:' || hostname.endsWith('github.io') || hostname.endsWith('.pages.dev');
}

export function initSseClient(opts: SseClientOptions): () => void {
  let es: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  if (isStaticHostEnvironment()) {
    setTimeout(() => {
      if (!closed) opts.onStatusChange('disconnected');
    }, 0);
    return () => {
      closed = true;
    };
  }

  function connect() {
    if (closed) return;
    opts.onStatusChange('syncing');
    const token = getStoredToken();
    const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
    try {
      es = new EventSource(url);
    } catch {
      opts.onStatusChange('disconnected');
      return;
    }

    es.onopen = () => {
      if (closed) return;
      opts.onStatusChange('connected');
    };

    es.addEventListener('change', () => {
      if (closed) return;
      opts.onChange();
    });

    es.onerror = () => {
      if (closed) return;
      opts.onStatusChange('disconnected');
      es?.close();
      if (!closed) {
        retryTimeout = setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return () => {
    closed = true;
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    if (es) {
      es.close();
      es = null;
    }
  };
}

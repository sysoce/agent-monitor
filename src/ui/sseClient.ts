import type { SyncStatus } from './types';
import { getStoredToken } from './authStore';

export interface SseClientOptions {
  onStatusChange: (status: SyncStatus) => void;
  onChange: () => void;
}

export function initSseClient(opts: SseClientOptions): () => void {
  let es: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    opts.onStatusChange('syncing');
    const token = getStoredToken();
    const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
    es = new EventSource(url);

    es.onopen = () => {
      opts.onStatusChange('connected');
    };

    es.addEventListener('change', () => {
      opts.onChange();
    });

    es.onerror = () => {
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
    if (retryTimeout) clearTimeout(retryTimeout);
    es?.close();
  };
}

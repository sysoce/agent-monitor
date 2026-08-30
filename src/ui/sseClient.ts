import type { SyncStatus } from './types';
import { getStoredToken, buildApiUrl, getServerBaseUrl, isStaticDeployment, isMixedContentBlocked } from './authStore';

export interface SseClientOptions {
  onStatusChange: (status: SyncStatus) => void;
  onChange: () => void;
}

export function isStaticHostEnvironment(): boolean {
  return isStaticDeployment() && !getServerBaseUrl();
}

export function initSseClient(opts: SseClientOptions): () => void {
  let es: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let retryCount = 0;

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
    opts.onStatusChange(retryCount > 0 ? 'connecting' : 'syncing');
    const token = getStoredToken();
    const relative = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
    const url = buildApiUrl(relative);
    try {
      es = new EventSource(url);
    } catch {
      opts.onStatusChange('disconnected');
      return;
    }

    es.onopen = () => {
      if (closed) return;
      retryCount = 0;
      opts.onStatusChange('connected');
    };

    es.addEventListener('change', () => {
      if (closed) return;
      opts.onChange();
    });

    es.onerror = () => {
      if (closed) return;
      retryCount++;
      if (retryCount >= 3) {
        opts.onStatusChange('disconnected');
      } else {
        opts.onStatusChange('connecting');
      }
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

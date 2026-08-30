import type { TransportAdapter, TransportMessage, TransportStatus } from './types';

export interface SseTransportOptions {
  baseUrl: string;
  token?: string;
  createEventSource?: (url: string) => any;
}

export class SseTransportAdapter implements TransportAdapter {
  public readonly mode = 'live-sse';
  public readonly priority = 2;
  public readonly name = 'Live SSE';

  private status: TransportStatus = 'disconnected';
  private eventSource: any = null;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly createEventSource: (url: string) => any;
  private readonly messageListeners = new Set<(msg: TransportMessage) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();

  constructor(options: SseTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.createEventSource =
      options.createEventSource ||
      ((url: string) => (typeof EventSource !== 'undefined' ? new EventSource(url) : null));
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  async connect(): Promise<boolean> {
    this.disconnect();
    this.setStatus('connecting');

    try {
      const token = this.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('agent_monitor_token') : null);
      const url = token
        ? `${this.baseUrl}/api/events?token=${encodeURIComponent(token)}`
        : `${this.baseUrl}/api/events`;
      this.eventSource = this.createEventSource(url);
      if (!this.eventSource) {
        this.setStatus('failed');
        return false;
      }

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      const handlePayload = (payload: any) => {
        const msg: TransportMessage = {
          id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: payload?.type || 'event',
          payload,
          timestamp: Date.now(),
        };
        for (const listener of this.messageListeners) {
          listener(msg);
        }
      };

      this.eventSource.onmessage = (ev: { data: string }) => {
        try {
          handlePayload(JSON.parse(ev.data));
        } catch {}
      };

      if (typeof this.eventSource.addEventListener === 'function') {
        const notifyChange = (ev: { data?: string }) => {
          try {
            const data = ev?.data ? JSON.parse(ev.data) : { timestamp: Date.now() };
            handlePayload({ type: 'change', ...data });
          } catch {
            handlePayload({ type: 'change', timestamp: Date.now() });
          }
        };
        this.eventSource.addEventListener('change', notifyChange);
        this.eventSource.addEventListener('update', notifyChange);
        this.eventSource.addEventListener('session', notifyChange);
        this.eventSource.addEventListener('sync', notifyChange);
      }

      this.eventSource.onerror = () => {
        this.setStatus('reconnecting');
      };

      return true;
    } catch {
      this.setStatus('failed');
      return false;
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
    this.setStatus('disconnected');
  }

  async send(message: TransportMessage): Promise<boolean> {
    try {
      const sessionId = message.sessionId;
      const endpoint = sessionId
        ? `${this.baseUrl}/api/sessions/${sessionId}/messages`
        : `${this.baseUrl}/api/sessions`;

      const token = this.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('agent_monitor_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(message.payload || {}),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  onMessage(listener: (msg: TransportMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(s: TransportStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const listener of this.statusListeners) {
      listener(s);
    }
  }
}

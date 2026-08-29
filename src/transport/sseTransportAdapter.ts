import type { TransportAdapter, TransportMessage, TransportStatus } from './types';

export interface SseTransportOptions {
  baseUrl: string;
  createEventSource?: (url: string) => any;
}

export class SseTransportAdapter implements TransportAdapter {
  public readonly mode = 'live-sse';
  public readonly priority = 2;
  public readonly name = 'Live SSE';

  private status: TransportStatus = 'disconnected';
  private eventSource: any = null;
  private readonly baseUrl: string;
  private readonly createEventSource: (url: string) => any;
  private readonly messageListeners = new Set<(msg: TransportMessage) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();

  constructor(options: SseTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
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
      const url = `${this.baseUrl}/api/events`;
      this.eventSource = this.createEventSource(url);
      if (!this.eventSource) {
        this.setStatus('failed');
        return false;
      }

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (ev: { data: string }) => {
        try {
          const payload = JSON.parse(ev.data);
          const msg: TransportMessage = {
            id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: payload.type || 'event',
            payload,
            timestamp: Date.now(),
          };
          for (const listener of this.messageListeners) {
            listener(msg);
          }
        } catch {}
      };

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

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

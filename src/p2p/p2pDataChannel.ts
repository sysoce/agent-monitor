import type { P2PDataMessage } from './types';

export class P2PDataChannel {
  private readonly listeners = new Set<(msg: P2PDataMessage) => void>();
  private readonly openListeners = new Set<() => void>();
  private readonly closeListeners = new Set<() => void>();
  private readonly queue: string[] = [];

  constructor(private readonly rawChannel: {
    readyState: string;
    send: (data: string) => void;
    onmessage: ((ev: { data: string }) => void) | null;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onerror: ((err: any) => void) | null;
  }) {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.rawChannel) return;
    this.rawChannel.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as P2PDataMessage;
        for (const listener of this.listeners) listener(parsed);
      } catch {}
    };
    this.rawChannel.onopen = () => {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (item) this.rawChannel.send(item);
      }
      for (const listener of this.openListeners) listener();
    };
    this.rawChannel.onclose = () => {
      for (const listener of this.closeListeners) listener();
    };
  }

  send(msg: P2PDataMessage): boolean {
    const raw = JSON.stringify(msg);
    if (this.rawChannel.readyState === 'open') {
      this.rawChannel.send(raw);
      return true;
    }
    this.queue.push(raw);
    return false;
  }

  onMessage(listener: (msg: P2PDataMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onOpen(listener: () => void): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  isOpen(): boolean {
    return this.rawChannel?.readyState === 'open';
  }
}
